"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Autocomplete from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { addPlan, getActivePlan, todayKey } from "@/lib/storage";
import { usePlanStore } from "@/lib/usePlanStore";
import { generateDietPlan } from "@/lib/dietPlan";
import {
  MAX_MEALS_PER_DAY,
  MIN_MEALS_PER_DAY,
  computeTargets,
  deriveGoal,
} from "@/lib/plan";
import { SELECTABLE_CUISINES } from "@/data/cuisines";
import { useT } from "@/lib/i18n";
import { DietPlan, Profile } from "@/lib/types";

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
  favoriteCuisines: [],
  mealsPerDay: 4,
};

export default function CreatePlan() {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Pre-fill from the active plan's profile, if any. `edited` stays null until the user
  // touches something, so the prefill is derived during render rather than pushed in by
  // an effect — no cascading render, and the form is right on the first client paint.
  const store = usePlanStore();
  const [edited, setEdited] = React.useState<Profile | null>(null);
  const active = getActivePlan(store);
  const form = edited ?? (active ? { ...DEFAULT, ...active.profile } : DEFAULT);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setEdited({ ...form, [key]: value });

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
      const plan: DietPlan = await generateDietPlan(form);

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
        {t("create.title")}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3, textAlign: "center" }}>
        {t("create.subtitle")}
      </Typography>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        }}
      >
        <TextField label={t("create.age")} type="number" value={form.age || ""} onChange={num("age")} />
        <TextField select label={t("create.sex")} value={form.sex} onChange={(e) => set("sex", e.target.value as Profile["sex"])}>
          <MenuItem value="male">{t("create.male")}</MenuItem>
          <MenuItem value="female">{t("create.female")}</MenuItem>
        </TextField>
        <TextField label={t("create.height")} type="number" value={form.heightCm || ""} onChange={num("heightCm")} />
        <TextField label={t("create.weight")} type="number" value={form.weightKg || ""} onChange={num("weightKg")} />
        <TextField label={t("create.goalWeight")} type="number" value={form.goalWeightKg || ""} onChange={num("goalWeightKg")} />
        <TextField
          select
          label={t("create.activity")}
          value={form.activity}
          onChange={(e) => set("activity", e.target.value as Profile["activity"])}
        >
          <MenuItem value="sedentary">{t("create.act.sedentary")}</MenuItem>
          <MenuItem value="light">{t("create.act.light")}</MenuItem>
          <MenuItem value="moderate">{t("create.act.moderate")}</MenuItem>
          <MenuItem value="active">{t("create.act.active")}</MenuItem>
          <MenuItem value="very_active">{t("create.act.very")}</MenuItem>
        </TextField>
        <TextField
          label={t("create.meals")}
          type="number"
          value={form.mealsPerDay || ""}
          onChange={num("mealsPerDay")}
          error={mealsInvalid}
          helperText={
            mealsInvalid
              ? t("create.mealsError", { min: MIN_MEALS_PER_DAY, max: MAX_MEALS_PER_DAY })
              : t("create.mealsHelp")
          }
          slotProps={{ htmlInput: { min: MIN_MEALS_PER_DAY, max: MAX_MEALS_PER_DAY, step: 1 } }}
        />
        <TextField
          label={t("create.prefs")}
          placeholder={t("create.prefsPh")}
          value={form.preferences}
          onChange={(e) => set("preferences", e.target.value)}
          sx={{ gridColumn: { sm: "1 / -1" } }}
        />
        <Autocomplete
          multiple
          options={SELECTABLE_CUISINES}
          value={form.favoriteCuisines ?? []}
          onChange={(_, value) => set("favoriteCuisines", value)}
          disableCloseOnSelect
          sx={{ gridColumn: { sm: "1 / -1" } }}
          renderValue={(value, getItemProps) =>
            value.map((option, index) => {
              const { key, ...rest } = getItemProps({ index });
              return <Chip key={key} label={option} size="small" {...rest} />;
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label={t("create.cuisines")}
              helperText={t("create.cuisinesHelp")}
            />
          )}
        />
        <TextField
          label={t("create.allergies")}
          placeholder={t("create.allergiesPh")}
          value={form.allergies}
          onChange={(e) => set("allergies", e.target.value)}
          sx={{ gridColumn: { sm: "1 / -1" } }}
        />
        <TextField
          label={t("create.health")}
          placeholder={t("create.healthPh")}
          helperText={t("create.healthHelp")}
          multiline
          minRows={2}
          value={form.healthNotes ?? ""}
          onChange={(e) => set("healthNotes", e.target.value)}
          sx={{ gridColumn: { sm: "1 / -1" } }}
        />
      </Box>

      <Alert severity="info" variant="outlined" sx={{ mt: 3 }}>
        {t("create.goalInfo", {
          goal: t(`create.goal.${goal}`),
          kcal: targets.dailyCalories.toLocaleString(),
          protein: targets.proteinG,
        })}
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
          {loading ? t("create.generating") : t("create.generate")}
        </Button>
      </Box>
    </Paper>
  );
}
