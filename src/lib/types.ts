export type Sex = "male" | "female";
export type Activity =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
/** Derived from current vs goal weight — never asked for directly. See deriveGoal(). */
export type Goal = "lose" | "maintain" | "gain";
export type LocalDishPreference = "mostly-local" | "balanced" | "global";

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
  /** country selected in the footer's regional-food questionnaire */
  homeCountry?: string;
  /** whether the plan should strongly favor, mix, or ignore local cuisine */
  localDishPreference?: LocalDishPreference;
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

/** Fields every meal carries, whichever era of the schema produced it. */
interface MealBase {
  name: string;
  description: string;
  calories: number;
  proteinG: number;
  carbsG?: number;
  fatG?: number;
  /** Optional time selected when a dish is scheduled from the menu (24-hour HH:mm). */
  scheduledTime?: string;

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
}

/**
 * A meal built by the current pipeline: a real published recipe, costed ingredient by
 * ingredient against USDA. The provenance fields are required here — that is the whole
 * point of the variant, and a caller reading `mealIngredients` must first establish it
 * is looking at one of these.
 */
export interface ResearchedMeal extends MealBase {
  dataSource: "researched";
  /** ingredients with resolved weights; `grams: null` where the measure was too vague */
  mealIngredients: MealIngredient[];
  /** how much of one recipe's serving this portion is */
  portions: number;
  /** share of ingredients we could trace to a USDA entry, 0..1 */
  nutritionCoverage: number;
}

/**
 * A meal from a plan saved before the researched pipeline existed. Display only: it
 * carries a flat ingredient list with no weights and nothing to trace the numbers to.
 */
export interface LegacyMeal extends MealBase {
  dataSource?: undefined;
  /** legacy shape from plans saved before real data — display only */
  ingredients?: string[];
}

/**
 * Discriminated on `dataSource` so the two eras can't be confused. Before this was a
 * union, every provenance field was optional on one interface and components read them
 * with `?.` — which silently produced "no ingredients" for a researched meal whose data
 * was actually there, and hid that legacy meals have no coverage figure at all.
 */
export type Meal = ResearchedMeal | LegacyMeal;

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
