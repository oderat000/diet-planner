import { NextResponse } from "next/server";
import { toMeal } from "@/lib/nutrition";
import { buildPool, pick } from "@/lib/select";
import { Meal, Profile } from "@/lib/types";

/**
 * Swap one meal for another real one. Same pipeline as full plan generation:
 * real published recipes, costed against USDA, fitted to the slot's calorie target.
 */
interface RerollBody {
  profile: Pick<Profile, "preferences" | "allergies" | "healthNotes">;
  target: { calories: number; proteinG: number };
  exclude?: string;
  /** meals already shown this session — keep suggesting something new */
  avoid?: string[];
}

export async function POST(req: Request) {
  const body = (await req.json()) as RerollBody;
  try {
    const { meal, poolSize } = await findMeal(body);
    if (!meal) {
      return NextResponse.json({ error: noMealReason(poolSize) }, { status: 404 });
    }
    return NextResponse.json(meal);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not find an alternative";
    console.warn("Reroll failed:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/**
 * An empty pool and a genuinely bad fit are different failures. Saying "no recipe fits"
 * when the truth is "nothing survived your restrictions" would be a lie of omission.
 */
function noMealReason(poolSize: number): string {
  if (poolSize === 0) {
    return "No real recipes survived your preferences and allergies. Try relaxing them — we won't invent one to fill the gap.";
  }
  return "No other real recipe fits that calorie slot within your restrictions. We won't invent one to fill the gap.";
}

async function findMeal(b: RerollBody): Promise<{ meal: Meal | null; poolSize: number }> {
  // buildPool only reads preferences/allergies; the rest of the profile is irrelevant here
  const pool = await buildPool(b.profile as Profile);
  const candidates = [...pool.main, ...pool.breakfast, ...pool.light];

  const shown = new Set(
    [b.exclude, ...(b.avoid ?? [])].filter(Boolean).map((n) => (n as string).toLowerCase()),
  );
  const fresh = candidates.filter((c) => !shown.has(c.recipe.name.toLowerCase()));

  // match this one meal's own protein-per-calorie ask, not just its calories
  const targetProteinDensity = b.target.calories > 0 ? b.target.proteinG / b.target.calories : undefined;
  const chosen = pick(
    fresh.length ? fresh : candidates,
    b.target.calories,
    new Set(),
    undefined,
    undefined,
    targetProteinDensity,
  );
  return {
    meal: chosen ? toMeal(chosen.costed, chosen.portions) : null,
    poolSize: candidates.length,
  };
}
