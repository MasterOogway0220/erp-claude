import { describe, expect, it } from "vitest";
import { isMatchable, isSameItem, matchKey, wasGivenToClient } from "./past-quote-match";

const line = {
  product: "SMLS Pipe",
  material: "ASTM A106 Gr. B",
  additionalSpec: "NACE MR0175",
  sizeLabel: '2" SCH 40',
};

describe("wasGivenToClient", () => {
  it("counts quotations that reached the client", () => {
    for (const s of ["APPROVED", "SENT", "WON", "LOST", "EXPIRED", "REVISED", "SUPERSEDED"]) {
      expect(wasGivenToClient(s)).toBe(true);
    }
  });
  it("rejects quotations that never left the office", () => {
    for (const s of ["DRAFT", "PENDING_APPROVAL", "REJECTED", "CANCELLED", "", null, undefined]) {
      expect(wasGivenToClient(s)).toBe(false);
    }
  });
});

describe("isSameItem", () => {
  it("matches when all four fields match, ignoring case and spacing", () => {
    expect(isSameItem(line, {
      product: " smls  pipe ",
      material: "astm a106 gr. b",
      additionalSpec: "NACE MR0175",
      sizeLabel: '2"  SCH 40',
    })).toBe(true);
  });

  it.each(["product", "material", "additionalSpec", "sizeLabel"] as const)(
    "does not match when %s differs",
    (field) => {
      expect(isSameItem(line, { ...line, [field]: "something else" })).toBe(false);
    }
  );

  it("treats a blank spec as a value: blank matches only blank", () => {
    const noSpec = { ...line, additionalSpec: "" };
    expect(isSameItem(noSpec, { ...line, additionalSpec: null })).toBe(true);
    expect(isSameItem(noSpec, line)).toBe(false);
    expect(isSameItem(line, noSpec)).toBe(false);
  });

  it("never matches a line missing product, material or size", () => {
    for (const field of ["product", "material", "sizeLabel"] as const) {
      const partial = { ...line, [field]: "" };
      expect(isMatchable(partial)).toBe(false);
      expect(matchKey(partial)).toBe("");
      expect(isSameItem(partial, partial)).toBe(false);
    }
  });
});
