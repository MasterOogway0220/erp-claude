import { describe, expect, it } from "vitest";
import { findUnpricedItems, parseRate, unpricedItemsError } from "./pricing";

describe("parseRate", () => {
  it("treats empty values as 0", () => {
    expect(parseRate("")).toBe(0);
    expect(parseRate(null)).toBe(0);
    expect(parseRate(undefined)).toBe(0);
  });

  it("parses numbers, numeric strings and Decimal-like objects", () => {
    expect(parseRate(150)).toBe(150);
    expect(parseRate("99.5")).toBe(99.5);
    expect(parseRate({ toString: () => "1250.00" })).toBe(1250);
  });

  it("returns NaN for garbage", () => {
    expect(parseRate("abc")).toBeNaN();
  });
});

describe("findUnpricedItems", () => {
  it("returns empty for fully priced items", () => {
    expect(
      findUnpricedItems([
        { sNo: 1, unitRate: "100" },
        { sNo: 2, unitRate: 250.5 },
      ])
    ).toEqual([]);
  });

  it("flags empty, zero, negative and invalid rates", () => {
    expect(
      findUnpricedItems([
        { sNo: 1, unitRate: "" },
        { sNo: 2, unitRate: "0" },
        { sNo: 3, unitRate: -5 },
        { sNo: 4, unitRate: "abc" },
        { sNo: 5, unitRate: "10" },
      ])
    ).toEqual([1, 2, 3, 4]);
  });

  it("falls back to 1-based position when sNo is missing", () => {
    expect(findUnpricedItems([{ unitRate: "5" }, { unitRate: "" }])).toEqual([2]);
  });
});

describe("unpricedItemsError", () => {
  it("returns null when everything is priced", () => {
    expect(unpricedItemsError([{ sNo: 1, unitRate: "10" }], "Do X.")).toBeNull();
  });

  it("formats a single unpriced item", () => {
    expect(unpricedItemsError([{ sNo: 3, unitRate: "" }], "Add prices first.")).toBe(
      "Item 3 has no unit rate. Add prices first."
    );
  });

  it("formats multiple unpriced items", () => {
    expect(
      unpricedItemsError(
        [
          { sNo: 2, unitRate: "" },
          { sNo: 5, unitRate: 0 },
          { sNo: 7, unitRate: null },
        ],
        "Add prices before approving."
      )
    ).toBe("Items 2, 5 and 7 have no unit rate. Add prices before approving.");
  });
});
