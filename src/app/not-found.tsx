"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { useT } from "@/lib/i18n";

export default function NotFound() {
  const t = useT();

  return (
    <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, textAlign: "center" }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
        {t("notFound.title")}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {t("notFound.body")}
      </Typography>
      <Box sx={{ display: "flex", gap: 1, justifyContent: "center", flexWrap: "wrap" }}>
        <Button variant="contained" href="/">
          {t("notFound.home")}
        </Button>
        <Button variant="outlined" href="/create">
          {t("notFound.create")}
        </Button>
      </Box>
    </Paper>
  );
}
