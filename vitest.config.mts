import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Tests cover the pure domain modules in src/lib — the calorie and macro arithmetic
 * users actually eat by. No React, no jsdom: everything under test is plain TypeScript
 * with no DOM dependency, so the default node environment is both correct and fast.
 */
export default defineConfig({
  resolve: {
    // mirrors the "@/*" path alias in tsconfig.json
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
