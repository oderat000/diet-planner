"use client";

import * as React from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MuiLink from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import { loginAction, type FormState } from "@/lib/auth/actions";
import AuthCard from "./AuthCard";

export default function LoginForm() {
  const [state, formAction, pending] = React.useActionState<FormState, FormData>(loginAction, {});

  return (
    <AuthCard
      title="Sign in"
      footer={
        <>
          No account? <MuiLink component={Link} href="/signup">Create one</MuiLink>
        </>
      }
    >
      <Box component="form" action={formAction} sx={{ display: "grid", gap: 2 }}>
        {state.error && <Alert severity="error">{state.error}</Alert>}
        <TextField
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          required
          fullWidth
        />
        <TextField
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          required
          fullWidth
        />
        <Button type="submit" variant="contained" size="large" disabled={pending} fullWidth>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
        <MuiLink component={Link} href="/verify-email" variant="body2" sx={{ textAlign: "center" }}>
          Need a new confirmation link?
        </MuiLink>
      </Box>
    </AuthCard>
  );
}
