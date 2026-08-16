"use client";

import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type Props = {
  destination: "/login" | "/signup";
  title: string;
  action: string;
};

export default function StaticAuthHandoff({ destination, title, action }: Props) {
  const serverOrigin = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const serverHref = serverOrigin ? `${serverOrigin}${destination}` : null;

  return (
    <Paper variant="outlined" sx={{ maxWidth: 520, mx: "auto", p: { xs: 2.5, sm: 4 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography component="h1" variant="h4" gutterBottom>
            {title}
          </Typography>
          <Typography color="text.secondary">
            Accounts require the secure server version of Diet Planner. This GitHub Pages
            site is a static preview, so it cannot store sessions or passwords.
          </Typography>
        </Box>

        {serverHref ? (
          <Button component="a" href={serverHref} variant="contained" size="large">
            {action} on the secure app
          </Button>
        ) : (
          <Alert severity="info">
            Account access is not available from this preview yet. The site owner needs to
            connect the server deployment before sign-in and registration can be enabled.
          </Alert>
        )}

        <Button component={Link} href="/" variant="text">
          Continue without an account
        </Button>
      </Stack>
    </Paper>
  );
}
