"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import ButtonBase from "@mui/material/ButtonBase";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useT } from "@/lib/i18n";
import { getActivePlan, loadStore, STORE_EVENT } from "@/lib/storage";

export default function Header() {
  const pathname = usePathname();
  const t = useT();
  const [hasPlan, setHasPlan] = React.useState(false);

  React.useEffect(() => {
    const sync = () => setHasPlan(!!getActivePlan(loadStore()));
    sync();
    // re-check when a plan is added/deleted (same tab) or changed in another tab
    window.addEventListener(STORE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(STORE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [pathname]);

  // The preview/landing is shown on /preview, and on / when no plan exists yet.
  // The logo belongs to the main app, so hide it while the preview is showing.
  const onPreview = pathname === "/preview" || (pathname === "/" && !hasPlan);

  return (
    <AppBar
      position="static"
      elevation={0}
      color="transparent"
      sx={{ borderBottom: 1, borderColor: "divider" }}
    >
      <Toolbar>
        {!onPreview && (
          <ButtonBase
            component={Link}
            href="/preview"
            aria-label={t("nav.about")}
            sx={{ borderRadius: 1, px: 1, py: 0.5 }}
          >
            <RestaurantIcon sx={{ mr: 1, color: "primary.main" }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Diet Planner
            </Typography>
          </ButtonBase>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button
          component={Link}
          href="/methodology"
          color="inherit"
          size="small"
          sx={{ textTransform: "none", display: { xs: "none", sm: "inline-flex" } }}
        >
          {t("nav.howItWorks")}
        </Button>
        <Button
          component={Link}
          href="/about"
          color="inherit"
          size="small"
          sx={{ textTransform: "none", mr: 1, display: { xs: "none", sm: "inline-flex" } }}
        >
          {t("nav.faq")}
        </Button>
        <LanguageSwitcher />
      </Toolbar>
    </AppBar>
  );
}
