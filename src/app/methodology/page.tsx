"use client";

import * as React from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import ScienceIcon from "@mui/icons-material/Science";
import CalculateIcon from "@mui/icons-material/Calculate";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { useT } from "@/lib/i18n";

const SECTIONS = [
  { icon: RestaurantIcon, key: "recipes" },
  { icon: ScienceIcon, key: "nutrition" },
  { icon: CalculateIcon, key: "math" },
  { icon: VisibilityIcon, key: "honesty" },
  { icon: AutoAwesomeIcon, key: "addons" },
  { icon: LockOpenIcon, key: "privacy" },
] as const;

export default function MethodologyPage() {
  const t = useT();

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box sx={{ textAlign: "center", maxWidth: 640, mx: "auto", mb: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1.5 }}>
          {t("methodology.title")}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t("methodology.subtitle")}
        </Typography>
      </Box>

      {SECTIONS.map((s, i) => {
        const Icon = s.icon;
        return (
          <Paper key={s.key} variant="outlined" sx={{ p: 3, display: "flex", gap: 2 }}>
            <Icon color="primary" sx={{ fontSize: 32, flexShrink: 0 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                {t(`methodology.${s.key}.title`)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t(`methodology.${s.key}.text`)}
              </Typography>
            </Box>
          </Paper>
        );
      })}

      <Divider sx={{ my: 1 }} />

      <Box sx={{ textAlign: "center" }}>
        <Button component={Link} href="/create" variant="contained" size="large">
          {t("methodology.cta")}
        </Button>
      </Box>
    </Box>
  );
}
