import { NextResponse } from "next/server";
import { DAY_NAMES, clampMeals, computeTargets } from "@/lib/plan";
import { toMeal } from "@/lib/nutrition";
import { buildPool, favoriteCuisines, pick } from "@/lib/select";
import { canonicalCuisine } from "@/data/cuisines";
import { DayPlan, DietPlan, Meal, Profile, Targets } from "@/lib/types";

/**
 * Builds a week from real, published recipes, costed against USDA's measured
 * nutrition data. No language model is involved: the calorie targets come from the
 * Mifflin-St Jeor equation, the food comes from a recipe catalogue, the numbers come
 * from a government database, and this route does the arithmetic that joins them.
 */
export async function POST(req: Request) {
  const profile = (await req.json()) as Profile;
  const targets = computeTargets(profile);

  try {
    const plan = await buildPlan(profile, targets);
    return NextResponse.json(plan);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not build a plan";
    console.warn("Plan generation failed:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** Calorie share of the day for each meal slot, for any number of meals. */
function slotWeights(mealsPerDay: number): { kind: "breakfast" | "main" | "light"; weight: number }[] {
  const slots: { kind: "breakfast" | "main" | "light"; weight: number }[] = [];
  const mains = Math.min(mealsPerDay, 3);
  const extras = mealsPerDay - mains;

  const MAIN_WEIGHTS = [0.28, 0.38, 0.34];
  for (let i = 0; i < mains; i++) {
    slots.push({ kind: i === 0 ? "breakfast" : "main", weight: MAIN_WEIGHTS[i] });
  }
  for (let i = 0; i < extras; i++) {
    slots.splice(Math.min(2 + i, slots.length), 0, { kind: "light", weight: 0.12 });
  }
  return slots;
}

async function buildPlan(p: Profile, t: Targets): Promise<DietPlan> {
  const mealsPerDay = clampMeals(p.mealsPerDay);
  const pool = await buildPool(p);

  const total = pool.breakfast.length + pool.main.length + pool.light.length;
  if (total === 0) {
    throw new Error(
      "No real recipes matched your preferences and allergies. Try relaxing them — we won't invent a meal to fill the gap.",
    );
  }

  const slots = slotWeights(mealsPerDay);
  const totalWeight = slots.reduce((s, x) => s + x.weight, 0);
  const usedIds = new Set<string>();
  // favourites resolved to canonical cuisine keys for matching against recipe areas
  const favored = new Set(
    favoriteCuisines(p)
      .map((a) => canonicalCuisine(a))
      .filter((a): a is string => a !== null),
  );
  const days: DayPlan[] = [];
  let unfilled = 0;

  // How much of the day's weighted calories are still ahead, at and after each slot —
  // used to turn "protein left to hit today" into a per-slot target as the day goes.
  const suffixWeight: number[] = new Array(slots.length);
  for (let i = slots.length - 1, acc = 0; i >= 0; i--) {
    acc += slots[i].weight;
    suffixWeight[i] = acc;
  }

  for (const day of DAY_NAMES) {
    const meals: Meal[] = [];
    // cuisines used within this day — reset daily so each day is a mix, but a
    // cuisine can still recur across the week
    const dayAreas = new Set<string>();
    // protein still owed today. Whatever an earlier slot falls short by (a protein-light
    // breakfast, say) raises the bar for the slots after it, instead of the shortfall
    // just persisting to the end of the day uncorrected.
    let proteinOwed = t.proteinG;

    for (let si = 0; si < slots.length; si++) {
      const slot = slots[si];
      const targetKcal = (t.dailyCalories * slot.weight) / totalWeight;
      // this slot's share of whatever protein is still owed, spread over the slots left
      const slotProteinTarget = proteinOwed * (slot.weight / suffixWeight[si]);
      const targetProteinDensity = targetKcal > 0 ? slotProteinTarget / targetKcal : undefined;

      // fall back through the pools rather than leave a hole: a light dish scaled up
      // is still a real dish, whereas an invented one is not.
      const order =
        slot.kind === "breakfast"
          ? [pool.breakfast, pool.main, pool.light]
          : slot.kind === "light"
            ? [pool.light, pool.breakfast, pool.main]
            : [pool.main, pool.light, pool.breakfast];

      let chosen: ReturnType<typeof pick> = null;
      for (const candidates of order) {
        chosen = pick(candidates, targetKcal, usedIds, dayAreas, favored, targetProteinDensity);
        if (chosen) break;
      }
      // No real recipe fits this slot. Leave it empty and say so — never pad the day
      // with an invented meal to make the arithmetic look tidy. The protein it would
      // have carried stays "owed", pushing harder on whatever slots remain.
      if (!chosen) {
        unfilled++;
        continue;
      }

      usedIds.add(chosen.costed.recipe.id);
      if (chosen.costed.recipe.area) dayAreas.add(chosen.costed.recipe.area);
      const meal = toMeal(chosen.costed, chosen.portions);
      proteinOwed -= meal.proteinG;
      meals.push(meal);
    }

    if (meals.length === 0) {
      throw new Error("Could not fit any real recipe to your calorie targets.");
    }
    days.push({ day, meals });
    // let each day draw fresh, but allow reuse once the pool is exhausted
    if (usedIds.size > total * 0.7) usedIds.clear();
  }

  const allMeals = days.flatMap((d) => d.meals);
  const coverage =
    allMeals.reduce((s, m) => s + (m.nutritionCoverage ?? 0), 0) / allMeals.length;

  return {
    dailyCalories: t.dailyCalories,
    macros: { proteinG: t.proteinG, carbsG: t.carbsG, fatG: t.fatG },
    days,
    tips: buildTips(t, coverage),
    source: "researched",
    warning: buildWarning(unfilled, mealsPerDay, total),
    createdAt: new Date().toISOString(),
  };
}

/** Say out loud when the plan is short, and why. Silence would be a lie of omission. */
function buildWarning(
  unfilled: number,
  mealsPerDay: number,
  poolSize: number,
): string | undefined {
  if (unfilled === 0) return undefined;
  return `${unfilled} of ${mealsPerDay * DAY_NAMES.length} meal slots could not be filled from real recipes, so those days fall short of the calorie target. Only ${poolSize} recipes survived your restrictions and could be nutrition-costed.`;
}

/** Statements of fact about how this plan was computed — not authored advice. */
function buildTips(t: Targets, coverage: number): string[] {
  return [
    `Your ${t.dailyCalories.toLocaleString()} kcal target is your Mifflin-St Jeor basal rate, multiplied by your activity level and adjusted for the gap between your current and goal weight.`,
    `Protein is set at ${t.proteinG} g/day, scaled to your weight and raised when cutting or bulking to protect muscle.`,
    `Every calorie and protein figure is summed from USDA FoodData Central measurements of each ingredient — ${Math.round(
      coverage * 100,
    )}% of ingredients across this plan were matched to a USDA entry.`,
  ];
}
