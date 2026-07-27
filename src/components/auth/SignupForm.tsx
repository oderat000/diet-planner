"use client";

import * as React from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MuiLink from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import { signupAction, type FormState } from "@/lib/auth/actions";
import AuthCard from "./AuthCard";

export default function SignupForm() {
  const [state, formAction, pending] = React.useActionState<FormState, FormData>(
    signupAction,
    {},
  );

  if (state.notice === "sent") {
    return (
      <AuthCard
        title="Check your inbox"
        subtitle="If that email address isn't already registered, we've sent a confirmation link to it. The link works once and expires in 30 minutes."
      >
        <Button component={Link} href="/login" variant="outlined" fullWidth>
          Back to sign in
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create an account"
      subtitle="Your plans stay on this device either way — an account lets you reach them from anywhere."
      footer={
        <>
          Already have one? <MuiLink component={Link} href="/login">Sign in</MuiLink>
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
          helperText="We'll send a confirmation link here."
        />
        <TextField
          name="username"
          label="Username"
          autoComplete="username"
          required
          fullWidth
          slotProps={{ htmlInput: { minLength: 3, maxLength: 30 } }}
          helperText="3–30 characters: letters, digits, - or _."
        />
        <TextField
          name="password"
          type="password"
          label="Password"
          autoComplete="new-password"
          required
          fullWidth
          slotProps={{ htmlInput: { minLength: 10, maxLength: 256 } }}
          helperText="At least 10 characters. Checked against known breached passwords."
        />
        <Button type="submit" variant="contained" size="large" disabled={pending} fullWidth>
          {pending ? "Creating…" : "Create account"}
        </Button>
      </Box>
    </AuthCard>
  );
}
