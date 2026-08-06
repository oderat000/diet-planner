import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { logoutAction, logoutEverywhereAction } from "@/lib/auth/actions";
import { auditLog, readUserActivity } from "@/lib/auth/audit";
import { requireUser } from "@/lib/auth/guard";
import { listSessions } from "@/lib/auth/session";
import type { ActivityEvent } from "@/lib/auth/types";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

/** Plain-English labels, so the log is legible to the person it's about. */
const EVENT_LABEL: Record<ActivityEvent, string> = {
  "auth.signup": "Account created",
  "auth.verify_email": "Email confirmed",
  "auth.verify_failed": "Invalid confirmation link used",
  "auth.login": "Signed in",
  "auth.login_failed": "Failed sign-in attempt",
  "auth.logout": "Signed out",
  "auth.logout_all": "Signed out of all devices",
  "auth.rate_limited": "Rate limit reached",
  "dish.analyzed": "Analysed a dish photo",
  "assistant.asked": "Asked the assistant",
  "account.viewed_activity": "Viewed account activity",
};

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Server Component. `requireUser()` runs before anything renders — Proxy's cookie check
 * is not what protects this page.
 */
export default async function AccountPage() {
  const { user, session } = await requireUser();
  const [sessions, activity] = await Promise.all([
    listSessions(user.id),
    readUserActivity(user.id, 100),
  ]);

  // Reading your own history is itself an event worth recording.
  await auditLog("account.viewed_activity", { userId: user.id, sessionId: session.id });

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {user.username}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {user.email} · joined {when(user.createdAt)}
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
          Signed-in devices ({sessions.length})
        </Typography>
        <Stack divider={<Divider flexItem />} spacing={1.5}>
          {sessions.map((s) => (
            <Box key={s.id}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {s.userAgent}
                {s.id === session.id && (
                  <Chip label="This device" size="small" color="primary" sx={{ ml: 1 }} />
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Started {when(s.createdAt)} · expires {when(s.expiresAt)}
              </Typography>
            </Box>
          ))}
        </Stack>
        <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
          <form action={logoutAction}>
            <Button type="submit" variant="outlined">
              Sign out
            </Button>
          </form>
          <form action={logoutEverywhereAction}>
            <Button type="submit" variant="outlined" color="error">
              Sign out everywhere
            </Button>
          </form>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Your activity
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Everything recorded on your account, newest first. Kept for 90 days, then deleted.
        </Typography>
        <Stack divider={<Divider flexItem />} spacing={1}>
          {activity.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Nothing recorded yet.
            </Typography>
          )}
          {activity.map((entry) => (
            <Box
              key={entry.id}
              sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.5 }}
            >
              <Typography variant="body2">
                {EVENT_LABEL[entry.event] ?? entry.event}
                {entry.targetId && (
                  <Typography component="span" variant="caption" color="text.secondary">
                    {" "}
                    · {entry.targetType} {entry.targetId}
                  </Typography>
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                {when(entry.createdAt)}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}
