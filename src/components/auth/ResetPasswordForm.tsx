"use client";

import * as React from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { type FormState } from "@/lib/auth/actions";
import AuthCard from "./AuthCard";

export default function ResetPasswordForm({
  reset,
}: {
  reset: (_prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = React.useActionState<FormState, FormData>(reset, {});

  if (state.notice === "changed") {
    return (
      <AuthCard title="Password changed" subtitle="Your old sessions were signed out for safety.">
        <Button component={Link} href="/login" variant="contained" fullWidth>
          Sign in with the new password
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" subtitle="Use at least 10 characters.">
      <Box component="form" action={formAction} sx={{ display: "grid", gap: 2 }}>
        {state.error && <Alert severity="error">{state.error}</Alert>}
        <TextField
          name="password"
          type="password"
          label="New password"
          autoComplete="new-password"
          required
          fullWidth
          slotProps={{ htmlInput: { minLength: 10, maxLength: 256 } }}
        />
        <TextField
          name="passwordConfirmation"
          type="password"
          label="Confirm new password"
          autoComplete="new-password"
          required
          fullWidth
          slotProps={{ htmlInput: { minLength: 10, maxLength: 256 } }}
        />
        <Button type="submit" variant="contained" size="large" disabled={pending} fullWidth>
          {pending ? "Changing…" : "Change password"}
        </Button>
      </Box>
    </AuthCard>
  );
}
