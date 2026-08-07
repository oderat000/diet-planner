"use client";

import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

/**
 * True below the `sm` breakpoint — i.e. on a phone.
 *
 * For layout, prefer responsive `sx` values: they are plain CSS and are already correct
 * in the server-rendered HTML. Use this only where a *prop* has to change (a Dialog
 * becoming `fullScreen`, say), which CSS can't express.
 *
 * `noSsr` makes the first client render read the real viewport instead of assuming
 * desktop and correcting a frame later. Everything using this hook renders after a tap,
 * so there is no server HTML to mismatch.
 */
export function useIsPhone(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });
}
