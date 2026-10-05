import { describe, expect, it } from "vitest";
import { wholePercent } from "./witness-percent";

// The witness-percent columns are Int, and the live MySQL runs non-strict:
// 12.5 was silently stored as 12. Round on the way in instead.
describe("wholePercent", () => {
  it("rounds to the nearest whole percent", () => {
    expect(wholePercent(12.5)).toBe(13);
    expect(wholePercent(12.4)).toBe(12);
    expect(wholePercent("25")).toBe(25);
  });
  it("keeps 0", () => {
    expect(wholePercent(0)).toBe(0);
  });
  it("maps blanks and junk to null", () => {
    expect(wholePercent(null)).toBeNull();
    expect(wholePercent(undefined)).toBeNull();
    expect(wholePercent("")).toBeNull();
    expect(wholePercent("abc")).toBeNull();
  });
});
