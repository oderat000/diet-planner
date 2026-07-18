import { NextResponse } from "next/server";
import { DAY_NAMES, clampMeals, computeTargets } from "@/lib/plan";
import { toMeal } from "@/lib/nutrition";
import { buildPool, pick } from "@/lib/select";
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
  const days: DayPlan[] = [];
  let unfilled = 0;

  for (const day of DAY_NAMES) {
    const meals: Meal[] = [];

    for (const slot of slots) {
      const targetKcal = (t.dailyCalories * slot.weight) / totalWeight;

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
        chosen = pick(candidates, targetKcal, usedIds);
        if (chosen) break;
      }
      // No real recipe fits this slot. Leave it empty and say so — never pad the day
      // with an invented meal to make the arithmetic look tidy.
      if (!chosen) {
        unfilled++;
        continue;
      }

      usedIds.add(chosen.costed.recipe.id);
      meals.push(toMeal(chosen.costed, chosen.portions));
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
    `Protein is set at 1.6 g per kg of your goal weight (${t.proteinG} g/day).`,
    `Every calorie and protein figure is summed from USDA FoodData Central measurements of each ingredient — ${Math.round(
      coverage * 100,
    )}% of ingredients across this plan were matched to a USDA entry.`,
  ];
}
