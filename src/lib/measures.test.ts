import { describe, expect, it } from "vitest";
import { toGrams } from "./measures";

describe("toGrams — explicit weight and volume units", () => {
  it("reads plain metric weights", () => {
    expect(toGrams("150g", "Flour")).toEqual({ grams: 150, confidence: "exact" });
    expect(toGrams("1kg", "Beef")).toEqual({ grams: 1000, confidence: "exact" });
    expect(toGrams("200 ml", "Milk")).toEqual({ grams: 200, confidence: "exact" });
  });

  it("reads imperial weights", () => {
    expect(toGrams("1 oz", "Cheese")?.grams).toBeCloseTo(28.35, 2);
    expect(toGrams("2 lb", "Beef")?.grams).toBeCloseTo(907.2, 1);
  });

  it("reads spoon and cup measures", () => {
    expect(toGrams("2 tbsp", "Olive Oil")).toEqual({ grams: 30, confidence: "exact" });
    expect(toGrams("1 tsp", "Salt")).toEqual({ grams: 5, confidence: "exact" });
    expect(toGrams("1 cup", "Rice")).toEqual({ grams: 240, confidence: "exact" });
  });

  it("handles plural and long-form unit spellings", () => {
    expect(toGrams("3 tablespoons", "Sugar")?.grams).toBe(45);
    expect(toGrams("2 teaspoons", "Vanilla")?.grams).toBe(10);
    expect(toGrams("100 grams", "Butter")?.grams).toBe(100);
  });
});

describe("toGrams — human quantity notation", () => {
  it("parses mixed numbers", () => {
    // 1 + 1/2 = 1.5 cups
    expect(toGrams("1 1/2 cups", "Flour")?.grams).toBe(360);
  });

  it("parses bare fractions", () => {
    expect(toGrams("3/4 cup", "Milk")?.grams).toBe(180);
  });

  it("parses vulgar fraction glyphs", () => {
    expect(toGrams("½ cup", "Milk")?.grams).toBe(120);
    expect(toGrams("¼ tsp", "Salt")?.grams).toBe(1.25);
  });

  it("takes the low end of a range rather than inflating the plan", () => {
    // "2-3 cloves" must cost 2 cloves, not 3
    expect(toGrams("2-3 cloves", "Garlic")?.grams).toBe(10);
  });
});

describe("toGrams — unit-less countables", () => {
  it("weighs a count of items named by the ingredient", () => {
    expect(toGrams("2", "Eggs")).toEqual({ grams: 100, confidence: "approx" });
    expect(toGrams("1", "Onion")).toEqual({ grams: 110, confidence: "approx" });
  });

  it("finds the countable in the measure text too", () => {
    expect(toGrams("2 slices", "Bread")).toEqual({ grams: 60, confidence: "approx" });
    expect(toGrams("1 large onion", "Onion")?.grams).toBe(110);
  });

  it("defaults to one item when no quantity is written", () => {
    expect(toGrams("a pinch", "Salt")).toEqual({ grams: 0.5, confidence: "approx" });
  });

  it("marks item weights approximate, not exact", () => {
    // The honesty signal: an average egg weight is not a measurement of this egg.
    expect(toGrams("2", "Eggs")?.confidence).toBe("approx");
    expect(toGrams("100g", "Eggs")?.confidence).toBe("exact");
  });
});

describe("toGrams — refuses to guess", () => {
  it("returns null for an empty measure", () => {
    expect(toGrams("", "Salt")).toBeNull();
    expect(toGrams("   ", "Salt")).toBeNull();
  });

  it("returns null for non-quantities", () => {
    for (const m of ["to taste", "To Serve", "for garnish", "as needed", "optional"]) {
      expect(toGrams(m, "Parsley"), m).toBeNull();
    }
  });

  it("returns null for a bare number with no recognizable item", () => {
    // This is the important one: a number we can't attach to a weight must degrade
    // coverage, never silently become grams.
    expect(toGrams("3", "Mystery Ingredient")).toBeNull();
  });

  it("returns null for unrecognized free text", () => {
    expect(toGrams("some", "Flour")).toBeNull();
  });
});
