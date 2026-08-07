"use client";

import * as React from "react";
import Typography from "@mui/material/Typography";
import { WeightEntry } from "@/lib/types";

/**
 * The chart is drawn in a viewBox whose width tracks the element's real CSS width, so
 * one SVG unit is always one screen pixel and the labels render at their true size. A
 * fixed 640-unit box stretched to a 340px phone would shrink 11px text to about 6px.
 */
const DEFAULT_W = 640;
const NARROW = 420;

interface Props {
  entries: WeightEntry[];
  goalKg: number;
}

/** The element's rendered width in CSS pixels, tracked as the viewport changes. */
function useWidth(ref: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [width, setWidth] = React.useState(DEFAULT_W);

  React.useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = entry.contentRect.width;
      if (next > 0) setWidth(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, enabled]);

  return width;
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
  const wrapRef = React.useRef<HTMLDivElement>(null);

  const data = React.useMemo(
    () => [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries],
  );

  const enough = data.length >= 2;
  const measured = useWidth(wrapRef, enough);

  if (!enough) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
        Log your weight on at least two days to see the progress chart.
      </Typography>
    );
  }

  const W = Math.max(280, Math.round(measured));
  const narrow = W < NARROW;
  const H = narrow ? 200 : 260;
  // On a phone the "Goal 75" label can't have a 56px gutter to itself — it moves inside
  // the plot, sitting just above its own line instead.
  const PAD = {
    top: 16,
    right: narrow ? 10 : 56,
    bottom: 28,
    left: narrow ? 34 : 44,
  };

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

  const ticks = niceTicks(yMin, yMax, narrow ? 3 : 4);
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
    <div ref={wrapRef} style={{ position: "relative" }}>
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
          x={narrow ? W - PAD.right : W - PAD.right + 6}
          y={narrow ? yTo(goalKg) - 5 : yTo(goalKg) + 4}
          textAnchor={narrow ? "end" : "start"}
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
        {/* the end value sits right of the dot, but flips left when there's no gutter */}
        <text
          x={narrow ? xTo(xs[last]) - 8 : xTo(xs[last]) + 8}
          y={yTo(ys[last]) - 8}
          textAnchor={narrow ? "end" : "start"}
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
            // clamped so a tooltip near either end stays inside the card instead of
            // being clipped — noticeable at phone widths, where the chart is narrow
            left: `${Math.min(88, Math.max(12, (xTo(xs[hover!]) / W) * 100))}%`,
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
