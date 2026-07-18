/**
 * TheMealDB — a catalogue of real, published recipes. Each entry carries the
 * publisher's own photo, a YouTube video of it being cooked, and a link back to
 * the original source (BBC Good Food and similar).
 *
 * Free and keyless: the documented test key is "1".
 * Nothing here is generated; every field is what the publisher wrote.
 */

const BASE = "https://www.themealdb.com/api/json/v1/1";
const TIMEOUT_MS = 10_000;

export interface RecipeIngredient {
  /** ingredient name as published, e.g. "Chicken Stock" */
  name: string;
  /** measure as published, e.g. "1 L" */
  measure: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  area: string;
  instructions: string[];
  ingredients: RecipeIngredient[];
  imageUrl: string;
  videoUrl: string | null;
  sourceUrl: string | null;
}

async function get(path: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/${path}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`TheMealDB returned ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toRecipe(m: any): Recipe | null {
  if (!m?.idMeal || !m?.strMeal) return null;

  const ingredients: RecipeIngredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = (m[`strIngredient${i}`] ?? "").trim();
    const measure = (m[`strMeasure${i}`] ?? "").trim();
    if (name) ingredients.push({ name, measure });
  }
  if (ingredients.length === 0) return null;

  const instructions = String(m.strInstructions ?? "")
    .split(/\r?\n+/)
    .map((s: string) => s.replace(/^STEP\s*\d+[.:]?\s*/i, "").trim())
    .filter((s: string) => s.length > 0);

  return {
    id: String(m.idMeal),
    name: String(m.strMeal),
    category: String(m.strCategory ?? ""),
    area: String(m.strArea ?? ""),
    instructions,
    ingredients,
    imageUrl: String(m.strMealThumb ?? ""),
    videoUrl: m.strYoutube?.trim() ? String(m.strYoutube).trim() : null,
    sourceUrl: m.strSource?.trim() ? String(m.strSource).trim() : null,
  };
}

/**
 * A published recipe doesn't change, so fetch each one at most once per process.
 * Without this, every plan build and every meal swap re-downloads the same ~50 recipes.
 */
const recipeCache = new Map<string, Promise<Recipe | null>>();
const categoryCache = new Map<string, Promise<string[]>>();

/** Full recipe by id. The filter endpoints return only stubs, so this is needed per meal. */
export function getRecipe(id: string): Promise<Recipe | null> {
  let hit = recipeCache.get(id);
  if (!hit) {
    hit = (async () => {
      const data = await get(`lookup.php?i=${encodeURIComponent(id)}`);
      return toRecipe(data?.meals?.[0]);
    })();
    // a failed fetch shouldn't be remembered as "this recipe doesn't exist"
    hit.catch(() => recipeCache.delete(id));
    recipeCache.set(id, hit);
  }
  return hit;
}

/** Recipe ids in a category, e.g. "Breakfast", "Chicken", "Vegetarian". */
export function idsInCategory(category: string): Promise<string[]> {
  let hit = categoryCache.get(category);
  if (!hit) {
    hit = (async () => {
      const data = await get(`filter.php?c=${encodeURIComponent(category)}`);
      return (data?.meals ?? []).map((m: any) => String(m.idMeal));
    })();
    hit.catch(() => categoryCache.delete(category));
    categoryCache.set(category, hit);
  }
  return hit;
}

export async function categories(): Promise<string[]> {
  const data = await get("categories.php");
  return (data?.categories ?? []).map((c: any) => String(c.strCategory));
}
