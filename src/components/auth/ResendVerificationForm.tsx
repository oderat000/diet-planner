"use client";

import * as React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { resendVerificationAction, type FormState } from "@/lib/auth/actions";
import AuthCard from "./AuthCard";

export default function ResendVerificationForm() {
  const [state, formAction, pending] = React.useActionState<FormState, FormData>(
    resendVerificationAction,
    {},
  );

  return (
    <AuthCard
      title="Confirm your email"
      subtitle="Your account isn't usable until you click the link we emailed you. Lost it? Request another below."
    >
      <Box component="form" action={formAction} sx={{ display: "grid", gap: 2 }}>
        {state.error && <Alert severity="error">{state.error}</Alert>}
        {state.notice === "sent" && (
          <Alert severity="success">
            If that address needs confirming, a new link is on its way.
          </Alert>
        )}
        <TextField name="email" type="email" label="Email" autoComplete="email" required fullWidth />
        <Button type="submit" variant="contained" disabled={pending} fullWidth>
          {pending ? "Sending…" : "Send a new link"}
        </Button>
      </Box>
    </AuthCard>
  );
}
