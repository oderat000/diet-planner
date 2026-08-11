import { mapWithLimit } from "./concurrent";
import { getRecipe, idsInCategory } from "./mealdb";
import { costRecipes, isUsable, toMeal } from "./nutrition";
import type { Meal, ResearchedMeal } from "./types";

export const MENU_CATEGORIES = [
  "Beef",
  "Breakfast",
  "Chicken",
  "Dessert",
  "Goat",
  "Lamb",
  "Miscellaneous",
  "Pasta",
  "Pork",
  "Seafood",
  "Side",
  "Starter",
  "Vegan",
  "Vegetarian",
] as const;

export type FoodGroup =
  | "Fish & seafood"
  | "Fruit-forward"
  | "Vegetables & legumes"
  | "Poultry"
  | "Meat"
  | "Pasta & grains"
  | "Soups & stews"
  | "Sweets & baking"
  | "Eggs & dairy"
  | "Mixed dishes";

export type MacroProfile = "Protein-led" | "Carb-led" | "Fat-led" | "Macro-balanced";
export type NutritionProfile = "Lighter" | "Protein-rich" | "Balanced" | "Rich / occasional";
export type MenuSort =
  | "name"
  | "region"
  | "category"
  | "calories-low"
  | "calories-high"
  | "protein-high"
  | "carbs-high"
  | "fat-high";

export interface MenuFilters {
  search: string;
  region: string;
  category: string;
  foodGroup: string;
  macroProfile: string;
  nutritionProfile: string;
}

function ingredientText(meal: Meal): string {
  if (meal.dataSource === "researched") {
    return meal.mealIngredients.map((ingredient) => ingredient.name).join(" ").toLowerCase();
  }
  return (meal.ingredients ?? []).join(" ").toLowerCase();
}

function countTokens(text: string, tokens: string[]): number {
  return tokens.reduce((count, token) => count + (text.includes(token) ? 1 : 0), 0);
}

export function foodGroupFor(meal: Meal): FoodGroup {
  const title = meal.name.toLowerCase();
  const ingredients = ingredientText(meal);
  const text = `${title} ${ingredients}`;
  const category = meal.category ?? "";

  if (
    category === "Seafood" ||
    /\b(fish|salmon|tuna|cod|haddock|trout|prawn|shrimp|mussel|clam|crab|squid)\b/.test(text)
  ) return "Fish & seafood";

  const fruitTokens = [
    "apple", "banana", "berry", "berries", "cherry", "mango", "orange", "peach",
    "pear", "pineapple", "plum", "strawberry", "raspberry", "blueberry", "watermelon",
  ];
  if (countTokens(title, fruitTokens) >= 1 || countTokens(ingredients, fruitTokens) >= 2) {
    return "Fruit-forward";
  }

  if (category === "Vegan" || category === "Vegetarian") return "Vegetables & legumes";
  if (category === "Chicken" || /\b(chicken|turkey|duck)\b/.test(text)) return "Poultry";
  if (["Beef", "Goat", "Lamb", "Pork"].includes(category)) return "Meat";
  if (category === "Pasta" || /\b(pasta|spaghetti|noodle|rice|couscous|quinoa)\b/.test(text)) {
    return "Pasta & grains";
  }
  if (/\b(soup|stew|chowder|broth|hotpot)\b/.test(title)) return "Soups & stews";
  if (category === "Dessert" || /\b(cake|cookie|biscuit|pie|pudding|tart|brownie)\b/.test(title)) {
    return "Sweets & baking";
  }
  if (category === "Breakfast" && /\b(egg|cheese|milk|yogurt)\b/.test(text)) return "Eggs & dairy";
  return "Mixed dishes";
}

export function macroProfileFor(meal: Meal): MacroProfile {
  const protein = meal.proteinG * 4;
  const carbs = (meal.carbsG ?? 0) * 4;
  const fat = (meal.fatG ?? 0) * 9;
  const total = protein + carbs + fat;
  if (total <= 0) return "Macro-balanced";
  const largest = Math.max(protein, carbs, fat);
  if (largest / total < 0.45) return "Macro-balanced";
  if (largest === protein) return "Protein-led";
  if (largest === carbs) return "Carb-led";
  return "Fat-led";
}

export function nutritionProfileFor(meal: Meal): NutritionProfile {
  const fat = meal.fatG ?? 0;
  const proteinShare = meal.calories > 0 ? (meal.proteinG * 4) / meal.calories : 0;
  if (meal.category === "Dessert" || meal.calories >= 650 || fat >= 30) return "Rich / occasional";
  if (meal.proteinG >= 25 && proteinShare >= 0.2) return "Protein-rich";
  if (meal.calories <= 400 && fat <= 18) return "Lighter";
  return "Balanced";
}

export function filterMenuMeals(meals: ResearchedMeal[], filters: MenuFilters): ResearchedMeal[] {
  const search = filters.search.trim().toLowerCase();
  return meals.filter((meal) => {
    const searchable = `${meal.name} ${meal.origin ?? ""} ${meal.category ?? ""} ${ingredientText(meal)}`.toLowerCase();
    return (
      (!search || searchable.includes(search)) &&
      (!filters.region || meal.origin === filters.region) &&
      (!filters.category || meal.category === filters.category) &&
      (!filters.foodGroup || foodGroupFor(meal) === filters.foodGroup) &&
      (!filters.macroProfile || macroProfileFor(meal) === filters.macroProfile) &&
      (!filters.nutritionProfile || nutritionProfileFor(meal) === filters.nutritionProfile)
    );
  });
}

const collator = new Intl.Collator(undefined, { sensitivity: "base" });

export function sortMenuMeals(meals: ResearchedMeal[], sort: MenuSort): ResearchedMeal[] {
  return [...meals].sort((a, b) => {
    switch (sort) {
      case "region":
        return collator.compare(a.origin ?? "", b.origin ?? "") || collator.compare(a.name, b.name);
      case "category":
        return collator.compare(a.category ?? "", b.category ?? "") || collator.compare(a.name, b.name);
      case "calories-low":
        return a.calories - b.calories;
      case "calories-high":
        return b.calories - a.calories;
      case "protein-high":
        return b.proteinG - a.proteinG;
      case "carbs-high":
        return (b.carbsG ?? 0) - (a.carbsG ?? 0);
      case "fat-high":
        return (b.fatG ?? 0) - (a.fatG ?? 0);
      default:
        return collator.compare(a.name, b.name);
    }
  });
}

/** Order alternatives by overall macro distance, with extra weight on protein. */
export function equivalentMenuMeals(meals: ResearchedMeal[], target: Meal): ResearchedMeal[] {
  const distance = (meal: ResearchedMeal) => {
    const relative = (actual: number, expected: number) => Math.abs(actual - expected) / Math.max(expected, 1);
    return relative(meal.calories, target.calories) + relative(meal.proteinG, target.proteinG) * 1.5 + relative(meal.carbsG ?? 0, target.carbsG ?? 0) + relative(meal.fatG ?? 0, target.fatG ?? 0);
  };
  return [...meals].filter((meal) => meal.name.toLowerCase() !== target.name.toLowerCase()).sort((a, b) => distance(a) - distance(b) || collator.compare(a.name, b.name));
}

/** Rank dishes by closeness to a meal slot's complete nutrition profile. */
export function equivalentMeals(
  meals: ResearchedMeal[],
  target: Pick<Meal, "calories" | "proteinG" | "carbsG" | "fatG">,
  excludeName?: string,
): ResearchedMeal[] {
  const difference = (actual: number, expected: number) =>
    Math.abs(actual - expected) / Math.max(expected, 1);
  return meals
    .filter((meal) => meal.name !== excludeName)
    .sort((a, b) => {
      const score = (meal: ResearchedMeal) =>
        difference(meal.calories, target.calories) * 0.4 +
        difference(meal.proteinG, target.proteinG) * 0.3 +
        difference(meal.carbsG ?? 0, target.carbsG ?? 0) * 0.15 +
        difference(meal.fatG ?? 0, target.fatG ?? 0) * 0.15;
      return score(a) - score(b) || collator.compare(a.name, b.name);
    });
}

function takeSpread(ids: string[], count: number): string[] {
  if (ids.length <= count) return ids;
  const step = ids.length / count;
  return Array.from({ length: count }, (_, index) => ids[Math.floor(index * step)]);
}

let menuPromise: Promise<ResearchedMeal[]> | null = null;

/** Loads a broad, deterministic sample across every real recipe category. */
export function loadMenuMeals(): Promise<ResearchedMeal[]> {
  menuPromise ??= (async () => {
    const lists = await Promise.all(
      MENU_CATEGORIES.map((category) => idsInCategory(category).catch(() => [] as string[])),
    );
    const ids = [...new Set(lists.flatMap((list) => takeSpread(list, 4)))];
    const recipes = (
      await mapWithLimit(ids, 6, (id) => getRecipe(id).catch(() => null))
    ).filter((recipe): recipe is NonNullable<typeof recipe> => recipe !== null);
    return (await costRecipes(recipes)).filter(isUsable).map((costed) => toMeal(costed, 1));
  })().catch((error) => {
    menuPromise = null;
    throw error;
  });
  return menuPromise;
}
