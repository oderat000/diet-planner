/**
 * USDA FoodData Central — the US government's measured food composition database.
 * Every calorie and macro figure in this app traces back to here; nothing is estimated
 * by a language model.
 *
 * The SR Legacy release is bundled with the app (src/data/usda-foods.json, built by
 * scripts/build-usda-table.mjs), so lookups are local: no API key, no network, no rate
 * limit. The numbers are the same measurements the USDA API would return.
 */

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
  /** how many words the description has — fewer means a more generic entry */
  size: number;
}

interface Index {
  entries: Entry[];
  /** token -> indices of every entry whose description contains it */
  byToken: Map<string, number[]>;
}


/**
 * The table is ~812 KB and the plan pipeline runs in the browser, so it is imported
 * dynamically: the bundler splits it into its own chunk that is fetched the first time
 * an ingredient is looked up, instead of being downloaded with the page.
 *
 * The *promise* is cached rather than the result, so concurrent first callers share one
 * load rather than each starting their own.
 */
let indexPromise: Promise<Index> | null = null;

function buildIndex(rows: Row[]): Index {
  const entries: Entry[] = new Array(rows.length);
  // Inverted index: without it every lookup scanned all 7.8k descriptions, and a week's
  // plan does that once per ingredient across ~100 recipes.
  const byToken = new Map<string, number[]>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const tokens = new Set(tokenize(row.d));
    entries[i] = { row, size: tokens.size };
    for (const token of tokens) {
      const bucket = byToken.get(token);
      if (bucket) bucket.push(i);
      else byToken.set(token, [i]);
    }
  }

  return { entries, byToken };
}

async function getIndex(): Promise<Index> {
  indexPromise ??= import("@/data/usda-foods.json").then((m) =>
    buildIndex(m.default as Row[]),
  );
  return indexPromise;
}

/**
 * Match an ingredient name to a USDA entry.
 *
 * Two signals, in order: how much of the ingredient name the entry accounts for, and
 * how generic the entry is. So "chicken stock" prefers an entry naming both words over
 * a shorter chicken-only one, while bare "flour" prefers plain wheat flour over some
 * long-winded fortified variant.
 *
 * KNOWN LIMITATION — see the "known matching weakness" block in usda.test.ts. For a
 * one-word ingredient every entry containing it scores completeness 1.0, so the winner
 * is decided by `-entry.size`: the *fewest words wins*. That reliably picks a short
 * compound product over the generic whole food ("Crackers, milk" for milk, "Bread, egg"
 * for egg), attaching a real number to the wrong food.
 *
 * The problem is wider than one-word ingredients. USDA also uses category-first naming
 * ("Fish, cod, Atlantic, raw", "Nuts, almonds"), where the ingredient word is neither
 * the first nor the last token, so it loses to any shorter entry that happens to
 * contain it — "salmon" resolves to "Fish oil, salmon" at 902 kcal/100 g, and "oats"
 * to "Oil, oat" at 884.
 *
 * Positional heuristics were tried and rejected: with three competing conventions
 * (head-initial "Milk, sheep, fluid", head-final "Rice crackers", category-first
 * "Fish, cod, ...") no rule about word position reaches the ingredient in all three,
 * and each variant fixed some foods while breaking others.
 *
 * The fix that will work is a curated alias table mapping common recipe ingredient
 * names to specific fdcIds, verified per entry against FoodData Central.
 */
async function search(name: string): Promise<Nutrition | null> {
  const query = tokenize(normalizeQuery(name) || name);
  if (query.length === 0) return null;

  const { entries, byToken } = await getIndex();

  // Only entries sharing at least one token can score above zero, so gather those
  // instead of walking the whole table. Iterating the query (not a deduplicated set)
  // keeps a repeated query word counting twice, as the original scan did.
  const matches = new Map<number, number>();
  for (const token of query) {
    const bucket = byToken.get(token);
    if (!bucket) continue;
    for (const i of bucket) matches.set(i, (matches.get(i) ?? 0) + 1);
  }
  if (matches.size === 0) return null;

  let best: Row | null = null;
  let bestScore = -Infinity;
  let bestCompleteness = 0;

  // Ascending table order, so an exact score tie resolves to the same entry the
  // original full scan would have picked.
  for (const i of [...matches.keys()].sort((a, b) => a - b)) {
    const entry = entries[i];
    const completeness = matches.get(i)! / query.length;
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

  const nutrition = await search(name);
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
