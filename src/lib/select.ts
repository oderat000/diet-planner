/**
 * Choosing which real recipes make up the week.
 *
 * This is pure algorithm over researched data: filter the catalogue by the user's
 * constraints, cost each candidate against USDA, then fit portions to the calorie
 * slots computed from the Mifflin-St Jeor equation. Nothing is authored here.
 */

import { Recipe, getRecipe, idsInCategory } from "./mealdb";
import { CostedRecipe, costRecipes, isUsable, portionFor } from "./nutrition";
import { Profile } from "./types";

/** TheMealDB's own categories. Dessert is excluded from meal planning. */
const BREAKFAST_CATEGORIES = ["Breakfast"];
const MAIN_CATEGORIES = ["Chicken", "Beef", "Seafood", "Pasta", "Pork", "Lamb", "Vegetarian", "Miscellaneous"];
const VEG_CATEGORIES = ["Vegetarian", "Vegan"];
const LIGHT_CATEGORIES = ["Side", "Starter"];

const MEAT_TOKENS = [
  "beef", "pork", "chicken", "lamb", "bacon", "ham", "sausage", "prawn", "shrimp",
  "fish", "salmon", "tuna", "anchov", "cod", "duck", "turkey", "veal", "goat",
  "gelatin", "lard", "chorizo", "pepperoni", "mince",
];

/** How many candidates to pull. Enough for a varied week without hammering the APIs. */
const POOL_SIZE = 34;

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function wantsVegetarian(p: Profile): boolean {
  return /vegetarian|vegan|plant-based|no meat/i.test(p.preferences ?? "");
}

/** Split "peanuts, lactose" into tokens we can match against ingredient names. */
export function excludedTokens(p: Profile): string[] {
  return (p.allergies ?? "")
    .toLowerCase()
    .split(/[,;/]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
}

/** A recipe is rejected if any ingredient matches an excluded token. Conservative by design. */
export function isSafe(recipe: Recipe, tokens: string[], vegetarian: boolean): boolean {
  const names = recipe.ingredients.map((i) => i.name.toLowerCase());
  const haystack = `${recipe.name} ${names.join(" ")}`.toLowerCase();

  if (tokens.some((t) => haystack.includes(t))) return false;
  if (vegetarian && MEAT_TOKENS.some((t) => haystack.includes(t))) return false;
  return true;
}

async function idsFor(categories: string[]): Promise<string[]> {
  const lists = await Promise.all(
    categories.map((c) => idsInCategory(c).catch(() => [] as string[])),
  );
  return [...new Set(lists.flat())];
}

export interface CandidatePool {
  breakfast: CostedRecipe[];
  main: CostedRecipe[];
  light: CostedRecipe[];
}

/**
 * Costing a pool is expensive (dozens of recipes, hundreds of USDA lookups), and the
 * result only depends on the user's dietary constraints — not on which meal they are
 * swapping. Reuse it, or a single reroll pays for a whole week's research.
 */
interface PoolEntry {
  pool: CandidatePool;
  at: number;
}
const poolCache = new Map<string, PoolEntry>();
const POOL_TTL_MS = 30 * 60_000;
/** Below this the pool is degraded (usually USDA rate limiting) — don't cache the failure. */
const MIN_HEALTHY_POOL = 8;

function poolKey(p: Profile): string {
  return JSON.stringify({
    veg: wantsVegetarian(p),
    tokens: excludedTokens(p).sort(),
  });
}

function poolSize(pool: CandidatePool): number {
  return pool.breakfast.length + pool.main.length + pool.light.length;
}

export async function buildPool(p: Profile): Promise<CandidatePool> {
  const key = poolKey(p);
  const hit = poolCache.get(key);
  if (hit && Date.now() - hit.at < POOL_TTL_MS) return hit.pool;

  const pool = await researchPool(p);
  // Only remember a pool that actually came back healthy, so a transient rate limit
  // doesn't pin an empty catalogue in place for half an hour.
  if (poolSize(pool) >= MIN_HEALTHY_POOL) {
    poolCache.set(key, { pool, at: Date.now() });
  }
  return pool;
}

/**
 * Fetch and cost a pool of real recipes that satisfy the user's constraints.
 * Recipes we cannot honestly nutrition-cost are dropped rather than guessed at.
 */
async function researchPool(p: Profile): Promise<CandidatePool> {
  const vegetarian = wantsVegetarian(p);
  const tokens = excludedTokens(p);

  const mainCats = vegetarian ? VEG_CATEGORIES : MAIN_CATEGORIES;
  const [breakfastIds, mainIds, lightIds] = await Promise.all([
    idsFor(BREAKFAST_CATEGORIES),
    idsFor(mainCats),
    idsFor(LIGHT_CATEGORIES),
  ]);

  // take a random slice so repeat generations don't produce the same week
  const wanted = [
    ...shuffle(breakfastIds).slice(0, 10),
    ...shuffle(mainIds).slice(0, POOL_SIZE),
    ...shuffle(lightIds).slice(0, 12),
  ];

  const recipes = (
    await Promise.all([...new Set(wanted)].map((id) => getRecipe(id).catch(() => null)))
  ).filter((r): r is Recipe => r !== null && isSafe(r, tokens, vegetarian));

  const costed = (await costRecipes(recipes)).filter(isUsable);

  const inCats = (c: CostedRecipe, cats: string[]) => cats.includes(c.recipe.category);
  return {
    breakfast: costed.filter((c) => inCats(c, BREAKFAST_CATEGORIES)),
    main: costed.filter((c) => inCats(c, mainCats)),
    light: costed.filter((c) => inCats(c, LIGHT_CATEGORIES)),
  };
}

/**
 * Pick the recipe whose portion lands closest to the calorie slot, preferring ones
 * we haven't used recently so a week doesn't repeat the same dish.
 */
export function pick(
  candidates: CostedRecipe[],
  targetKcal: number,
  usedIds: Set<string>,
): { costed: CostedRecipe; portions: number } | null {
  const options: { costed: CostedRecipe; portions: number; penalty: number }[] = [];

  for (const c of candidates) {
    const portions = portionFor(c, targetKcal);
    if (portions === null) continue;
    // prefer a portion near one serving — a recipe you eat 2.4x of is a stretch
    const stretch = Math.abs(portions - 1);
    const reuse = usedIds.has(c.recipe.id) ? 10 : 0;
    options.push({ costed: c, portions, penalty: stretch + reuse });
  }

  if (options.length === 0) return null;
  options.sort((a, b) => a.penalty - b.penalty);
  // a little randomness among the good fits, so the week isn't identical every time
  const top = options.slice(0, Math.min(5, options.length));
  const chosen = top[Math.floor(Math.random() * top.length)];
  return { costed: chosen.costed, portions: chosen.portions };
}
