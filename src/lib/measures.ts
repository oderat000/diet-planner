/**
 * Published recipes write quantities for humans ("1 1/2 cups", "150g", "a pinch").
 * USDA reports nutrition per 100 g. This module bridges the two.
 *
 * Everything here is deliberately conservative: if a measure can't be resolved to
 * a real weight, we return null rather than guess. An unresolved ingredient is
 * reported as missing coverage, never silently invented.
 */

/** Grams per unit. Volume units assume a water-like density (~1 g/ml). */
const UNIT_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  litre: 1000,
  liter: 1000,
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  tbs: 15,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  cup: 240,
  cups: 240,
  oz: 28.35,
  ounce: 28.35,
  ounces: 28.35,
  lb: 453.6,
  lbs: 453.6,
  pound: 453.6,
  pounds: 453.6,
};

/**
 * Countable items with no unit ("2 eggs", "1 onion"). Typical edible weights.
 * These are approximations of real average weights, not invented numbers, but
 * they're the fuzziest part of the pipeline — hence tracked as lower confidence.
 */
const ITEM_GRAMS: Record<string, number> = {
  egg: 50,
  eggs: 50,
  onion: 110,
  onions: 110,
  clove: 5,
  cloves: 5,
  garlic: 5,
  tomato: 120,
  tomatoes: 120,
  potato: 150,
  potatoes: 150,
  carrot: 60,
  carrots: 60,
  apple: 180,
  banana: 120,
  lemon: 60,
  lime: 45,
  pepper: 120,
  peppers: 120,
  courgette: 200,
  zucchini: 200,
  aubergine: 250,
  slice: 30,
  slices: 30,
  rasher: 25,
  rashers: 25,
  fillet: 150,
  fillets: 150,
  breast: 170,
  breasts: 170,
  can: 400,
  cans: 400,
  tin: 400,
  tins: 400,
  sprig: 2,
  sprigs: 2,
  handful: 30,
  pinch: 0.5,
  dash: 1,
  splash: 5,
};

const VULGAR: Record<string, number> = {
  "½": 0.5,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 0.25,
  "¾": 0.75,
  "⅛": 0.125,
};

/** "1 1/2", "1/2", "½", "1.5", "1½" -> number. Returns null if there's no quantity. */
function parseQuantity(s: string): number | null {
  let total = 0;
  let found = false;

  for (const [glyph, value] of Object.entries(VULGAR)) {
    if (s.includes(glyph)) {
      total += value;
      found = true;
      s = s.replace(glyph, " ");
    }
  }

  // mixed number and fractions: "1 1/2" or "3/4"
  const frac = s.match(/(\d+)\s*\/\s*(\d+)/);
  if (frac) {
    total += Number(frac[1]) / Number(frac[2]);
    found = true;
    s = s.replace(frac[0], " ");
  }

  // ranges ("2-3 cloves") -> take the low end rather than inflate the plan
  const nums = s.match(/\d+(?:\.\d+)?/g);
  if (nums) {
    total += Number(nums[0]);
    found = true;
  }

  return found ? total : null;
}

export interface ParsedMeasure {
  grams: number;
  /** how sure we are: an explicit weight is exact, a "handful" is not */
  confidence: "exact" | "approx";
}

/**
 * Resolve a recipe measure to grams.
 * @param measure the published text, e.g. "150g" or "2 tbsp"
 * @param ingredient the ingredient name, used when the measure has no unit ("2" + "Eggs")
 */
export function toGrams(measure: string, ingredient: string): ParsedMeasure | null {
  const raw = (measure ?? "").trim().toLowerCase();
  const ing = (ingredient ?? "").trim().toLowerCase();
  if (!raw) return null;

  // "to taste", "garnish", "as needed" contribute no meaningful energy
  if (/to taste|to serve|garnish|as needed|optional/.test(raw)) return null;

  const qty = parseQuantity(raw);

  // explicit weight or volume unit anywhere in the string: "150g", "1 1/2 cups"
  const unitMatch = raw.match(
    /(kg|g|grams?|ml|l|litre|liter|tbsp|tbs|tablespoons?|tsp|teaspoons?|cups?|oz|ounces?|lbs?|pounds?)\b/,
  );
  if (unitMatch && qty !== null) {
    const grams = qty * UNIT_GRAMS[unitMatch[1]];
    return { grams, confidence: "exact" };
  }

  // unit-less countables: the quantity is in the measure, the item is the ingredient
  const words = [...raw.split(/\s+/), ...ing.split(/\s+/)];
  for (const w of words) {
    const clean = w.replace(/[^a-z]/g, "");
    if (clean in ITEM_GRAMS) {
      return { grams: (qty ?? 1) * ITEM_GRAMS[clean], confidence: "approx" };
    }
  }

  // a bare number with no recognizable unit: too vague to weigh honestly
  return null;
}
