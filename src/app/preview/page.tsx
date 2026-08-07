"use client";

import * as React from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ChecklistIcon from "@mui/icons-material/Checklist";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { useT } from "@/lib/i18n";

const ABILITIES = [
  { icon: AutoAwesomeIcon, key: "plan" },
  { icon: ChecklistIcon, key: "track" },
  { icon: ShowChartIcon, key: "chart" },
  { icon: LockOpenIcon, key: "private" },
] as const;

export default function Preview() {
  const t = useT();
  const [index, setIndex] = React.useState(0);
  const count = ABILITIES.length;

  const go = React.useCallback(
    (dir: number) => setIndex((i) => (i + dir + count) % count),
    [count],
  );
  const ability = ABILITIES[index];
  const Icon = ability.icon;

  // Arrow buttons are a mouse idiom; on a phone the natural gesture is a swipe, so the
  // card accepts one too. Pointer events cover touch and pen without a second code path.
  const swipeStart = React.useRef<number | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    swipeStart.current = e.pointerType === "mouse" ? null : e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (start === null) return;
    const dx = e.clientX - start;
    // 40px, so a tap with a little wobble isn't read as a swipe
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  };

  return (
    <Box
      sx={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: { xs: 3, sm: 5 },
        py: { xs: 3, sm: 6 },
      }}
    >
      {/* name + 2-line description, centered */}
      <Box sx={{ textAlign: "center", maxWidth: 520 }}>
        <RestaurantIcon sx={{ fontSize: { xs: 44, sm: 56 }, color: "primary.main", mb: 1 }} />
        <Typography
          variant="h3"
          sx={{ fontWeight: 700, mb: 1.5, fontSize: { xs: "2.125rem", sm: "3rem" } }}
        >
          Diet Planner
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ fontWeight: 400, fontSize: { xs: "1rem", sm: "1.25rem" } }}
        >
          {t("landing.tagline")}
        </Typography>
      </Box>

      {/* abilities block — switch with the arrows */}
      <Paper
        variant="outlined"
        sx={{
          position: "relative",
          width: "100%",
          maxWidth: 560,
          // 48px gutters on a 343px card leave the text barely 240px wide
          px: { xs: 4.5, sm: 8 },
          py: { xs: 3, sm: 4 },
          textAlign: "center",
          touchAction: "pan-y",
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipeStart.current = null)}
      >
        <IconButton
          onClick={() => go(-1)}
          aria-label="Previous ability"
          sx={{
            position: "absolute",
            left: 8,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          <ChevronLeftIcon />
        </IconButton>

        <Box
          sx={{
            minHeight: { xs: 190, sm: 168 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Icon color="primary" sx={{ fontSize: 40, mb: 1.5, mx: "auto" }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            {t(`landing.${ability.key}.title`)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(`landing.${ability.key}.text`)}
          </Typography>
        </Box>

        <IconButton
          onClick={() => go(1)}
          aria-label="Next ability"
          sx={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          <ChevronRightIcon />
        </IconButton>

        {/*
          Dots. The visible dot stays 8px, but its hit area is a 32px button — a bare
          8px target is well under what a fingertip can reliably hit.
        */}
        <Box sx={{ display: "flex", justifyContent: "center", mt: 1.5 }}>
          {ABILITIES.map((a, i) => (
            <ButtonBase
              key={a.key}
              onClick={() => setIndex(i)}
              aria-label={t(`landing.${a.key}.title`)}
              aria-current={i === index}
              sx={{ width: 32, height: 32, borderRadius: "50%" }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: i === index ? "primary.main" : "action.disabled",
                  transition: "background-color 0.2s",
                }}
              />
            </ButtonBase>
          ))}
        </Box>
      </Paper>

      {/* CTA */}
      <Button
        component={Link}
        href="/create"
        variant="contained"
        size="large"
        sx={{ width: { xs: "100%", sm: "auto" }, maxWidth: 560, py: { xs: 1.5, sm: 1 } }}
      >
        {t("landing.cta")}
      </Button>

      {/* trust line */}
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", maxWidth: 480 }}>
        {t("landing.trust")}{" "}
        <Link href="/methodology" style={{ color: "inherit" }}>
          {t("landing.learnMore")} →
        </Link>
      </Typography>
    </Box>
  );
}
