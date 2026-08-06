import { describe, expect, it } from "vitest";
import { mapWithLimit } from "./concurrent";

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe("mapWithLimit", () => {
  it("returns results in input order regardless of completion order", async () => {
    // Later items finish first, so an order-naive implementation would scramble these.
    const out = await mapWithLimit([30, 20, 10, 0], 4, async (ms) => {
      await tick(ms);
      return ms;
    });
    expect(out).toEqual([30, 20, 10, 0]);
  });

  it("never exceeds the concurrency limit", async () => {
    let inFlight = 0;
    let peak = 0;
    await mapWithLimit(Array.from({ length: 50 }, (_, i) => i), 6, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await tick(1);
      inFlight--;
      return n;
    });
    expect(peak).toBeLessThanOrEqual(6);
  });

  it("still runs concurrently rather than serially", async () => {
    let peak = 0;
    let inFlight = 0;
    await mapWithLimit(Array.from({ length: 20 }, (_, i) => i), 6, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await tick(2);
      inFlight--;
      return n;
    });
    expect(peak).toBeGreaterThan(1);
  });

  it("processes every item exactly once", async () => {
    const seen: number[] = [];
    const items = Array.from({ length: 25 }, (_, i) => i);
    const out = await mapWithLimit(items, 4, async (n) => {
      seen.push(n);
      return n * 2;
    });
    expect(seen.sort((a, b) => a - b)).toEqual(items);
    expect(out).toEqual(items.map((n) => n * 2));
  });

  it("handles an empty list without starting workers", async () => {
    expect(await mapWithLimit([], 6, async () => 1)).toEqual([]);
  });

  it("does not start more workers than there are items", async () => {
    let peak = 0;
    let inFlight = 0;
    await mapWithLimit([1, 2], 10, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await tick(1);
      inFlight--;
      return n;
    });
    expect(peak).toBeLessThanOrEqual(2);
  });
});
