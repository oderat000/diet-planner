"use client"; // error boundaries must be Client Components

import * as React from "react";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { useT } from "@/lib/i18n";

/**
 * Catches render-time errors anywhere in the app and offers a way back, instead of the
 * blank white page a crash used to produce.
 *
 * Next 16 passes `unstable_retry` (formerly `reset`) to re-render the failed segment.
 */
export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const t = useT();

  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 } }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
        {t("error.title")}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {t("error.body")}
      </Typography>

      <Alert severity="error" sx={{ mb: 3 }}>
        <AlertTitle>{t("error.detail")}</AlertTitle>
        {error.message || "Unknown error"}
        {error.digest ? (
          <Box component="span" sx={{ display: "block", mt: 1, opacity: 0.8 }}>
            ref: {error.digest}
          </Box>
        ) : null}
      </Alert>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button variant="contained" onClick={() => unstable_retry()}>
          {t("error.retry")}
        </Button>
        <Button variant="outlined" href="/">
          {t("error.home")}
        </Button>
      </Box>
    </Paper>
  );
}
