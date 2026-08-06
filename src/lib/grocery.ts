/**
 * The week's shopping, summed from the plan.
 *
 * Pure arithmetic over the researched recipes: every gram here is a quantity a
 * publisher wrote, scaled to the user's portion. Ingredients whose measure was too
 * vague to weigh ("a splash", "to taste") are listed with the publisher's own wording
 * rather than given an invented weight.
 */

import { DietPlan } from "./types";

export interface GroceryItem {
  name: string;
  /** total grams across the week; null when nothing about it could be weighed */
  grams: number | null;
  /** how many meals in the week use it */
  meals: number;
  /** publisher measures for the portions we could not weigh */
  measures: string[];
}

/**
 * Publishers write the same ingredient both ways — "Bay Leaf" in one recipe, "Bay Leaves"
 * in the next. On a shopping list those are one line, not two, so group on a singularised
 * key while still showing the wording the recipe used.
 */
function singularWord(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ves")) return `${word.slice(0, -3)}f`;
  if (/(oes|ses|xes|ches|shes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function groupKey(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(singularWord)
    .join(" ");
}

export function buildGroceryList(plan: DietPlan): GroceryItem[] {
  const byName = new Map<string, GroceryItem>();

  for (const day of plan.days) {
    for (const meal of day.meals) {
      // legacy meals carry only a flat string list with no weights, so nothing to sum
      if (meal.dataSource !== "researched") continue;
      for (const ing of meal.mealIngredients) {
        const name = ing.name.trim();
        const key = groupKey(name);
        if (!key) continue;

        let item = byName.get(key);
        if (!item) {
          item = { name, grams: null, meals: 0, measures: [] };
          byName.set(key, item);
        }

        item.meals += 1;
        if (typeof ing.grams === "number") {
          item.grams = (item.grams ?? 0) + ing.grams;
        } else if (ing.measure.trim()) {
          item.measures.push(ing.measure.trim());
        }
      }
    }
  }

  return [...byName.values()]
    .map((item) => ({
      ...item,
      grams: item.grams === null ? null : Math.round(item.grams),
      // "2 tbsp" three times is worth saying once
      measures: [...new Set(item.measures)],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
