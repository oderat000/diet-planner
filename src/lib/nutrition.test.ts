import { describe, expect, it } from "vitest";
import { ASSUMED_SERVINGS, costRecipes, isUsable, portionFor, toMeal } from "./nutrition";
import type { CostedRecipe } from "./nutrition";
import type { Recipe } from "./mealdb";

function recipe(over: Partial<Recipe> = {}): Recipe {
  return {
    id: "1",
    name: "Test Dish",
    category: "Misc",
    area: "Test",
    instructions: ["Cook it."],
    ingredients: [],
    imageUrl: "",
    videoUrl: null,
    sourceUrl: null,
    tags: [],
    ...over,
  } as Recipe;
}

function costed(over: Partial<CostedRecipe> = {}): CostedRecipe {
  return {
    recipe: recipe(),
    perServing: { kcal: 500, proteinG: 30, carbsG: 50, fatG: 20 },
    grams: [],
    coverage: 1,
    ...over,
  };
}

describe("costRecipes — USDA arithmetic", () => {
  it("multiplies grams by the per-100g figure and divides by servings", async () => {
    // Butter is 717 kcal / 100 g. 100 g of it = 717 kcal for the whole recipe.
    const [c] = await costRecipes([
      recipe({ ingredients: [{ name: "Butter", measure: "100g" }] }),
    ]);
    expect(c.coverage).toBe(1);
    expect(c.grams).toEqual([100]);
    expect(c.perServing.kcal).toBeCloseTo(717 / ASSUMED_SERVINGS, 1);
  });

  it("sums across ingredients", async () => {
    const [c] = await costRecipes([
      recipe({
        ingredients: [
          { name: "Butter", measure: "100g" }, // 717 kcal
          { name: "Onions", measure: "100g" }, //  40 kcal
        ],
      }),
    ]);
    expect(c.perServing.kcal).toBeCloseTo((717 + 40) / ASSUMED_SERVINGS, 1);
  });

  it("scales linearly with quantity", async () => {
    const [half] = await costRecipes([
      recipe({ ingredients: [{ name: "Butter", measure: "50g" }] }),
    ]);
    const [full] = await costRecipes([
      recipe({ ingredients: [{ name: "Butter", measure: "100g" }] }),
    ]);
    expect(full.perServing.kcal).toBeCloseTo(half.perServing.kcal * 2, 4);
  });

  it("degrades coverage when an ingredient cannot be resolved, contributing no energy", async () => {
    const [c] = await costRecipes([
      recipe({
        ingredients: [
          { name: "Butter", measure: "100g" },
          { name: "Zbxq Nonsense Ingredient", measure: "100g" },
        ],
      }),
    ]);
    // Half the ingredients resolved...
    expect(c.coverage).toBe(0.5);
    // ...and the unresolved one added nothing rather than a guessed number.
    expect(c.perServing.kcal).toBeCloseTo(717 / ASSUMED_SERVINGS, 1);
  });

  it("records a null gram weight for an unweighable measure", async () => {
    const [c] = await costRecipes([
      recipe({
        ingredients: [
          { name: "Butter", measure: "100g" },
          { name: "Parsley", measure: "to taste" },
        ],
      }),
    ]);
    expect(c.grams[0]).toBe(100);
    expect(c.grams[1]).toBeNull();
    expect(c.coverage).toBe(0.5);
  });

  it("reports zero coverage for a recipe with no ingredients", async () => {
    const [c] = await costRecipes([recipe({ ingredients: [] })]);
    expect(c.coverage).toBe(0);
    expect(c.perServing.kcal).toBe(0);
  });

  it("costs a batch in one pass", async () => {
    const out = await costRecipes([
      recipe({ id: "a", ingredients: [{ name: "Butter", measure: "100g" }] }),
      recipe({ id: "b", ingredients: [{ name: "Onions", measure: "100g" }] }),
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].perServing.kcal).toBeGreaterThan(out[1].perServing.kcal);
  });
});

describe("isUsable — the honesty gate", () => {
  it("accepts a well-covered, real-calorie recipe", () => {
    expect(isUsable(costed({ coverage: 0.6, perServing: macros(80) }))).toBe(true);
    expect(isUsable(costed({ coverage: 1, perServing: macros(500) }))).toBe(true);
  });

  it("rejects a recipe we could not trace enough of", () => {
    expect(isUsable(costed({ coverage: 0.59, perServing: macros(500) }))).toBe(false);
  });

  it("rejects an implausibly low calorie total", () => {
    // Usually means the ingredients resolved but the measures didn't.
    expect(isUsable(costed({ coverage: 1, perServing: macros(79) }))).toBe(false);
    expect(isUsable(costed({ coverage: 1, perServing: macros(0) }))).toBe(false);
  });
});

describe("portionFor", () => {
  it("returns the multiplier that lands on the calorie slot", () => {
    expect(portionFor(costed({ perServing: macros(500) }), 500)).toBe(1);
    expect(portionFor(costed({ perServing: macros(500) }), 750)).toBe(1.5);
  });

  it("rounds to one decimal place", () => {
    expect(portionFor(costed({ perServing: macros(300) }), 500)).toBe(1.7);
  });

  it("refuses to stretch a portion beyond 0.5x-2.5x", () => {
    // Serving a quarter portion or a triple portion is not a real recommendation.
    expect(portionFor(costed({ perServing: macros(500) }), 200)).toBeNull();
    expect(portionFor(costed({ perServing: macros(100) }), 500)).toBeNull();
  });

  it("returns null rather than dividing by zero", () => {
    expect(portionFor(costed({ perServing: macros(0) }), 500)).toBeNull();
  });
});

describe("toMeal", () => {
  it("scales displayed nutrition by the portion", () => {
    const meal = toMeal(costed({ perServing: macros(500, 30, 50, 20) }), 2);
    expect(meal.calories).toBe(1000);
    expect(meal.proteinG).toBe(60);
    expect(meal.carbsG).toBe(100);
    expect(meal.fatG).toBe(40);
  });

  it("scales ingredient weights from whole-recipe grams to the eaten portion", async () => {
    const [c] = await costRecipes([
      recipe({ ingredients: [{ name: "Butter", measure: "400g" }] }),
    ]);
    // whole recipe feeds 4; eating 1 portion is a quarter of it
    const meal = toMeal(c, 1);
    expect(meal.mealIngredients?.[0].grams).toBe(100);
    expect(meal.mealIngredients?.[0].display).toBe("100 g Butter");
  });

  it("falls back to the publisher's wording when a weight is unknown", async () => {
    const [c] = await costRecipes([
      recipe({ ingredients: [{ name: "Parsley", measure: "to taste" }] }),
    ]);
    const meal = toMeal(c, 1);
    expect(meal.mealIngredients?.[0].grams).toBeNull();
    expect(meal.mealIngredients?.[0].display).toBe("to taste Parsley");
  });

  it("marks provenance so the UI can distinguish researched plans", () => {
    const meal = toMeal(costed({ coverage: 0.85 }), 1);
    expect(meal.dataSource).toBe("researched");
    expect(meal.nutritionCoverage).toBe(0.85);
    expect(meal.portions).toBe(1);
  });
});

function macros(kcal: number, proteinG = 0, carbsG = 0, fatG = 0) {
  return { kcal, proteinG, carbsG, fatG };
}
