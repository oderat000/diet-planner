import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { readAllActivity } from "@/lib/auth/audit";
import { requireAdmin } from "@/lib/auth/guard";

export const metadata: Metadata = { title: "Activity", robots: { index: false } };

/**
 * Site-wide activity feed. `requireAdmin()` redirects anyone else away before a single
 * row is fetched — this page reads every user's history, so the guard has to be the very
 * first thing that runs.
 */
export default async function AdminActivityPage() {
  await requireAdmin();
  const activity = await readAllActivity(200);

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Activity
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Last {activity.length} events across all users. IP addresses are stored as peppered
          hashes, never in the clear.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>When</TableCell>
              <TableCell>Event</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>IP hash</TableCell>
              <TableCell>Detail</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activity.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  {new Date(entry.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>{entry.event}</TableCell>
                <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>
                  {entry.userId ?? "—"}
                </TableCell>
                <TableCell>{entry.targetId ? `${entry.targetType}/${entry.targetId}` : "—"}</TableCell>
                <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>
                  {entry.ipHash.slice(0, 10)}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  {entry.metadata ? JSON.stringify(entry.metadata) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
