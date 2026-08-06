"use client";

import * as React from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import Alert from "@mui/material/Alert";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ReplayIcon from "@mui/icons-material/Replay";
import GroceryDialog from "@/components/GroceryDialog";
import MealCard from "@/components/MealCard";
import NutritionTools from "@/components/NutritionTools";
import RerollDialog from "@/components/RerollDialog";
import StatTile from "@/components/StatTile";
import WeightChart from "@/components/WeightChart";
import Preview from "@/app/preview/page";
import { buildGroceryList } from "@/lib/grocery";
import { useI18n } from "@/lib/i18n";
import { checksForDay, dayProgress, planDayIndex, weightProgress } from "@/lib/progress";
import {
  deletePlan,
  getActivePlan,
  renameActivePlan,
  setActivePlan,
  todayKey,
  updateActivePlan,
} from "@/lib/storage";
import { usePlanStore } from "@/lib/usePlanStore";
import { Meal } from "@/lib/types";

export default function Home() {
  const store = usePlanStore();
  const [weightInput, setWeightInput] = React.useState("");
  const [dateInput, setDateInput] = React.useState(todayKey());

  // meal reroll dialog — any meal on any day of the week, not just today
  const [rerollFor, setRerollFor] = React.useState<{ day: number; meal: number } | null>(null);

  // week view
  const [weekOpen, setWeekOpen] = React.useState(false);
  const [groceryOpen, setGroceryOpen] = React.useState(false);

  const { lang } = useI18n();

  // Every mutation below goes through a storage helper, which persists and broadcasts;
  // usePlanStore is subscribed, so the re-render happens without threading state back.
  const active = getActivePlan(store);

  // No plan registered on this device yet → show the landing/preview.
  if (!active) return <Preview />;

  const { plan, profile, weights, checks } = active;
  const today = todayKey();
  const dayIdx = planDayIndex();
  const dayPlan = plan.days[dayIdx];
  const todayChecks = checksForDay(checks, today, dayPlan.meals.length);

  const { consumed, pct } = dayProgress(dayPlan, todayChecks, plan.dailyCalories);
  const { current: currentW, change, toGoal, goal, changeGood } = weightProgress(
    weights,
    profile,
  );

  const toggleMeal = (i: number) => {
    const next = [...todayChecks];
    next[i] = !next[i];
    updateActivePlan(store, { checks: { ...checks, [today]: next } });
  };

  const logWeight = () => {
    const w = parseFloat(weightInput.replace(",", "."));
    if (!Number.isFinite(w) || w <= 0) return;
    const date = dateInput || today;
    const others = weights.filter((e) => e.date !== date);
    updateActivePlan(store, { weights: [...others, { date, weightKg: w }] });
    setWeightInput("");
  };

  const openReroll = (day: number, meal: number) => setRerollFor({ day, meal });

  /** The meal the reroll dialog is currently working on, wherever in the week it sits. */
  const rerollTarget = rerollFor ? plan.days[rerollFor.day].meals[rerollFor.meal] : null;

  const applyReroll = (suggestion: Meal) => {
    if (!rerollFor) return;
    const { day, meal: i } = rerollFor;

    const newDays = plan.days.map((d, di) =>
      di === day
        ? { ...d, meals: d.meals.map((m, mi) => (mi === i ? suggestion : m)) }
        : d,
    );

    // The swapped meal is a different dish, so it can't still count as eaten. Only
    // today's ticks exist, so this only matters when the swap lands on today.
    const nextChecks = { ...checks };
    if (day === dayIdx && nextChecks[today]) {
      const arr = [...nextChecks[today]];
      arr[i] = false;
      nextChecks[today] = arr;
    }

    updateActivePlan(store, { plan: { ...plan, days: newDays }, checks: nextChecks });
    setRerollFor(null);
  };

  const groceries = buildGroceryList(plan);

  const rename = () => {
    const name = window.prompt("Rename this plan", active.name);
    if (name && name.trim()) renameActivePlan(store, name.trim());
  };

  const remove = () => {
    if (window.confirm(`Delete "${active.name}"? This can't be undone.`)) {
      deletePlan(store, active.id);
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      {/* plan switcher */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <TextField
          select
          size="small"
          label="Active plan"
          value={active.id}
          onChange={(e) => setActivePlan(store, e.target.value)}
          sx={{ minWidth: 220, flexGrow: 1 }}
        >
          {store.plans.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
        <IconButton onClick={rename} aria-label="Rename plan">
          <EditOutlinedIcon />
        </IconButton>
        <IconButton onClick={remove} aria-label="Delete plan">
          <DeleteOutlineIcon />
        </IconButton>
        <Button component={Link} href="/create" variant="outlined" size="small" startIcon={<AddIcon />}>
          New plan
        </Button>
      </Box>

      {/* stat tiles */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
        }}
      >
        <StatTile label="Daily target" value={`${plan.dailyCalories.toLocaleString()} kcal`} />
        <StatTile label="Protein target" value={`${plan.macros.proteinG} g`} />
        <StatTile
          label="Current weight"
          value={`${currentW} kg`}
          delta={
            weights.length > 1
              ? { text: `${change > 0 ? "+" : ""}${change} kg vs start`, good: changeGood }
              : null
          }
        />
        <StatTile
          label="To goal"
          value={`${Math.abs(toGoal)} kg`}
          delta={{ text: `goal ${profile.goalWeightKg} kg`, good: true }}
        />
      </Box>

      {/* today's meals */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>
            Today — {dayPlan.day}
          </Typography>
          <Chip
            size="small"
            label={plan.source === "researched" ? "Real recipes · USDA nutrition" : "Legacy plan"}
            color={plan.source === "researched" ? "success" : "default"}
            variant="outlined"
          />
        </Box>

        {plan.warning && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {plan.warning}
          </Alert>
        )}
        <Box sx={{ display: "grid", gap: 1 }}>
          {dayPlan.meals.map((m, i) => (
            <MealCard
              key={`${i}-${m.name}`}
              meal={m}
              eaten={!!todayChecks[i]}
              onToggle={() => toggleMeal(i)}
              onSwap={() => openReroll(dayIdx, i)}
            />
          ))}
        </Box>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {consumed.toLocaleString()} / {plan.dailyCalories.toLocaleString()} kcal eaten
          </Typography>
          <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4 }} />
        </Box>
      </Paper>

      {/* AI add-ons: check a home-cooked dish, and ask about the plan */}
      <NutritionTools
        context={{
          goal,
          dailyCalories: plan.dailyCalories,
          proteinG: plan.macros.proteinG,
          carbsG: plan.macros.carbsG,
          fatG: plan.macros.fatG,
          todayDay: dayPlan.day,
          todayMeals: dayPlan.meals.map((m) => ({
            name: m.name,
            calories: m.calories,
            proteinG: m.proteinG,
          })),
          language: lang,
        }}
      />

      {/* weight progress */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Weight progress
        </Typography>
        <WeightChart entries={weights} goalKg={profile.goalWeightKg} />
        <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
          <TextField
            size="small"
            type="date"
            label="Date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today } }}
          />
          <TextField
            size="small"
            label="Weight (kg)"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && logWeight()}
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
          />
          <Button variant="contained" onClick={logWeight}>
            Log weight
          </Button>
        </Box>
      </Paper>

      {/*
        Full week. Deliberately not an Accordion: AccordionSummary renders a <button>,
        and this header carries its own icon buttons — nesting buttons is invalid HTML
        and breaks hydration. Same pattern as MealCard.
      */}
      <Paper variant="outlined">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
          <Typography sx={{ fontWeight: 600, flexGrow: 1 }}>Full 7-day plan</Typography>
          <Tooltip title="Grocery list for the week">
            <IconButton
              size="small"
              onClick={() => setGroceryOpen(true)}
              aria-label="Show the grocery list for the week"
            >
              <InfoOutlinedIcon />
            </IconButton>
          </Tooltip>
          <IconButton
            size="small"
            onClick={() => setWeekOpen((v) => !v)}
            aria-expanded={weekOpen}
            aria-label={weekOpen ? "Hide the 7-day plan" : "Show the 7-day plan"}
          >
            <ExpandMoreIcon
              sx={{
                transition: "transform 150ms",
                transform: weekOpen ? "rotate(180deg)" : "none",
              }}
            />
          </IconButton>
        </Box>

        <Collapse in={weekOpen} unmountOnExit>
          <Box sx={{ px: 2, pb: 2 }}>
            {plan.days.map((d, di) => (
              <Box key={d.day} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {d.day}
                  {di === dayIdx && (
                    <Chip size="small" label="Today" sx={{ ml: 1 }} variant="outlined" />
                  )}
                </Typography>
                {d.meals.map((m, mi) => (
                  <Box
                    key={`${mi}-${m.name}`}
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ flexGrow: 1, minWidth: 0 }}
                    >
                      {m.name} — {m.calories} kcal, {m.proteinG} g protein
                    </Typography>
                    <Tooltip title="Swap this meal">
                      <IconButton
                        size="small"
                        onClick={() => openReroll(di, mi)}
                        aria-label={`Swap ${m.name} on ${d.day}`}
                      >
                        <ReplayIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Box>
            ))}

            {plan.tips.length > 0 && (
              <>
                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Tips
                </Typography>
                {plan.tips.map((t, i) => (
                  <Typography key={i} variant="body2" color="text.secondary">
                    • {t}
                  </Typography>
                ))}
              </>
            )}
          </Box>
        </Collapse>
      </Paper>

      {/* keyed so reopening on a different meal starts with a clean suggestion */}
      <RerollDialog
        key={rerollFor ? `${rerollFor.day}-${rerollFor.meal}` : "none"}
        open={rerollFor !== null}
        target={rerollTarget}
        dayName={rerollFor ? plan.days[rerollFor.day].day : ""}
        profile={profile}
        onClose={() => setRerollFor(null)}
        onApply={applyReroll}
      />

      <GroceryDialog
        open={groceryOpen}
        onClose={() => setGroceryOpen(false)}
        groceries={groceries}
        dayCount={plan.days.length}
      />
    </Box>
  );
}
