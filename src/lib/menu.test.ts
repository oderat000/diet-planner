import { describe, expect, it } from "vitest";
import {
  filterMenuMeals,
  foodGroupFor,
  macroProfileFor,
  nutritionProfileFor,
  sortMenuMeals,
  equivalentMenuMeals,
  type MenuFilters,
} from "./menu";
import type { ResearchedMeal } from "./types";

function meal(overrides: Partial<ResearchedMeal> = {}): ResearchedMeal {
  return {
    dataSource: "researched",
    name: "Vegetable bowl",
    description: "",
    calories: 420,
    proteinG: 20,
    carbsG: 50,
    fatG: 15,
    category: "Vegetarian",
    origin: "Greek",
    mealIngredients: [{ name: "Tomato", measure: "1", grams: 120, display: "1 tomato" }],
    portions: 1,
    nutritionCoverage: 1,
    ...overrides,
  };
}

const emptyFilters: MenuFilters = {
  search: "",
  region: "",
  category: "",
  foodGroup: "",
  macroProfile: "",
  nutritionProfile: "",
};

describe("menu classification", () => {
  it("groups seafood and fruit-forward dishes from published fields", () => {
    expect(foodGroupFor(meal({ category: "Seafood", name: "Grilled salmon" }))).toBe("Fish & seafood");
    expect(
      foodGroupFor(meal({
        category: "Dessert",
        name: "Apple and berry crumble",
        mealIngredients: [],
      })),
    ).toBe("Fruit-forward");
  });

  it("classifies macro contribution and transparent nutrition styles", () => {
    expect(macroProfileFor(meal({ calories: 400, proteinG: 35, carbsG: 15, fatG: 10 }))).toBe("Protein-led");
    expect(nutritionProfileFor(meal({ calories: 350, proteinG: 12, fatG: 9 }))).toBe("Lighter");
    expect(nutritionProfileFor(meal({ category: "Dessert", calories: 300 }))).toBe("Rich / occasional");
  });
});

describe("menu filtering and sorting", () => {
  const meals = [
    meal({ name: "A", origin: "Italian", calories: 700, proteinG: 18 }),
    meal({ name: "B", origin: "Japanese", calories: 300, proteinG: 30 }),
  ];

  it("combines region and nutrition filters", () => {
    expect(filterMenuMeals(meals, { ...emptyFilters, region: "Japanese", nutritionProfile: "Protein-rich" }).map((m) => m.name)).toEqual(["B"]);
  });

  it("sorts by numeric nutrition values", () => {
    expect(sortMenuMeals(meals, "calories-low").map((m) => m.name)).toEqual(["B", "A"]);
    expect(sortMenuMeals(meals, "protein-high").map((m) => m.name)).toEqual(["B", "A"]);
  });

  it("puts the closest protein and macro alternative first", () => {
    const target = meal({ name: "Target", calories: 500, proteinG: 35, carbsG: 45, fatG: 16 });
    const close = meal({ name: "Close", calories: 510, proteinG: 34, carbsG: 47, fatG: 15 });
    const far = meal({ name: "Far", calories: 510, proteinG: 8, carbsG: 90, fatG: 2 });
    expect(equivalentMenuMeals([far, close, target], target).map((m) => m.name)).toEqual(["Close", "Far"]);
  });
});
