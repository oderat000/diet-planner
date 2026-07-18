"use client";

import * as React from "react";
import Typography from "@mui/material/Typography";
import { WeightEntry } from "@/lib/types";

const W = 640;
const H = 260;
const PAD = { top: 16, right: 56, bottom: 28, left: 44 };

interface Props {
  entries: WeightEntry[];
  goalKg: number;
}

function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || 1;
  const rawStep = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rawStep) ?? mag * 10;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(2)));
  return ticks;
}

export default function WeightChart({ entries, goalKg }: Props) {
  const [hover, setHover] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const data = React.useMemo(
    () => [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries],
  );

  if (data.length < 2) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
        Log your weight on at least two days to see the progress chart.
      </Typography>
    );
  }

  const xs = data.map((d) => new Date(d.date + "T00:00:00").getTime());
  const ys = data.map((d) => d.weightKg);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys, goalKg) - 1;
  const yMax = Math.max(...ys, goalKg) + 1;

  const xTo = (t: number) =>
    PAD.left + ((t - xMin) / (xMax - xMin || 1)) * (W - PAD.left - PAD.right);
  const yTo = (v: number) =>
    H - PAD.bottom - ((v - yMin) / (yMax - yMin || 1)) * (H - PAD.top - PAD.bottom);

  const path = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${xTo(xs[i]).toFixed(1)},${yTo(d.weightKg).toFixed(1)}`)
    .join(" ");

  const ticks = niceTicks(yMin, yMax);
  const last = data.length - 1;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let best = Infinity;
    xs.forEach((t, i) => {
      const d = Math.abs(xTo(t) - px);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHover(nearest);
  };

  const fmtDate = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

  const hoverEntry = hover !== null ? data[hover] : null;

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block", touchAction: "none" }}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="Weight over time"
      >
        {/* hairline gridlines with clean-number ticks */}
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yTo(v)}
              y2={yTo(v)}
              stroke="var(--viz-grid)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={yTo(v) + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--viz-ink-muted)"
            >
              {v}
            </text>
          </g>
        ))}

        {/* goal reference line */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={yTo(goalKg)}
          y2={yTo(goalKg)}
          stroke="var(--viz-baseline)"
          strokeWidth={1}
        />
        <text
          x={W - PAD.right + 6}
          y={yTo(goalKg) + 4}
          fontSize={11}
          fill="var(--viz-ink-muted)"
        >
          Goal {goalKg}
        </text>

        {/* x-axis date labels: first and last */}
        <text x={PAD.left} y={H - 8} fontSize={11} fill="var(--viz-ink-muted)">
          {fmtDate(data[0].date)}
        </text>
        <text
          x={xTo(xs[last])}
          y={H - 8}
          fontSize={11}
          textAnchor="end"
          fill="var(--viz-ink-muted)"
        >
          {fmtDate(data[last].date)}
        </text>

        {/* crosshair snapped to nearest point */}
        {hover !== null && (
          <line
            x1={xTo(xs[hover])}
            x2={xTo(xs[hover])}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke="var(--viz-baseline)"
            strokeWidth={1}
          />
        )}

        {/* the series: 2px line, round joins */}
        <path d={path} fill="none" stroke="var(--viz-series)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* end-dot with surface ring + direct end label */}
        <circle
          cx={xTo(xs[last])}
          cy={yTo(ys[last])}
          r={4}
          fill="var(--viz-series)"
          stroke="var(--viz-surface)"
          strokeWidth={2}
        />
        <text
          x={xTo(xs[last]) + 8}
          y={yTo(ys[last]) - 8}
          fontSize={12}
          fontWeight={600}
          fill="var(--viz-ink)"
        >
          {ys[last]} kg
        </text>

        {/* hovered point marker */}
        {hover !== null && hover !== last && (
          <circle
            cx={xTo(xs[hover])}
            cy={yTo(ys[hover])}
            r={4}
            fill="var(--viz-series)"
            stroke="var(--viz-surface)"
            strokeWidth={2}
          />
        )}
      </svg>

      {/* tooltip: value leads, date follows */}
      {hoverEntry && (
        <div
          style={{
            position: "absolute",
            left: `${(xTo(xs[hover!]) / W) * 100}%`,
            top: 0,
            transform: "translate(-50%, -4px)",
            background: "var(--viz-surface)",
            border: "1px solid var(--viz-grid)",
            borderRadius: 6,
            padding: "4px 8px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            fontSize: 12,
            boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
          }}
        >
          <span style={{ fontWeight: 600, color: "var(--viz-ink)" }}>
            {hoverEntry.weightKg} kg
          </span>{" "}
          <span style={{ color: "var(--viz-ink-secondary)" }}>
            {fmtDate(hoverEntry.date)}
          </span>
        </div>
      )}
    </div>
  );
}
