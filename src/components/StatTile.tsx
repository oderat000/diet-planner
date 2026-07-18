"use client";

import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

interface Props {
  label: string;
  value: string;
  /** e.g. "-1.2 kg vs start"; goodDirection decides the color */
  delta?: { text: string; good: boolean } | null;
}

export default function StatTile({ label, value, delta }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 600, mt: 0.5 }}>
        {value}
      </Typography>
      {delta && (
        <Box
          component="span"
          sx={{
            fontSize: 13,
            color: delta.good ? "success.main" : "text.secondary",
          }}
        >
          {delta.text}
        </Box>
      )}
    </Paper>
  );
}
