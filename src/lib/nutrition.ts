/**
 * Turns a published recipe into real numbers.
 *
 * The arithmetic is the only thing this app "creates": for each ingredient we take
 * the published quantity, convert it to grams, multiply by USDA's measured per-100g
 * composition, and sum. No model is asked what a meal contains.
 */

import { formatGrams } from "./format";
import { Recipe } from "./mealdb";
import { toGrams } from "./measures";
import { Nutrition, lookupAll } from "./usda";
import { Macros, MealIngredient, ResearchedMeal } from "./types";

/**
 * TheMealDB doesn't publish serving counts. Its recipes are overwhelmingly
 * family-sized, and 4 is the standard assumption for a published main course.
 * We surface the portion multiplier in the UI so the user can see the scaling
 * rather than having it hidden in a constant.
 */
export const ASSUMED_SERVINGS = 4;

/** How far a portion may be scaled to hit a calorie slot before we reject the recipe. */
const MIN_PORTION = 0.5;
const MAX_PORTION = 2.5;

export interface CostedRecipe {
  recipe: Recipe;
  /** nutrition of one serving (whole recipe / ASSUMED_SERVINGS) */
  perServing: Macros;
  /** grams of each ingredient in the whole recipe, null where unresolvable */
  grams: (number | null)[];
  /** share of the recipe's energy we could trace to a USDA entry, 0..1 */
  coverage: number;
}

function empty(): Macros {
  return { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
}

function addScaled(into: Macros, n: Nutrition, grams: number): void {
  const f = grams / 100;
  into.kcal += n.kcal * f;
  into.proteinG += n.proteinG * f;
  into.carbsG += n.carbsG * f;
  into.fatG += n.fatG * f;
}

/**
 * Cost a batch of recipes against USDA. Batched deliberately: ingredient names
 * repeat heavily across recipes, and the shared cache means a week's plan costs
 * far fewer API calls than (recipes x ingredients).
 */
export async function costRecipes(recipes: Recipe[]): Promise<CostedRecipe[]> {
  const allNames = recipes.flatMap((r) => r.ingredients.map((i) => i.name));
  const table = await lookupAll(allNames);

  return recipes.map((recipe) => {
    const total = empty();
    const grams: (number | null)[] = [];
    let resolved = 0;

    for (const ing of recipe.ingredients) {
      const parsed = toGrams(ing.measure, ing.name);
      const nutrition = table.get(ing.name.trim().toLowerCase()) ?? null;

      if (parsed && nutrition) {
        addScaled(total, nutrition, parsed.grams);
        grams.push(parsed.grams);
        resolved++;
      } else {
        grams.push(parsed ? parsed.grams : null);
      }
    }

    const coverage = recipe.ingredients.length ? resolved / recipe.ingredients.length : 0;
    const perServing: Macros = {
      kcal: total.kcal / ASSUMED_SERVINGS,
      proteinG: total.proteinG / ASSUMED_SERVINGS,
      carbsG: total.carbsG / ASSUMED_SERVINGS,
      fatG: total.fatG / ASSUMED_SERVINGS,
    };

    return { recipe, perServing, grams, coverage };
  });
}

/** Recipes we can't honestly put a number on are not offered at all. */
export function isUsable(c: CostedRecipe): boolean {
  return c.coverage >= 0.6 && c.perServing.kcal >= 80;
}

/** The portion of this recipe that lands closest to a calorie slot. */
export function portionFor(c: CostedRecipe, targetKcal: number): number | null {
  if (c.perServing.kcal <= 0) return null;
  const raw = targetKcal / c.perServing.kcal;
  if (raw < MIN_PORTION || raw > MAX_PORTION) return null;
  return Math.round(raw * 10) / 10;
}

/** Build the meal we actually show, with quantities scaled to the user's portion. */
export function toMeal(c: CostedRecipe, portions: number): ResearchedMeal {
  const { recipe, perServing, grams } = c;
  // whole recipe feeds ASSUMED_SERVINGS; the user eats `portions` of those servings
  const scale = portions / ASSUMED_SERVINGS;

  const ingredients: MealIngredient[] = recipe.ingredients.map((ing, i) => {
    const g = grams[i];
    return {
      name: ing.name,
      // keep the publisher's own wording, and add the scaled weight when we know it
      measure: ing.measure,
      grams: g === null ? null : Math.round(g * scale * 10) / 10,
      display:
        g === null
          ? `${ing.measure} ${ing.name}`.trim()
          : `${formatGrams(g * scale)} ${ing.name}`,
    };
  });

  return {
    name: recipe.name,
    description: [recipe.area, recipe.category].filter(Boolean).join(" · "),
    origin: recipe.area || undefined,
    category: recipe.category || undefined,
    calories: Math.round(perServing.kcal * portions),
    proteinG: Math.round(perServing.proteinG * portions),
    carbsG: Math.round(perServing.carbsG * portions),
    fatG: Math.round(perServing.fatG * portions),
    mealIngredients: ingredients,
    steps: recipe.instructions,
    imageUrl: recipe.imageUrl,
    videoUrl: recipe.videoUrl,
    sourceUrl: recipe.sourceUrl,
    portions,
    nutritionCoverage: Math.round(c.coverage * 100) / 100,
    dataSource: "researched",
  };
}
