import { describe, expect, it } from "vitest";
import { lookupAll, lookupIngredient } from "./usda";

/**
 * Asserted against the bundled SR Legacy table (src/data/usda-foods.json). Values are
 * USDA's own published figures per 100 g, so these tests double as a check that the
 * table itself hasn't been rebuilt into a different shape.
 */

describe("lookupIngredient — matching", () => {
  it("resolves a plain ingredient to the generic USDA entry", async () => {
    const onion = await lookupIngredient("Onions");
    expect(onion).not.toBeNull();
    expect(onion!.fdcId).toBe(170000);
    expect(onion!.fdcDescription).toBe("Onions, raw");
    expect(onion!.kcal).toBe(40);
  });

  it("strips preparation words before matching", async () => {
    // "freshly chopped onions" must land on the same entry as "onions" — USDA does not
    // index prep verbs, so leaving them in wrecks the token overlap score.
    const plain = await lookupIngredient("Onions");
    const prepped = await lookupIngredient("freshly chopped onions");
    expect(prepped?.fdcId).toBe(plain?.fdcId);
  });

  it("is case- and whitespace-insensitive", async () => {
    const a = await lookupIngredient("  GARLIC  ");
    const b = await lookupIngredient("garlic");
    expect(a?.fdcId).toBe(b?.fdcId);
    expect(a?.fdcId).toBe(169230);
  });

  it("prefers an entry naming every query word over a partial one", async () => {
    // "chicken stock" should reach the stock entry, not a bare chicken entry.
    const stock = await lookupIngredient("chicken stock");
    expect(stock?.fdcDescription.toLowerCase()).toContain("stock");
    expect(stock?.fdcDescription.toLowerCase()).toContain("chicken");
  });

  it("carries traceable provenance on every hit", async () => {
    const butter = await lookupIngredient("Butter");
    expect(butter).not.toBeNull();
    // Every figure the app displays must be traceable back to a real USDA record.
    expect(butter!.fdcId).toBeGreaterThan(0);
    expect(butter!.fdcDescription.length).toBeGreaterThan(0);
    expect(butter!.kcal).toBe(717);
    expect(butter!.fatG).toBeCloseTo(81.1, 1);
  });
});

describe("lookupIngredient — refuses to guess", () => {
  it("returns null when nothing matches", async () => {
    expect(await lookupIngredient("Zbxq Nonsense Ingredient")).toBeNull();
  });

  it("returns null for empty input", async () => {
    expect(await lookupIngredient("")).toBeNull();
    expect(await lookupIngredient("   ")).toBeNull();
  });

  it("rejects a weak single-word overlap rather than returning a wrong food", async () => {
    // The core invariant: below 0.5 completeness we say we don't know, so the recipe is
    // dropped for poor coverage instead of being given invented numbers.
    // "chocolate strawberry cheesecake sandwich" shares at most one token with any entry.
    const weak = await lookupIngredient("zzz chocolate zzz zzz zzz zzz");
    expect(weak).toBeNull();
  });
});

describe("lookupAll", () => {
  it("keys results by the normalized ingredient name", async () => {
    const table = await lookupAll(["Onions", "  GARLIC ", "Butter"]);
    expect(table.get("onions")?.fdcId).toBe(170000);
    expect(table.get("garlic")?.fdcId).toBe(169230);
    expect(table.get("butter")).not.toBeNull();
  });

  it("deduplicates repeated names", async () => {
    const table = await lookupAll(["Onions", "onions", "ONIONS"]);
    expect(table.size).toBe(1);
  });

  it("records misses as null instead of omitting them", async () => {
    const table = await lookupAll(["Onions", "Zbxq Nonsense Ingredient"]);
    expect(table.has("zbxq nonsense ingredient")).toBe(true);
    expect(table.get("zbxq nonsense ingredient")).toBeNull();
  });

  it("ignores blank names", async () => {
    const table = await lookupAll(["Onions", "", "   "]);
    expect(table.size).toBe(1);
  });
});

describe("known matching weakness — shortest-description tie-break", () => {
  /**
   * When a one-word ingredient matches many entries, completeness is 1.0 for all of
   * them, so the tie-break is `-entry.size` — the *fewest words wins*. That reliably
   * picks a short compound product over the generic whole food, and the resulting
   * calories are wrong by a wide margin.
   *
   * These use `it.fails()`: they assert the behaviour we want and are expected to fail
   * today. When the scoring is fixed they will report "expected to fail but passed",
   * which is the signal to convert them into ordinary `it()` tests.
   */

  it.fails("should resolve 'Milk' to a milk, not to milk crackers", async () => {
    const milk = await lookupIngredient("Milk");
    // currently: "Crackers, milk" at 446 kcal/100 g — roughly 7x real milk
    expect(milk!.fdcDescription.toLowerCase()).toMatch(/^milk/);
    expect(milk!.kcal).toBeLessThan(120);
  });

  it.fails("should resolve 'Egg' to an egg, not to egg bread", async () => {
    const egg = await lookupIngredient("Egg");
    // currently: "Bread, egg" at 287 kcal/100 g — a whole egg is ~143
    expect(egg!.fdcDescription.toLowerCase()).toMatch(/^egg/);
  });

  it.fails("should resolve 'Plain Flour' to wheat flour, not potato flour", async () => {
    const flour = await lookupIngredient("Plain Flour");
    // currently: "Potato flour" — a different food with a different macro profile
    expect(flour!.fdcDescription.toLowerCase()).toContain("wheat");
  });
});
