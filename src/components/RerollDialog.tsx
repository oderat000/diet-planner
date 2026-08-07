"use client";

import * as React from "react";
import Image from "next/image";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { rerollMeal } from "@/lib/dietPlan";
import { useIsPhone } from "@/lib/useIsPhone";
import type { Meal, Profile } from "@/lib/types";

/**
 * Swaps one meal for another real recipe at roughly the same calorie slot.
 *
 * Owns its own suggestion/seen/loading state. Mount it with a `key` tied to the meal
 * being swapped so reopening it on a different meal starts clean.
 */
export default function RerollDialog({
  open,
  target,
  dayName,
  profile,
  onClose,
  onApply,
}: {
  open: boolean;
  target: Meal | null;
  dayName: string;
  profile: Pick<Profile, "preferences" | "allergies" | "healthNotes">;
  onClose: () => void;
  onApply: (meal: Meal) => void;
}) {
  const [suggestion, setSuggestion] = React.useState<Meal | null>(null);
  // every meal shown so far, so each reroll returns something new
  const [seen, setSeen] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const phone = useIsPhone();

  const findAlternative = async () => {
    if (!target) return;
    const avoid = suggestion ? [...seen, suggestion.name] : seen;
    setLoading(true);
    setError(null);
    try {
      const newMeal = await rerollMeal({
        profile,
        target: { calories: target.calories, proteinG: target.proteinG },
        exclude: target.name,
        avoid,
      });
      setSuggestion(newMeal);
      setSeen(avoid);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      // a centred card on a phone leaves the suggestion cramped against both edges
      fullScreen={phone}
      slotProps={{
        paper: {
          sx: {
            pt: phone ? "env(safe-area-inset-top)" : 0,
            pb: phone ? "env(safe-area-inset-bottom)" : 0,
          },
        },
      }}
    >
      <DialogTitle>Swap this meal</DialogTitle>
      <DialogContent>
        {target && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Find another real recipe to replace <b>{target.name}</b> on <b>{dayName}</b>, at
            about {target.calories} kcal.
          </Typography>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {suggestion && (
          <Paper variant="outlined" sx={{ p: 2, mt: 2, display: "flex", gap: 2 }}>
            {suggestion.imageUrl && (
              <Box
                sx={{
                  position: "relative",
                  width: 72,
                  height: 72,
                  flexShrink: 0,
                  borderRadius: 1,
                  overflow: "hidden",
                }}
              >
                <Image
                  src={suggestion.imageUrl}
                  alt={suggestion.name}
                  fill
                  sizes="72px"
                  style={{ objectFit: "cover" }}
                />
              </Box>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {suggestion.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {suggestion.description}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {suggestion.calories} kcal · {suggestion.proteinG} g protein
              </Typography>
            </Box>
          </Paper>
        )}
      </DialogContent>
      {/*
        Three buttons don't fit one phone-width row, so they stack — and the primary
        action goes on top, within thumb reach and in reading order.
      */}
      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          pb: 2,
          flexDirection: { xs: "column-reverse", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          gap: { xs: 1, sm: 0 },
          "& > :not(style) ~ :not(style)": { ml: { xs: 0, sm: 1 } },
        }}
      >
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={findAlternative}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {suggestion ? "Try another" : "Find alternative"}
        </Button>
        <Button
          variant="contained"
          onClick={() => suggestion && onApply(suggestion)}
          disabled={!suggestion || loading}
        >
          Use this meal
        </Button>
      </DialogActions>
    </Dialog>
  );
}
