"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { addPlan, getActivePlan, loadStore, todayKey } from "@/lib/storage";
import {
  MAX_MEALS_PER_DAY,
  MIN_MEALS_PER_DAY,
  computeTargets,
  deriveGoal,
} from "@/lib/plan";
import { DietPlan, Profile } from "@/lib/types";

const GOAL_LABEL: Record<ReturnType<typeof deriveGoal>, string> = {
  lose: "lose weight",
  gain: "gain weight",
  maintain: "maintain your weight",
};

const DEFAULT: Profile = {
  age: 30,
  sex: "male",
  heightCm: 175,
  weightKg: 80,
  goalWeightKg: 75,
  activity: "light",
  preferences: "",
  allergies: "",
  healthNotes: "",
  mealsPerDay: 4,
};

export default function CreatePlan() {
  const router = useRouter();
  const [form, setForm] = React.useState<Profile>(DEFAULT);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Pre-fill from the active plan's profile, if any.
    const active = getActivePlan(loadStore());
    if (active) setForm(active.profile);
  }, []);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const num =
    (key: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value.replace(",", "."));
      set(key, (Number.isFinite(v) ? v : 0) as Profile[typeof key]);
    };

  const mealsInvalid =
    form.mealsPerDay < MIN_MEALS_PER_DAY || form.mealsPerDay > MAX_MEALS_PER_DAY;

  // The plan's direction is math, not a question: your goal weight vs your current one.
  const goal = deriveGoal(form);
  const targets = computeTargets(form);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-diet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `Server error (${res.status})`);
      const plan = body as DietPlan;

      // Save as a new plan in this device's library and make it active.
      addPlan(form, plan, [{ date: todayKey(), weightKg: form.weightKg }]);
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 } }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, textAlign: "center" }}>
        Create your diet plan
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3, textAlign: "center" }}>
        A free AI agent builds a personalized 7-day plan from your details.
        Generation can take up to a minute.
      </Typography>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        }}
      >
        <TextField label="Age" type="number" value={form.age || ""} onChange={num("age")} />
        <TextField select label="Sex" value={form.sex} onChange={(e) => set("sex", e.target.value as Profile["sex"])}>
          <MenuItem value="male">Male</MenuItem>
          <MenuItem value="female">Female</MenuItem>
        </TextField>
        <TextField label="Height (cm)" type="number" value={form.heightCm || ""} onChange={num("heightCm")} />
        <TextField label="Current weight (kg)" type="number" value={form.weightKg || ""} onChange={num("weightKg")} />
        <TextField label="Goal weight (kg)" type="number" value={form.goalWeightKg || ""} onChange={num("goalWeightKg")} />
        <TextField
          select
          label="Activity level"
          value={form.activity}
          onChange={(e) => set("activity", e.target.value as Profile["activity"])}
        >
          <MenuItem value="sedentary">Sedentary (desk job, no exercise)</MenuItem>
          <MenuItem value="light">Light (1–3 workouts/week)</MenuItem>
          <MenuItem value="moderate">Moderate (3–5 workouts/week)</MenuItem>
          <MenuItem value="active">Active (6–7 workouts/week)</MenuItem>
          <MenuItem value="very_active">Very active (physical job + training)</MenuItem>
        </TextField>
        <TextField
          label="How many times a day do you eat?"
          type="number"
          value={form.mealsPerDay || ""}
          onChange={num("mealsPerDay")}
          error={mealsInvalid}
          helperText={
            mealsInvalid
              ? `Enter a number between ${MIN_MEALS_PER_DAY} and ${MAX_MEALS_PER_DAY}.`
              : "Counting every meal and snack."
          }
          slotProps={{ htmlInput: { min: MIN_MEALS_PER_DAY, max: MAX_MEALS_PER_DAY, step: 1 } }}
        />
        <TextField
          label="Dietary preferences (optional)"
          placeholder="e.g. vegetarian, Mediterranean, no pork"
          value={form.preferences}
          onChange={(e) => set("preferences", e.target.value)}
          sx={{ gridColumn: { sm: "1 / -1" } }}
        />
        <TextField
          label="Allergies / foods to avoid (optional)"
          placeholder="e.g. peanuts, lactose"
          value={form.allergies}
          onChange={(e) => set("allergies", e.target.value)}
          sx={{ gridColumn: { sm: "1 / -1" } }}
        />
        <TextField
          label="Health considerations (optional)"
          placeholder="e.g. type 2 diabetes, high blood pressure, acid reflux"
          helperText="Anything you'd like your meals to take into account. This isn't medical advice — check with your doctor for conditions that need a managed diet."
          multiline
          minRows={2}
          value={form.healthNotes ?? ""}
          onChange={(e) => set("healthNotes", e.target.value)}
          sx={{ gridColumn: { sm: "1 / -1" } }}
        />
      </Box>

      <Alert severity="info" variant="outlined" sx={{ mt: 3 }}>
        From your weights we&apos;ll build a plan to <b>{GOAL_LABEL[goal]}</b> — about{" "}
        <b>{targets.dailyCalories.toLocaleString()} kcal</b> and{" "}
        <b>{targets.proteinG} g protein</b> a day.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={submit}
          disabled={loading || mealsInvalid}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {loading ? "Generating your plan…" : "Generate plan"}
        </Button>
      </Box>
    </Paper>
  );
}
