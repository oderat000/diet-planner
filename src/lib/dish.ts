/**
 * Cost an arbitrary dish — one the user cooked — against USDA.
 *
 * The ingredient list may come from Gemini (recognising a photo) or from the user's own
 * typed text. Either way, the *numbers* here are USDA's: for each ingredient we scale its
 * measured per-100g nutrition by the grams and sum. The AI never supplies a calorie figure.
 */

import { lookupIngredient } from "./usda";
import { toGrams } from "./measures";

export interface DishIngredientInput {
  name: string;
  /** estimated grams — from the AI (photo) or the user (text) */
  grams: number;
}

export interface CostedIngredient {
  name: string;
  grams: number;
  /** true when USDA had a match and these numbers are real */
  matched: boolean;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** the USDA entry used, for traceability */
  fdcDescription?: string;
}

export interface DishNutrition {
  ingredients: CostedIngredient[];
  totals: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  /** share of ingredients matched to USDA, 0..1 */
  coverage: number;
}

export async function costDish(inputs: DishIngredientInput[]): Promise<DishNutrition> {
  const ingredients: CostedIngredient[] = [];
  const totals = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  let matchedCount = 0;

  for (const input of inputs) {
    const grams = Math.max(0, Number(input.grams) || 0);
    const n = await lookupIngredient(input.name);
    if (n) {
      const f = grams / 100;
      const costed: CostedIngredient = {
        name: input.name,
        grams,
        matched: true,
        kcal: Math.round(n.kcal * f),
        proteinG: Math.round(n.proteinG * f * 10) / 10,
        carbsG: Math.round(n.carbsG * f * 10) / 10,
        fatG: Math.round(n.fatG * f * 10) / 10,
        fdcDescription: n.fdcDescription,
      };
      ingredients.push(costed);
      totals.kcal += costed.kcal;
      totals.proteinG += costed.proteinG;
      totals.carbsG += costed.carbsG;
      totals.fatG += costed.fatG;
      matchedCount++;
    } else {
      // Unknown to USDA — keep it visible but contribute no invented numbers.
      ingredients.push({
        name: input.name,
        grams,
        matched: false,
        kcal: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
      });
    }
  }

  return {
    ingredients,
    totals: {
      kcal: Math.round(totals.kcal),
      proteinG: Math.round(totals.proteinG),
      carbsG: Math.round(totals.carbsG),
      fatG: Math.round(totals.fatG),
    },
    coverage: inputs.length ? matchedCount / inputs.length : 0,
  };
}

/**
 * Keyless fallback: parse typed lines like "200g chicken breast" or "2 eggs" into
 * {name, grams} with no AI at all. Lets the text calculator work even without a Gemini key.
 * Returns null when a line has no resolvable quantity, so the caller can fall back to AI.
 */
export function parseIngredientLines(text: string): DishIngredientInput[] | null {
  const lines = text
    .split(/[\n,;]+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  const out: DishIngredientInput[] = [];
  for (const line of lines) {
    // split a leading measure from the ingredient name: "200g chicken" -> "200g" + "chicken"
    const m = line.match(/^([\d.,/\s]*(?:g|kg|ml|l|oz|lb|cup|cups|tbsp|tsp|x)?\s*)?(.+)$/i);
    const measurePart = (m?.[1] ?? "").trim();
    const namePart = (m?.[2] ?? line).trim();
    const parsed = toGrams(measurePart || namePart, namePart);
    if (!parsed) return null; // a line we can't weigh → let the AI handle the whole thing
    out.push({ name: namePart, grams: parsed.grams });
  }
  return out;
}
