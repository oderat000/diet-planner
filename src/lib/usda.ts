/**
 * USDA FoodData Central — the US government's measured food composition database.
 * Every calorie and macro figure in this app traces back to here; nothing is estimated
 * by a language model.
 *
 * The SR Legacy release is bundled with the app (src/data/usda-foods.json, built by
 * scripts/build-usda-table.mjs), so lookups are local: no API key, no network, no rate
 * limit. The numbers are the same measurements the USDA API would return.
 */

import table from "@/data/usda-foods.json";

/** One USDA food, per 100 g. Keys are short because 7.8k of them ship to the server. */
interface Row {
  /** description as USDA publishes it, e.g. "Onions, raw" */
  d: string;
  /** FoodData Central id, so the figure stays traceable */
  i: number;
  k: number;
  p: number;
  c: number;
  f: number;
}

export interface Nutrition {
  /** per 100 g */
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** the USDA entry these numbers came from, so the figure is traceable */
  fdcDescription: string;
  fdcId: number;
}

/** Ingredient name -> nutrition. `null` means USDA had no usable match. */
const cache = new Map<string, Nutrition | null>();

/** Recipe ingredient names carry prep words USDA doesn't index. Strip them. */
function normalizeQuery(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(fresh|freshly|chopped|diced|minced|sliced|grated|ground|whole|large|small|medium|boneless|skinless|free[- ]range|organic|plain|raw|cooked)\b/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Crude singularisation is enough here: "onions" and "onion" must land together. */
function singular(word: string): string {
  return word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(singular);
}

interface Entry {
  row: Row;
  tokens: Set<string>;
  /** how many words the description has — fewer means a more generic entry */
  size: number;
}

let index: Entry[] | null = null;

function getIndex(): Entry[] {
  if (!index) {
    index = (table as Row[]).map((row) => {
      const tokens = new Set(tokenize(row.d));
      return { row, tokens, size: tokens.size };
    });
  }
  return index;
}

/**
 * Match an ingredient name to a USDA entry.
 *
 * Two signals, in order: how much of the ingredient name the entry accounts for, and
 * how generic the entry is. So "chicken stock" prefers an entry naming both words over
 * a shorter chicken-only one, while bare "flour" prefers plain wheat flour over some
 * long-winded fortified variant.
 */
function search(name: string): Nutrition | null {
  const query = tokenize(normalizeQuery(name) || name);
  if (query.length === 0) return null;

  let best: Row | null = null;
  let bestScore = -Infinity;
  let bestCompleteness = 0;

  for (const entry of getIndex()) {
    let matched = 0;
    for (const token of query) if (entry.tokens.has(token)) matched++;
    if (matched === 0) continue;

    const completeness = matched / query.length;
    // completeness dominates; description length only breaks ties between equal matches
    const score = completeness * 100 - entry.size;
    if (score > bestScore) {
      bestScore = score;
      best = entry.row;
      bestCompleteness = completeness;
    }
  }

  // A single weak word overlap is a guess, not a match. Say we don't know instead —
  // the recipe will be dropped for poor coverage rather than given invented numbers.
  if (!best || bestCompleteness < 0.5) return null;

  return {
    kcal: best.k,
    proteinG: best.p,
    carbsG: best.c,
    fatG: best.f,
    fdcDescription: best.d,
    fdcId: best.i,
  };
}

export async function lookupIngredient(name: string): Promise<Nutrition | null> {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  const nutrition = search(name);
  cache.set(key, nutrition);
  return nutrition;
}

/** Look several ingredients up at once. Local now, so this is just a convenience. */
export async function lookupAll(names: string[]): Promise<Map<string, Nutrition | null>> {
  const unique = [...new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean))];
  const out = new Map<string, Nutrition | null>();
  for (const name of unique) {
    out.set(name, await lookupIngredient(name));
  }
  return out;
}
