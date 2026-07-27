"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MuiLink from "@mui/material/Link";
import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";

/**
 * The token is redeemed by an explicit click, not by the page render.
 *
 * Two reasons: a Server Component can't set the session cookie during rendering, and mail
 * clients and link scanners routinely GET every URL in a message — auto-redeeming would
 * burn the link before the user ever saw it.
 */
export default function ConfirmButton({
  confirm,
}: {
  confirm: () => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function onConfirm() {
    startTransition(async () => {
      const result = await confirm();
      if (result.error) setError(result.error);
      else router.replace("/");
    });
  }

  return (
    <AuthCard
      title="Confirm your account"
      subtitle="One click and your Diet Planner account is active."
    >
      <Box sx={{ display: "grid", gap: 2 }}>
        {error && (
          <Alert severity="error">
            {error}{" "}
            <MuiLink component={Link} href="/verify-email">
              Request a new link
            </MuiLink>
          </Alert>
        )}
        <Button variant="contained" size="large" onClick={onConfirm} disabled={pending} fullWidth>
          {pending ? "Confirming…" : "Confirm my email"}
        </Button>
      </Box>
    </AuthCard>
  );
}
