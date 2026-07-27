"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

/** Shared shell for the sign-in / sign-up / verify screens. */
export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Box sx={{ maxWidth: 420, mx: "auto", py: 2 }}>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: subtitle ? 1 : 3 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {subtitle}
          </Typography>
        )}
        {children}
      </Paper>
      {footer && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
          {footer}
        </Typography>
      )}
    </Box>
  );
}
