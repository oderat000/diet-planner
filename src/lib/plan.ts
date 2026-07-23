import { Goal, Profile, Targets } from "./types";

const ACTIVITY_FACTOR: Record<Profile["activity"], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Weights within this margin of the goal count as "maintain" rather than a nudge. */
const GOAL_TOLERANCE_KG = 1;

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const MIN_MEALS_PER_DAY = 2;
export const MAX_MEALS_PER_DAY = 8;

export function clampMeals(n: number): number {
  if (!Number.isFinite(n)) return 3;
  return Math.min(Math.max(Math.round(n), MIN_MEALS_PER_DAY), MAX_MEALS_PER_DAY);
}

/**
 * Which way the plan should push, inferred from the two weights the user gave us.
 * Wanting to weigh less than you do means cutting; more means bulking; the same
 * (within a kilo of slack) means holding steady.
 */
export function deriveGoal(p: Profile): Goal {
  const delta = p.goalWeightKg - p.weightKg;
  if (delta < -GOAL_TOLERANCE_KG) return "lose";
  if (delta > GOAL_TOLERANCE_KG) return "gain";
  return "maintain";
}

/** Grams of protein per kg of reference weight, by goal. */
const PROTEIN_PER_KG: Record<Goal, number> = {
  // a calorie deficit needs more protein per kg to preserve muscle (1.6–2.2 g/kg range)
  lose: 1.8,
  maintain: 1.6,
  // a surplus for muscle gain also benefits from the higher end
  gain: 1.8,
};

/**
 * Reference weight for dosing protein.
 *
 * Protein is prescribed per kg of body weight, but needs don't scale 1:1 with fat mass, so
 * for someone well above their goal the clinical practice is "adjusted body weight":
 * ideal + 0.25 × (current − ideal). We use the goal weight as the ideal proxy. At or below
 * goal we just use current weight. Either way the figure moves with current weight — which
 * a flat goal-weight formula never did.
 */
export function proteinReferenceKg(p: Profile): number {
  const current = p.weightKg;
  const ideal = p.goalWeightKg;
  if (current <= ideal) return current;
  return ideal + 0.25 * (current - ideal);
}

export function proteinTargetG(p: Profile): number {
  return Math.round(PROTEIN_PER_KG[deriveGoal(p)] * proteinReferenceKg(p));
}

/**
 * Mifflin-St Jeor BMR -> TDEE -> goal-adjusted calorie and macro targets.
 * A published equation applied to the user's own numbers — the one piece of this
 * app that computes rather than looks up, and it computes a documented standard.
 */
export function computeTargets(p: Profile): Targets {
  const bmr =
    10 * p.weightKg +
    6.25 * p.heightCm -
    5 * p.age +
    (p.sex === "male" ? 5 : -161);
  const tdee = bmr * ACTIVITY_FACTOR[p.activity];
  const goal = deriveGoal(p);

  let calories = tdee;
  if (goal === "lose") calories = Math.max(tdee - 500, 1200);
  if (goal === "gain") calories = tdee + 300;
  calories = Math.round(calories / 10) * 10;

  const proteinG = proteinTargetG(p);
  const fatG = Math.round((calories * 0.25) / 9);
  const carbsG = Math.round((calories - proteinG * 4 - fatG * 9) / 4);
  return { dailyCalories: calories, proteinG, carbsG, fatG };
}
