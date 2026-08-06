import { describe, expect, it } from "vitest";
import { BadRequestError, asObject, optionalString, requiredString } from "./apiGuard";

describe("asObject", () => {
  it("accepts a plain object", () => {
    expect(asObject({ a: 1 })).toEqual({ a: 1 });
  });

  it("rejects everything that is not one", () => {
    for (const bad of [null, undefined, 42, "str", true, [1, 2]]) {
      expect(() => asObject(bad)).toThrow(BadRequestError);
    }
  });
});

describe("optionalString", () => {
  it("passes through a valid string", () => {
    expect(optionalString("hi", "f", 10)).toBe("hi");
  });

  it("treats null and undefined as absent", () => {
    expect(optionalString(undefined, "f", 10)).toBeUndefined();
    expect(optionalString(null, "f", 10)).toBeUndefined();
  });

  it("rejects a non-string", () => {
    expect(() => optionalString(42, "f", 10)).toThrow(BadRequestError);
    expect(() => optionalString({}, "f", 10)).toThrow(BadRequestError);
  });

  it("enforces the length cap that keeps oversized payloads off the metered API", () => {
    expect(() => optionalString("x".repeat(11), "f", 10)).toThrow(/at most 10/);
    expect(optionalString("x".repeat(10), "f", 10)).toHaveLength(10);
  });

  it("names the offending field in the message", () => {
    expect(() => optionalString(1, "image.mimeType", 10)).toThrow(/image\.mimeType/);
  });
});

describe("requiredString", () => {
  it("accepts a non-empty string", () => {
    expect(requiredString("hi", "f", 10)).toBe("hi");
  });

  it("rejects absent or blank values", () => {
    for (const bad of [undefined, null, "", "   "]) {
      expect(() => requiredString(bad, "question", 10)).toThrow(BadRequestError);
    }
  });

  it("still enforces the cap", () => {
    expect(() => requiredString("x".repeat(11), "f", 10)).toThrow(BadRequestError);
  });
});
