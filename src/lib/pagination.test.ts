import { describe, it, expect } from "vitest";
import { takeFrom } from "./pagination";

describe("takeFrom", () => {
  it("defaults to 500 without pageSize", () => {
    expect(takeFrom(new URLSearchParams())).toBe(500);
  });

  it("uses a valid pageSize and caps it at 500", () => {
    expect(takeFrom(new URLSearchParams("pageSize=20"))).toBe(20);
    expect(takeFrom(new URLSearchParams("pageSize=9999"))).toBe(500);
  });

  it("ignores nonsense values", () => {
    expect(takeFrom(new URLSearchParams("pageSize=abc"))).toBe(500);
    expect(takeFrom(new URLSearchParams("pageSize=0"))).toBe(500);
    expect(takeFrom(new URLSearchParams("pageSize=-5"))).toBe(500);
  });
});
