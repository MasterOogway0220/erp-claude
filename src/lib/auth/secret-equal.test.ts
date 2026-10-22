import { describe, it, expect } from "vitest";
import { bearerMatches, secretEquals } from "./secret-equal";

describe("secretEquals", () => {
  it("fails closed when the expected secret is unset", () => {
    expect(secretEquals("anything", undefined)).toBe(false);
    expect(secretEquals("", "")).toBe(false);
  });

  it("matches only the exact value", () => {
    expect(secretEquals("abc123", "abc123")).toBe(true);
    expect(secretEquals("abc12", "abc123")).toBe(false);
    expect(secretEquals(null, "abc123")).toBe(false);
  });
});

describe("bearerMatches", () => {
  it("reads the token after 'Bearer '", () => {
    expect(bearerMatches("Bearer s3cret", "s3cret")).toBe(true);
    expect(bearerMatches("s3cret", "s3cret")).toBe(false);
    expect(bearerMatches("Bearer wrong", "s3cret")).toBe(false);
    expect(bearerMatches(null, "s3cret")).toBe(false);
  });
});
