import { describe, expect, it } from "vitest";
import { formatGrams } from "./format";

describe("formatGrams", () => {
  it("switches to kilograms at 1000 g", () => {
    expect(formatGrams(999)).toBe("999 g");
    expect(formatGrams(1000)).toBe("1.0 kg");
    expect(formatGrams(1500)).toBe("1.5 kg");
    expect(formatGrams(2340)).toBe("2.3 kg");
  });

  it("uses whole grams from 10 g up", () => {
    expect(formatGrams(10)).toBe("10 g");
    expect(formatGrams(150)).toBe("150 g");
    expect(formatGrams(150.4)).toBe("150 g");
  });

  it("keeps one decimal below 10 g so small amounts survive", () => {
    // The regression the merge had to avoid: the grocery-list copy rounded these to "0 g".
    expect(formatGrams(0.5)).toBe("0.5 g");
    expect(formatGrams(2)).toBe("2.0 g");
    expect(formatGrams(9.9)).toBe("9.9 g");
  });

  it("handles zero without a bare unit", () => {
    expect(formatGrams(0)).toBe("0.0 g");
  });
});
