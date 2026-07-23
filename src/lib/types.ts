export type Sex = "male" | "female";
export type Activity =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
/** Derived from current vs goal weight — never asked for directly. See deriveGoal(). */
export type Goal = "lose" | "maintain" | "gain";

export interface Profile {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number;
  activity: Activity;
  preferences: string;
  allergies: string;
  /** optional — absent on plans saved before this field existed */
  healthNotes?: string;
  /** cuisines the user enjoys, by TheMealDB area name; plans lean toward these */
  favoriteCuisines?: string[];
  mealsPerDay: number;
}

export interface Targets {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** A computed nutrition figure. Always summed from USDA measurements, never estimated. */
export interface Macros {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MealIngredient {
  /** ingredient name as the publisher wrote it */
  name: string;
  /** measure as the publisher wrote it, e.g. "1 L" */
  measure: string;
  /** resolved weight for this portion; null when the measure was too vague to weigh */
  grams: number | null;
  /** what we show in the list */
  display: string;
}

export interface Meal {
  name: string;
  description: string;
  calories: number;
  proteinG: number;
  carbsG?: number;
  fatG?: number;

  /** ingredients with resolved weights — the researched shape */
  mealIngredients?: MealIngredient[];
  /** preparation steps, as published */
  steps?: string[];

  /** provenance: the publisher's own photo, video and recipe page */
  imageUrl?: string;
  videoUrl?: string | null;
  sourceUrl?: string | null;

  /** cuisine of origin, as published (TheMealDB `area`), e.g. "Italian" */
  origin?: string;
  /** dish category, as published (TheMealDB `category`), e.g. "Pasta" */
  category?: string;

  /** how much of one recipe's serving this portion is */
  portions?: number;
  /** share of ingredients we could trace to a USDA entry, 0..1 */
  nutritionCoverage?: number;
  /** "researched" = real recipe + USDA arithmetic. Legacy plans have no value here. */
  dataSource?: "researched";

  /** legacy shape from plans saved before real data — display only */
  ingredients?: string[];
}

export interface DayPlan {
  day: string;
  meals: Meal[];
}

export interface DietPlan {
  dailyCalories: number;
  macros: { proteinG: number; carbsG: number; fatG: number };
  days: DayPlan[];
  tips: string[];
  /** "researched" = real recipes costed against USDA. Older plans may say ai/fallback. */
  source: "researched" | "ai" | "fallback";
  createdAt: string;
  /** set when nutrition lookups were degraded, e.g. no USDA key */
  warning?: string;
}

export interface WeightEntry {
  date: string; // YYYY-MM-DD
  weightKg: number;
}

/** date (YYYY-MM-DD) -> one boolean per meal of that day's plan */
export type MealChecks = Record<string, boolean[]>;

/** Legacy single-plan shape (kept for migration). */
export interface AppState {
  profile: Profile;
  plan: DietPlan;
  weights: WeightEntry[];
  checks: MealChecks;
}

/** One saved plan in the device's library. */
export interface SavedPlan {
  id: string;
  name: string;
  profile: Profile;
  plan: DietPlan;
  weights: WeightEntry[];
  checks: MealChecks;
  createdAt: string;
}

/** All plans stored on this device, plus which one is active. */
export interface PlanStore {
  plans: SavedPlan[];
  activeId: string | null;
}
