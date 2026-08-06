/**
 * Derived figures for the dashboard: which day of the plan it is, how much of today's
 * target has been eaten, and how the weight log is trending.
 *
 * These were computed inline in the dashboard component, which meant the arithmetic
 * behind the progress bar and the weight badge had no tests and could not be reused.
 */

import { deriveGoal } from "./plan";
import type { DayPlan, Goal, Profile, WeightEntry } from "./types";

/**
 * Index of today's day in a plan, Monday = 0.
 *
 * `Date.getDay()` is Sunday = 0, so the shift realigns it to the plan's Monday-first
 * week (DAY_NAMES in plan.ts).
 */
export function planDayIndex(now = new Date()): number {
  return (now.getDay() + 6) % 7;
}

export interface DayProgress {
  /** kcal from the meals ticked off so far */
  consumed: number;
  /** share of the daily target, 0..100, clamped */
  pct: number;
}

/**
 * Calories eaten today, and how far that is toward the target.
 *
 * `dailyCalories` is guarded because a legacy or hand-edited plan can carry 0, and
 * dividing by it put NaN into the progress bar.
 */
export function dayProgress(
  dayPlan: DayPlan,
  checks: readonly boolean[],
  dailyCalories: number,
): DayProgress {
  const consumed = dayPlan.meals.reduce(
    (sum, meal, i) => sum + (checks[i] ? meal.calories : 0),
    0,
  );
  if (!Number.isFinite(dailyCalories) || dailyCalories <= 0) {
    return { consumed, pct: 0 };
  }
  return {
    consumed,
    pct: Math.min(100, Math.round((consumed / dailyCalories) * 100)),
  };
}

export interface WeightProgress {
  /** first logged weight, falling back to the profile's starting weight */
  start: number;
  /** most recent logged weight */
  current: number;
  /** current − start, to one decimal. Negative means weight lost. */
  change: number;
  /** current − goal, to one decimal. Positive means still above goal. */
  toGoal: number;
  goal: Goal;
  /** whether `change` moves in the direction the user asked for */
  changeGood: boolean;
}

/** Trend of the weight log, read against the direction the profile implies. */
export function weightProgress(
  weights: readonly WeightEntry[],
  profile: Profile,
): WeightProgress {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const start = sorted[0]?.weightKg ?? profile.weightKg;
  const current = sorted[sorted.length - 1]?.weightKg ?? profile.weightKg;

  const change = Number((current - start).toFixed(1));
  const toGoal = Number((current - profile.goalWeightKg).toFixed(1));
  const goal = deriveGoal(profile);

  const changeGood =
    goal === "gain" ? change > 0 : goal === "lose" ? change < 0 : change === 0;

  return { start, current, change, toGoal, goal, changeGood };
}

/** Today's checkbox row, defaulting to all-unchecked at the right length. */
export function checksForDay(
  checks: Record<string, boolean[]>,
  dateKey: string,
  mealCount: number,
): boolean[] {
  return checks[dateKey] ?? new Array<boolean>(mealCount).fill(false);
}
