"use client";

import Link from "next/link";
import Image from "next/image";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ChecklistIcon from "@mui/icons-material/Checklist";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { useT } from "@/lib/i18n";
import appIcon from "../../../public/icons/appstore-1024.png";

const BENEFITS = [
  { icon: AutoAwesomeIcon, key: "plan" },
  { icon: ChecklistIcon, key: "track" },
  { icon: ShowChartIcon, key: "chart" },
  { icon: LockOpenIcon, key: "private" },
] as const;

export default function Preview() {
  const t = useT();

  return (
    <Box
      sx={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: { xs: 2.5, sm: 3.5 },
        py: { xs: 3, sm: 6 },
        textAlign: "center",
      }}
    >
      <Image
        src={appIcon}
        alt="Diet Planner fork and knife logo"
        priority
        sizes="(max-width: 600px) 128px, 160px"
        style={{ width: "clamp(128px, 24vw, 160px)", height: "auto", borderRadius: 28 }}
      />

      <Box sx={{ maxWidth: 560 }}>
        <Typography
          variant="h3"
          sx={{ fontWeight: 700, mb: 1, fontSize: { xs: "2.125rem", sm: "3rem" } }}
        >
          Diet Planner
        </Typography>
        <Typography color="text.secondary" sx={{ fontSize: { xs: "1rem", sm: "1.125rem" } }}>
          {t("landing.tagline")}
        </Typography>
      </Box>

      <Box
        component="ul"
        aria-label="What Diet Planner offers"
        sx={{
          width: "100%",
          maxWidth: 560,
          m: 0,
          p: 0,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 1.25,
          listStyle: "none",
          textAlign: "left",
        }}
      >
        {BENEFITS.map(({ icon: Icon, key }) => (
          <Box
            component="li"
            key={key}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              p: 1.5,
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            <Icon color="primary" />
            <Typography sx={{ fontWeight: 600 }}>{t(`landing.${key}.title`)}</Typography>
          </Box>
        ))}
      </Box>

      <Button
        component={Link}
        href="/create"
        variant="contained"
        size="large"
        sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 220 }, py: 1.25 }}
      >
        {t("landing.cta")}
      </Button>
    </Box>
  );
}
