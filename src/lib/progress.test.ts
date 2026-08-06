import { describe, expect, it } from "vitest";
import { checksForDay, dayProgress, planDayIndex, weightProgress } from "./progress";
import type { DayPlan, Meal, Profile, WeightEntry } from "./types";

function meal(calories: number): Meal {
  return { name: "m", description: "", calories, proteinG: 0 };
}

function dayPlan(...calories: number[]): DayPlan {
  return { day: "Monday", meals: calories.map(meal) };
}

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

describe("planDayIndex", () => {
  it("maps a Monday-first week from JavaScript's Sunday-first getDay()", () => {
    // 2026-08-03 is a Monday.
    expect(planDayIndex(new Date(2026, 7, 3))).toBe(0); // Mon
    expect(planDayIndex(new Date(2026, 7, 4))).toBe(1); // Tue
    expect(planDayIndex(new Date(2026, 7, 8))).toBe(5); // Sat
    expect(planDayIndex(new Date(2026, 7, 9))).toBe(6); // Sun
  });

  it("stays within a 7-day plan for every weekday", () => {
    for (let d = 3; d <= 9; d++) {
      const i = planDayIndex(new Date(2026, 7, d));
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThanOrEqual(6);
    }
  });
});

describe("dayProgress", () => {
  it("counts only the meals ticked off", () => {
    const p = dayProgress(dayPlan(500, 600, 400), [true, false, true], 2000);
    expect(p.consumed).toBe(900);
    expect(p.pct).toBe(45);
  });

  it("is zero with nothing checked", () => {
    expect(dayProgress(dayPlan(500, 600), [false, false], 2000)).toEqual({
      consumed: 0,
      pct: 0,
    });
  });

  it("clamps at 100% when the day is overshot", () => {
    const p = dayProgress(dayPlan(2000, 2000), [true, true], 2000);
    expect(p.consumed).toBe(4000);
    expect(p.pct).toBe(100);
  });

  it("treats a missing check as unchecked", () => {
    // A plan whose meal count grew after checks were saved.
    const p = dayProgress(dayPlan(500, 600, 400), [true], 2000);
    expect(p.consumed).toBe(500);
  });

  it("never returns NaN when a plan carries no calorie target", () => {
    // The bug this function was extracted to fix: 0 fed NaN into the progress bar.
    for (const bad of [0, -1, NaN, Infinity]) {
      const p = dayProgress(dayPlan(500), [true], bad);
      expect(Number.isFinite(p.pct)).toBe(true);
      expect(p.pct).toBe(0);
      expect(p.consumed).toBe(500);
    }
  });
});

describe("weightProgress", () => {
  const log = (...pairs: [string, number][]): WeightEntry[] =>
    pairs.map(([date, weightKg]) => ({ date, weightKg }));

  it("reads first and last by date, not by array order", () => {
    const w = weightProgress(
      log(["2026-03-01", 82], ["2026-01-01", 85], ["2026-02-01", 83]),
      profile({ weightKg: 85, goalWeightKg: 75 }),
    );
    expect(w.start).toBe(85);
    expect(w.current).toBe(82);
    expect(w.change).toBe(-3);
  });

  it("falls back to the profile weight with an empty log", () => {
    const w = weightProgress([], profile({ weightKg: 80, goalWeightKg: 75 }));
    expect(w.start).toBe(80);
    expect(w.current).toBe(80);
    expect(w.change).toBe(0);
  });

  it("measures distance to goal", () => {
    const w = weightProgress(log(["2026-01-01", 82]), profile({ goalWeightKg: 75 }));
    expect(w.toGoal).toBe(7);
  });

  it("judges direction against the goal, not the sign", () => {
    const losing = weightProgress(
      log(["2026-01-01", 90], ["2026-02-01", 87]),
      profile({ weightKg: 90, goalWeightKg: 80 }),
    );
    expect(losing.goal).toBe("lose");
    expect(losing.changeGood).toBe(true);

    // The same −3 kg is bad news for someone trying to gain.
    const gaining = weightProgress(
      log(["2026-01-01", 60], ["2026-02-01", 57]),
      profile({ weightKg: 60, goalWeightKg: 70 }),
    );
    expect(gaining.goal).toBe("gain");
    expect(gaining.change).toBe(-3);
    expect(gaining.changeGood).toBe(false);
  });

  it("counts only exactly-stable as good when maintaining", () => {
    const p = profile({ weightKg: 80, goalWeightKg: 80 });
    expect(weightProgress(log(["2026-01-01", 80], ["2026-02-01", 80]), p).changeGood).toBe(true);
    expect(weightProgress(log(["2026-01-01", 80], ["2026-02-01", 81]), p).changeGood).toBe(false);
  });

  it("rounds to one decimal so floating point never leaks into the UI", () => {
    const w = weightProgress(
      log(["2026-01-01", 80.1], ["2026-02-01", 79.4]),
      profile({ goalWeightKg: 75 }),
    );
    expect(w.change).toBe(-0.7);
    expect(w.toGoal).toBe(4.4);
  });
});

describe("checksForDay", () => {
  it("returns the saved row when present", () => {
    expect(checksForDay({ "2026-08-06": [true, false] }, "2026-08-06", 2)).toEqual([
      true,
      false,
    ]);
  });

  it("defaults to all-unchecked at the plan's meal count", () => {
    expect(checksForDay({}, "2026-08-06", 3)).toEqual([false, false, false]);
  });
});
