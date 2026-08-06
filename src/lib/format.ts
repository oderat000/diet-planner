/**
 * Display formatting for quantities.
 *
 * This lived twice — privately in nutrition.ts and exported from grocery.ts — with
 * *different* rounding: the grocery copy had no sub-10 g branch, so a 0.5 g pinch
 * printed as "0 g". One definition, and it keeps the precise behaviour.
 */

export function formatGrams(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(1)} kg`;
  // Below 10 g a whole number loses the quantity entirely — spices and seasonings
  // routinely land here, and "0 g salt" reads as an error rather than a small amount.
  if (g >= 10) return `${Math.round(g)} g`;
  return `${g.toFixed(1)} g`;
}
