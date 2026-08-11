"use client";

import * as React from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MuiLink from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import { requestPasswordResetAction, type FormState } from "@/lib/auth/actions";
import AuthCard from "./AuthCard";

export default function ForgotPasswordForm() {
  const [state, formAction, pending] = React.useActionState<FormState, FormData>(
    requestPasswordResetAction,
    {},
  );

  if (state.notice === "sent") {
    return (
      <AuthCard
        title="Check your inbox"
        subtitle="If that address belongs to an account, we've sent a one-time reset link. It expires in 20 minutes."
      >
        <Button component={Link} href="/login" variant="outlined" fullWidth>
          Back to sign in
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter the email used for your Diet Planner account."
      footer={<MuiLink component={Link} href="/login">Back to sign in</MuiLink>}
    >
      <Box component="form" action={formAction} sx={{ display: "grid", gap: 2 }}>
        {state.error && <Alert severity="error">{state.error}</Alert>}
        <TextField name="email" type="email" label="Email" autoComplete="email" required fullWidth />
        <Button type="submit" variant="contained" size="large" disabled={pending} fullWidth>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </Box>
    </AuthCard>
  );
}
