"use client";

import * as React from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ChecklistIcon from "@mui/icons-material/Checklist";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import LockOpenIcon from "@mui/icons-material/LockOpen";

const ABILITIES = [
  {
    icon: AutoAwesomeIcon,
    title: "AI-generated 7-day plan",
    text: "A free AI agent builds a full week of meals from your age, height, weight, activity level, goal, dietary preferences and allergies — no account, no API key, no cost.",
  },
  {
    icon: ChecklistIcon,
    title: "Daily meal tracking",
    text: "Check off each meal as you eat it and watch the calorie progress bar fill toward your personal daily target.",
  },
  {
    icon: ShowChartIcon,
    title: "Weight progress chart",
    text: "Log your weight each day and see the trend against your goal line — hover any point for the exact value.",
  },
  {
    icon: LockOpenIcon,
    title: "Private by design",
    text: "Everything is stored locally in your browser. No sign-up, no server database, your data never leaves your device.",
  },
];

export default function Preview() {
  const [index, setIndex] = React.useState(0);
  const count = ABILITIES.length;

  const go = (dir: number) => setIndex((i) => (i + dir + count) % count);
  const ability = ABILITIES[index];
  const Icon = ability.icon;

  return (
    <Box
      sx={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        py: 6,
      }}
    >
      {/* name + 2-line description, centered */}
      <Box sx={{ textAlign: "center", maxWidth: 520 }}>
        <RestaurantIcon sx={{ fontSize: 56, color: "primary.main", mb: 1 }} />
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1.5 }}>
          Diet Planner
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
          A personal diet plan written by a free AI agent —
          <br />
          with daily meal tracking and a weight progress chart.
        </Typography>
      </Box>

      {/* abilities block — switch with the arrows */}
      <Paper
        variant="outlined"
        sx={{
          position: "relative",
          width: "100%",
          maxWidth: 560,
          px: { xs: 6, sm: 8 },
          py: 4,
          textAlign: "center",
        }}
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

        <Box sx={{ minHeight: 168, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <Icon color="primary" sx={{ fontSize: 40, mb: 1.5, mx: "auto" }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            {ability.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {ability.text}
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

        {/* dots */}
        <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 2.5 }}>
          {ABILITIES.map((a, i) => (
            <Box
              key={a.title}
              onClick={() => setIndex(i)}
              role="button"
              aria-label={`Show ${a.title}`}
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                cursor: "pointer",
                bgcolor: i === index ? "primary.main" : "action.disabled",
                transition: "background-color 0.2s",
              }}
            />
          ))}
        </Box>
      </Paper>

      {/* CTA */}
      <Button component={Link} href="/create" variant="contained" size="large">
        Create my plan
      </Button>
    </Box>
  );
}
