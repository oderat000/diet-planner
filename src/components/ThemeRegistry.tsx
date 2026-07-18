"use client";

import * as React from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: {
      palette: {
        // creamy grey — applied to every page via background.default
        background: { default: "#e9e6dd", paper: "#f6f4ee" },
      },
    },
    dark: {
      palette: {
        background: { default: "#1a1a19", paper: "#232321" },
      },
    },
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  shape: { borderRadius: 10 },
});

export default function ThemeRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
