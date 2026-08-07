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
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import MenuIcon from "@mui/icons-material/Menu";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useT } from "@/lib/i18n";
import { getActivePlan, loadStore, STORE_EVENT } from "@/lib/storage";

/** Username when signed in, null when not, undefined when accounts aren't configured. */
export type HeaderUser = { username: string } | null | undefined;

export default function Header({ user }: { user?: HeaderUser }) {
  const pathname = usePathname();
  const t = useT();
  const [hasPlan, setHasPlan] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

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

  // navigating away should never leave the drawer covering the new page
  React.useEffect(() => setMenuOpen(false), [pathname]);

  // The preview/landing is shown on /preview, and on / when no plan exists yet.
  // The logo belongs to the main app, so hide it while the preview is showing.
  const onPreview = pathname === "/preview" || (pathname === "/" && !hasPlan);

  const links: { href: string; label: string }[] = [
    { href: "/", label: t("footer.app") },
    { href: "/methodology", label: t("nav.howItWorks") },
    { href: "/about", label: t("nav.faq") },
    ...(user !== undefined
      ? [{ href: user ? "/account" : "/login", label: user ? user.username : "Sign in" }]
      : []),
  ];

  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="transparent"
      sx={{
        borderBottom: 1,
        borderColor: "divider",
        // opaque, because sticky now means page content scrolls underneath it
        bgcolor: "background.default",
        // clear the notch when the page paints edge-to-edge (viewportFit: cover)
        pt: "env(safe-area-inset-top)",
        px: "env(safe-area-inset-left)",
      }}
    >
      <Toolbar sx={{ px: { xs: 1, sm: 3 }, minHeight: { xs: 56, sm: 64 } }}>
        {!onPreview && (
          <ButtonBase
            component={Link}
            href="/preview"
            aria-label={t("nav.about")}
            sx={{ borderRadius: 1, px: 1, py: 0.5, minWidth: 0 }}
          >
            <RestaurantIcon sx={{ mr: 1, color: "primary.main" }} />
            <Typography variant="h6" sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
              Diet Planner
            </Typography>
          </ButtonBase>
        )}
        <Box sx={{ flexGrow: 1 }} />

        {/* wide screens: the links sit in the bar */}
        <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center" }}>
          <Button
            component={Link}
            href="/methodology"
            color="inherit"
            size="small"
            sx={{ textTransform: "none" }}
          >
            {t("nav.howItWorks")}
          </Button>
          <Button
            component={Link}
            href="/about"
            color="inherit"
            size="small"
            sx={{ textTransform: "none", mr: 1 }}
          >
            {t("nav.faq")}
          </Button>
          {user !== undefined && (
            <Button
              component={Link}
              href={user ? "/account" : "/login"}
              color="inherit"
              size="small"
              sx={{ textTransform: "none", mr: 1 }}
            >
              {user ? user.username : "Sign in"}
            </Button>
          )}
        </Box>

        <LanguageSwitcher />

        {/*
          Phones: the same links behind a menu. Previously they were simply hidden at
          xs, which left /methodology and /about unreachable from a phone entirely.
        */}
        <IconButton
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          sx={{ display: { xs: "inline-flex", sm: "none" }, ml: 0.5 }}
        >
          <MenuIcon />
        </IconButton>
      </Toolbar>

      <Drawer
        anchor="right"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: "min(78vw, 300px)",
              pt: "env(safe-area-inset-top)",
              pb: "env(safe-area-inset-bottom)",
            },
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
          <RestaurantIcon sx={{ color: "primary.main" }} />
          <Typography sx={{ fontWeight: 600 }}>Diet Planner</Typography>
        </Box>
        <Divider />
        <List>
          {links.map((link) => (
            <ListItemButton
              key={link.href}
              component={Link}
              href={link.href}
              selected={pathname === link.href}
              onClick={() => setMenuOpen(false)}
              // 48px is the minimum comfortable touch target
              sx={{ minHeight: 48 }}
            >
              <ListItemText primary={link.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
    </AppBar>
  );
}
