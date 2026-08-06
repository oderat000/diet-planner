import { describe, expect, it } from "vitest";
import {
  clampMeals,
  computeTargets,
  deriveGoal,
  proteinReferenceKg,
  proteinTargetG,
} from "./plan";
import type { Profile } from "./types";

/**
 * These numbers are what users eat by. Every expectation below is derived by hand from
 * the published Mifflin-St Jeor equation, not captured from a previous run — a snapshot
 * of wrong output is not a test.
 */

function profile(over: Partial<Profile> = {}): Profile {
  return {
    age: 30,
    sex: "male",
    heightCm: 180,
    weightKg: 80,
    goalWeightKg: 80,
    activity: "sedentary",
    preferences: "",
    allergies: "",
    mealsPerDay: 3,
    ...over,
  };
}

describe("deriveGoal", () => {
  it("treats a difference within 1 kg as maintain", () => {
    expect(deriveGoal(profile({ weightKg: 80, goalWeightKg: 80 }))).toBe("maintain");
    expect(deriveGoal(profile({ weightKg: 80, goalWeightKg: 79 }))).toBe("maintain");
    expect(deriveGoal(profile({ weightKg: 80, goalWeightKg: 81 }))).toBe("maintain");
  });

  it("reads intent from the two weights, past the tolerance", () => {
    expect(deriveGoal(profile({ weightKg: 90, goalWeightKg: 80 }))).toBe("lose");
    expect(deriveGoal(profile({ weightKg: 70, goalWeightKg: 80 }))).toBe("gain");
  });
});

describe("computeTargets — Mifflin-St Jeor", () => {
  it("computes maintenance for a male profile", () => {
    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    // TDEE = 1780 * 1.2 = 2136 -> rounded to nearest 10 = 2140
    const t = computeTargets(profile());
    expect(t.dailyCalories).toBe(2140);
  });

  it("applies the -161 constant for a female profile", () => {
    // BMR = 10*65 + 6.25*165 - 5*30 - 161 = 650 + 1031.25 - 150 - 161 = 1370.25
    // TDEE = 1370.25 * 1.2 = 1644.3 -> 1640
    const t = computeTargets(
      profile({ sex: "female", weightKg: 65, goalWeightKg: 65, heightCm: 165 }),
    );
    expect(t.dailyCalories).toBe(1640);
  });

  it("applies each activity multiplier", () => {
    // BMR 1780 for the base profile
    const at = (activity: Profile["activity"]) =>
      computeTargets(profile({ activity })).dailyCalories;
    expect(at("sedentary")).toBe(2140); // 1780 * 1.2   = 2136
    expect(at("light")).toBe(2450); // 1780 * 1.375 = 2447.5
    expect(at("moderate")).toBe(2760); // 1780 * 1.55  = 2759
    expect(at("active")).toBe(3070); // 1780 * 1.725 = 3070.5
    expect(at("very_active")).toBe(3380); // 1780 * 1.9   = 3382
  });

  it("cuts 500 kcal to lose and adds 300 to gain", () => {
    const lose = computeTargets(profile({ weightKg: 90, goalWeightKg: 80 }));
    // BMR = 900 + 1125 - 150 + 5 = 1880; TDEE = 2256; -500 = 1756 -> 1760
    expect(lose.dailyCalories).toBe(1760);

    const gain = computeTargets(profile({ weightKg: 70, goalWeightKg: 80 }));
    // BMR = 700 + 1125 - 150 + 5 = 1680; TDEE = 2016; +300 = 2316 -> 2320
    expect(gain.dailyCalories).toBe(2320);
  });

  it("never prescribes a starvation diet, however small the profile", () => {
    // A deficit off a very low TDEE must hit the 1200 floor, not go below it.
    const t = computeTargets(
      profile({ sex: "female", age: 70, heightCm: 150, weightKg: 50, goalWeightKg: 40 }),
    );
    expect(t.dailyCalories).toBeGreaterThanOrEqual(1200);
  });

  it("keeps every profile above the floor — the regression that matters", () => {
    // Guards against a refactor silently producing a 900 kcal/day plan.
    const sexes: Profile["sex"][] = ["male", "female"];
    const activities: Profile["activity"][] = [
      "sedentary",
      "light",
      "moderate",
      "active",
      "very_active",
    ];
    for (const sex of sexes) {
      for (const activity of activities) {
        for (const age of [18, 45, 80]) {
          for (const weightKg of [45, 80, 140]) {
            const t = computeTargets(
              profile({ sex, activity, age, weightKg, goalWeightKg: 40, heightCm: 150 }),
            );
            expect(t.dailyCalories).toBeGreaterThanOrEqual(1200);
            expect(Number.isFinite(t.dailyCalories)).toBe(true);
          }
        }
      }
    }
  });

  it("splits macros so they reconstruct the calorie total", () => {
    const t = computeTargets(profile());
    const fromMacros = t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9;
    // rounding of three independent figures, so allow a few kcal of slack
    expect(Math.abs(fromMacros - t.dailyCalories)).toBeLessThanOrEqual(10);
  });

  it("puts 25% of energy in fat", () => {
    const t = computeTargets(profile());
    expect(t.fatG).toBe(Math.round((t.dailyCalories * 0.25) / 9));
  });
});

describe("proteinReferenceKg — adjusted body weight", () => {
  it("uses current weight at or below goal", () => {
    expect(proteinReferenceKg(profile({ weightKg: 70, goalWeightKg: 80 }))).toBe(70);
    expect(proteinReferenceKg(profile({ weightKg: 80, goalWeightKg: 80 }))).toBe(80);
  });

  it("discounts excess weight to 25% above goal", () => {
    // 80 + 0.25 * (120 - 80) = 90
    expect(proteinReferenceKg(profile({ weightKg: 120, goalWeightKg: 80 }))).toBe(90);
  });

  it("still moves with current weight — a flat goal-weight formula would not", () => {
    const a = proteinReferenceKg(profile({ weightKg: 100, goalWeightKg: 80 }));
    const b = proteinReferenceKg(profile({ weightKg: 120, goalWeightKg: 80 }));
    expect(b).toBeGreaterThan(a);
  });
});

describe("proteinTargetG", () => {
  it("doses 1.8 g/kg when cutting and 1.6 g/kg at maintenance", () => {
    // lose: reference = 80 + 0.25*(90-80) = 82.5; 1.8 * 82.5 = 148.5 -> 149
    expect(proteinTargetG(profile({ weightKg: 90, goalWeightKg: 80 }))).toBe(149);
    // maintain: reference = 80; 1.6 * 80 = 128
    expect(proteinTargetG(profile({ weightKg: 80, goalWeightKg: 80 }))).toBe(128);
  });
});

describe("clampMeals", () => {
  it("holds meals between 2 and 8", () => {
    expect(clampMeals(1)).toBe(2);
    expect(clampMeals(9)).toBe(8);
    expect(clampMeals(4)).toBe(4);
    expect(clampMeals(3.4)).toBe(3);
  });

  it("falls back to 3 rather than propagating NaN into the plan", () => {
    expect(clampMeals(NaN)).toBe(3);
    expect(clampMeals(Infinity)).toBe(3);
  });
});
