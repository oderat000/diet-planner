"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { formatGrams } from "@/lib/format";
import type { GroceryItem } from "@/lib/grocery";

/**
 * The week's shopping list. Items the publisher wrote too vaguely to weigh are shown
 * with their original wording instead of a fabricated gram figure — see lib/grocery.ts.
 */
export default function GroceryDialog({
  open,
  onClose,
  groceries,
  dayCount,
}: {
  open: boolean;
  onClose: () => void;
  groceries: GroceryItem[];
  dayCount: number;
}) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    const text = groceries
      .map((item) => {
        const qty =
          item.grams !== null
            ? formatGrams(item.grams) +
              (item.measures.length ? ` + ${item.measures.join(", ")}` : "")
            : item.measures.join(", ");
        return qty ? `${item.name} — ${qty}` : item.name;
      })
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked (insecure context / denied) — leave the list on screen to copy by hand
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle>Grocery list — the whole week</DialogTitle>
      <DialogContent dividers>
        {groceries.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            This plan has no ingredient data. Create a new plan to get a grocery list.
          </Typography>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Everything the {dayCount}-day plan calls for, summed and scaled to your
              portions — {groceries.length} items.
            </Typography>
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none" }}>
              {groceries.map((item) => (
                <Box
                  key={item.name}
                  component="li"
                  sx={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 1,
                    py: 0.75,
                    borderBottom: 1,
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }}>
                    {item.name}
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 1 }}
                    >
                      {item.meals} {item.meals === 1 ? "meal" : "meals"}
                    </Typography>
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, whiteSpace: "nowrap", textAlign: "right" }}
                  >
                    {item.grams !== null ? formatGrams(item.grams) : ""}
                    {/* no weight: show what the publisher actually wrote, not a guess */}
                    {item.measures.length > 0 && (
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: item.grams !== null ? 1 : 0, fontWeight: 400 }}
                      >
                        {item.grams !== null ? "+ " : ""}
                        {item.measures.join(", ")}
                      </Typography>
                    )}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 2 }}
            >
              Weights are the published quantities scaled to your portion. Items shown with a
              measure instead of a weight were written too vaguely to weigh (&ldquo;a
              splash&rdquo;, &ldquo;to taste&rdquo;) — we list the wording rather than invent a
              number.
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={copy} disabled={groceries.length === 0}>
          {copied ? "Copied" : "Copy list"}
        </Button>
        <Button variant="contained" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
