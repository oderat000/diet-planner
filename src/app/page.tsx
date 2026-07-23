"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ReplayIcon from "@mui/icons-material/Replay";
import MealCard from "@/components/MealCard";
import NutritionTools from "@/components/NutritionTools";
import StatTile from "@/components/StatTile";
import WeightChart from "@/components/WeightChart";
import Preview from "@/app/preview/page";
import { buildGroceryList, formatGrams } from "@/lib/grocery";
import { useI18n } from "@/lib/i18n";
import { deriveGoal } from "@/lib/plan";
import {
  deletePlan,
  getActivePlan,
  loadStore,
  renameActivePlan,
  setActivePlan,
  todayKey,
  updateActivePlan,
} from "@/lib/storage";
import { Meal, PlanStore } from "@/lib/types";

export default function Home() {
  const [store, setStore] = React.useState<PlanStore | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [weightInput, setWeightInput] = React.useState("");
  const [dateInput, setDateInput] = React.useState(todayKey());

  // meal reroll dialog — any meal on any day of the week, not just today
  const [rerollFor, setRerollFor] = React.useState<{ day: number; meal: number } | null>(null);
  const [suggestion, setSuggestion] = React.useState<Meal | null>(null);
  const [seen, setSeen] = React.useState<string[]>([]);
  const [rerollLoading, setRerollLoading] = React.useState(false);
  const [rerollError, setRerollError] = React.useState<string | null>(null);

  // week view
  const [weekOpen, setWeekOpen] = React.useState(false);
  const [groceryOpen, setGroceryOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const { lang } = useI18n();

  React.useEffect(() => {
    setStore(loadStore());
    setLoaded(true);
  }, []);

  const commit = (next: PlanStore) => setStore(next);

  if (!loaded || !store) return null;

  const active = getActivePlan(store);

  // No plan registered on this device yet → show the landing/preview.
  if (!active) return <Preview />;

  const { plan, profile, weights, checks } = active;
  const today = todayKey();
  // plan day by weekday (Monday = 0)
  const dayIdx = (new Date().getDay() + 6) % 7;
  const dayPlan = plan.days[dayIdx];
  const todayChecks =
    checks[today] ?? new Array<boolean>(dayPlan.meals.length).fill(false);

  const consumed = dayPlan.meals.reduce(
    (sum, m, i) => sum + (todayChecks[i] ? m.calories : 0),
    0,
  );
  const pct = Math.min(100, Math.round((consumed / plan.dailyCalories) * 100));

  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const startW = sorted[0]?.weightKg ?? profile.weightKg;
  const currentW = sorted[sorted.length - 1]?.weightKg ?? profile.weightKg;
  const change = Number((currentW - startW).toFixed(1));
  const toGoal = Number((currentW - profile.goalWeightKg).toFixed(1));
  const goal = deriveGoal(profile);
  const changeGood =
    goal === "gain" ? change > 0 : goal === "lose" ? change < 0 : change === 0;

  const toggleMeal = (i: number) => {
    const next = [...todayChecks];
    next[i] = !next[i];
    commit(updateActivePlan(store, { checks: { ...checks, [today]: next } }));
  };

  const logWeight = () => {
    const w = parseFloat(weightInput.replace(",", "."));
    if (!Number.isFinite(w) || w <= 0) return;
    const date = dateInput || today;
    const others = weights.filter((e) => e.date !== date);
    commit(updateActivePlan(store, { weights: [...others, { date, weightKg: w }] }));
    setWeightInput("");
  };

  const openReroll = (day: number, meal: number) => {
    setRerollFor({ day, meal });
    setSuggestion(null);
    setSeen([]);
    setRerollError(null);
  };

  /** The meal the reroll dialog is currently working on, wherever in the week it sits. */
  const rerollTarget = rerollFor ? plan.days[rerollFor.day].meals[rerollFor.meal] : null;

  const findAlternative = async () => {
    if (!rerollTarget) return;
    const meal = rerollTarget;
    // remember every meal shown so each reroll returns something new
    const avoid = suggestion ? [...seen, suggestion.name] : seen;
    setRerollLoading(true);
    setRerollError(null);
    try {
      const res = await fetch("/api/reroll-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            preferences: profile.preferences,
            allergies: profile.allergies,
            healthNotes: profile.healthNotes,
          },
          target: { calories: meal.calories, proteinG: meal.proteinG },
          exclude: meal.name,
          avoid,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `Server error (${res.status})`);
      setSuggestion(body as Meal);
      setSeen(avoid);
    } catch (e) {
      setRerollError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setRerollLoading(false);
    }
  };

  const applyReroll = () => {
    if (!rerollFor || !suggestion) return;
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

    commit(
      updateActivePlan(store, { plan: { ...plan, days: newDays }, checks: nextChecks }),
    );
    setRerollFor(null);
  };

  const groceries = buildGroceryList(plan);

  const copyGroceries = async () => {
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

  const rename = () => {
    const name = window.prompt("Rename this plan", active.name);
    if (name && name.trim()) commit(renameActivePlan(store, name.trim()));
  };

  const remove = () => {
    if (window.confirm(`Delete "${active.name}"? This can't be undone.`)) {
      commit(deletePlan(store, active.id));
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
          onChange={(e) => commit(setActivePlan(store, e.target.value))}
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
            sorted.length > 1
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

      {/* meal reroll dialog */}
      <Dialog open={rerollFor !== null} onClose={() => setRerollFor(null)} fullWidth maxWidth="xs">
        <DialogTitle>Swap this meal</DialogTitle>
        <DialogContent>
          {rerollFor && rerollTarget && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Find another real recipe to replace <b>{rerollTarget.name}</b> on{" "}
              <b>{plan.days[rerollFor.day].day}</b>, at about {rerollTarget.calories} kcal.
            </Typography>
          )}
          {rerollError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {rerollError}
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
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRerollFor(null)}>Cancel</Button>
          <Button
            onClick={findAlternative}
            disabled={rerollLoading}
            startIcon={rerollLoading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {suggestion ? "Try another" : "Find alternative"}
          </Button>
          <Button variant="contained" onClick={applyReroll} disabled={!suggestion || rerollLoading}>
            Use this meal
          </Button>
        </DialogActions>
      </Dialog>

      {/* grocery list for the whole week */}
      <Dialog
        open={groceryOpen}
        onClose={() => setGroceryOpen(false)}
        fullWidth
        maxWidth="sm"
        scroll="paper"
      >
        <DialogTitle>Grocery list — the whole week</DialogTitle>
        <DialogContent dividers>
          {groceries.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              This plan has no ingredient data. Create a new plan to get a grocery list.
            </Typography>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Everything the {plan.days.length}-day plan calls for, summed and scaled to your
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
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
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
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
                Weights are the published quantities scaled to your portion. Items shown with a
                measure instead of a weight were written too vaguely to weigh (&ldquo;a
                splash&rdquo;, &ldquo;to taste&rdquo;) — we list the wording rather than invent a
                number.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={copyGroceries} disabled={groceries.length === 0}>
            {copied ? "Copied" : "Copy list"}
          </Button>
          <Button variant="contained" onClick={() => setGroceryOpen(false)}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
