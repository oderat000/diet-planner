"use client";

import * as React from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import MuiLink from "@mui/material/Link";
import { useT } from "@/lib/i18n";

export default function Footer() {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        borderTop: 1,
        borderColor: "divider",
        mt: { xs: 4, sm: 6 },
        // keep the links clear of the iPhone home indicator
        pb: "env(safe-area-inset-bottom)",
      }}
    >
      <Container maxWidth="md" sx={{ pt: { xs: 4, sm: 5 }, pb: 3, px: { xs: 1.5, sm: 3 } }}>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: { xs: 1.5, sm: 3 },
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {t("footer.tagline")}
          </Typography>
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            <MuiLink component={Link} href="/menu" variant="body2" color="text.secondary">
              Menu
            </MuiLink>
            <MuiLink component={Link} href="/methodology" variant="body2" color="text.secondary">
              {t("footer.howItWorks")}
            </MuiLink>
            <MuiLink component={Link} href="/about" variant="body2" color="text.secondary">
              {t("footer.about")}
            </MuiLink>
            <MuiLink component={Link} href="/" variant="body2" color="text.secondary">
              {t("footer.app")}
            </MuiLink>
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
          © {year} {t("footer.rights")}
        </Typography>
      </Container>
    </Box>
  );
}
