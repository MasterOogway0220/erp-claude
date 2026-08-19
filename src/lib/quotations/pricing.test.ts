import { describe, expect, it } from "vitest";
import {
  findUnpricedItems,
  normalizeItemPricing,
  parseRate,
  unpricedItemsError,
} from "./pricing";

describe("parseRate", () => {
  it("distinguishes 'no rate entered' from a rate of zero", () => {
    expect(parseRate("")).toBeNull();
    expect(parseRate(null)).toBeNull();
    expect(parseRate(undefined)).toBeNull();
    expect(parseRate(0)).toBe(0);
    expect(parseRate("0")).toBe(0);
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

  it("accepts a deliberate zero rate as priced", () => {
    expect(findUnpricedItems([{ sNo: 1, unitRate: 0 }, { sNo: 2, unitRate: "0" }])).toEqual([]);
  });

  it("accepts a regretted item with no rate at all", () => {
    expect(
      findUnpricedItems([
        { sNo: 1, unitRate: null, isRegret: true },
        { sNo: 2, unitRate: "", isRegret: true },
      ])
    ).toEqual([]);
  });

  it("flags missing, negative and invalid rates", () => {
    expect(
      findUnpricedItems([
        { sNo: 1, unitRate: "" },
        { sNo: 2, unitRate: null },
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

describe("normalizeItemPricing", () => {
  it("strips the rate and amount off a regretted line, whatever was sent", () => {
    const item = { quantity: "10", unitRate: "250", amount: "2500", isRegret: true };
    expect(normalizeItemPricing(item)).toBeNull();
    expect(item.unitRate).toBeNull();
    expect(item.amount).toBe("0");
  });

  it("stores a blank rate as null, not 0", () => {
    const item = { quantity: "10", unitRate: "", amount: "" };
    expect(normalizeItemPricing(item)).toBeNull();
    expect(item.unitRate).toBeNull();
    expect(item.amount).toBe("0.00");
  });

  it("keeps a deliberate zero rate as 0", () => {
    const item = { quantity: "4", unitRate: "0", amount: "" };
    expect(normalizeItemPricing(item)).toBeNull();
    expect(item.unitRate).toBe(0);
    expect(item.amount).toBe("0.00");
  });

  it("leaves a valid client amount alone", () => {
    const item = { quantity: "10", unitRate: "250", amount: "2500.00" };
    expect(normalizeItemPricing(item)).toBeNull();
    expect(item.unitRate).toBe(250);
    expect(item.amount).toBe("2500.00");
  });

  it("recomputes an invalid amount from qty x rate", () => {
    const item = { quantity: "3", unitRate: "150", amount: "not a number" };
    expect(normalizeItemPricing(item)).toBeNull();
    expect(item.amount).toBe("450.00");
  });

  it("rejects a missing or non-positive quantity", () => {
    expect(normalizeItemPricing({ quantity: "0", unitRate: "5" })).toMatch(/quantity/);
    expect(normalizeItemPricing({ quantity: "", unitRate: "5" })).toMatch(/quantity/);
  });

  it("rejects a negative or unparseable rate", () => {
    expect(normalizeItemPricing({ quantity: "1", unitRate: "-5" })).toMatch(/unit rate/);
    expect(normalizeItemPricing({ quantity: "1", unitRate: "abc" })).toMatch(/unit rate/);
  });

  it("checks quantity even on a regretted line — it identifies the line", () => {
    expect(normalizeItemPricing({ quantity: "", isRegret: true })).toMatch(/quantity/);
  });
});

describe("unpricedItemsError", () => {
  it("returns null when everything is priced", () => {
    expect(unpricedItemsError([{ sNo: 1, unitRate: "10" }], "Do X.")).toBeNull();
  });

  it("returns null when the only unpriced lines are regretted", () => {
    expect(
      unpricedItemsError([{ sNo: 1, unitRate: "10" }, { sNo: 2, isRegret: true }], "Do X.")
    ).toBeNull();
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
          { sNo: 5, unitRate: undefined },
          { sNo: 7, unitRate: null },
        ],
        "Add prices before approving."
      )
    ).toBe("Items 2, 5 and 7 have no unit rate. Add prices before approving.");
  });
});
