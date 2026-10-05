import { describe, expect, it } from "vitest";
import { termValue, orderTermRows } from "./terms";

// A client PO keeps its own copy of the quotation's terms, edited for the
// order: rows renamed, re-worded, added, removed, or unticked.
describe("orderTermRows", () => {
  it("numbers rows in order, trims, keeps the included flag", () => {
    expect(
      orderTermRows([
        { termName: " Payment ", termValue: " 30 days ", isIncluded: true },
        { termName: "Delivery", termValue: "Ex-works", isIncluded: false },
      ])
    ).toEqual([
      { termNo: 1, termName: "Payment", termValue: "30 days", isIncluded: true },
      { termNo: 2, termName: "Delivery", termValue: "Ex-works", isIncluded: false },
    ]);
  });

  it("drops rows with neither a name nor a value, and numbers without gaps", () => {
    expect(
      orderTermRows([
        { termName: "", termValue: "  " },
        { termName: "LD Clause", termValue: "" },
      ])
    ).toEqual([{ termNo: 1, termName: "LD Clause", termValue: "", isIncluded: true }]);
  });

  it("handles a missing list", () => {
    expect(orderTermRows(undefined)).toEqual([]);
  });
});

// Payment and delivery terms live as offer-term rows on the quotation
// ("Payment", "Delivery"); the structured payment-terms fields are never set.
// Orders inherit from the rows.
describe("termValue", () => {
  const terms = [
    { termName: "Price", termValue: "Ex-works" },
    { termName: "Delivery", termValue: "As above, ex-works, after receipt of PO" },
    { termName: "Payment", termValue: "50% Advance & Balance against readiness" },
    { termName: "Payment terms (old)", termValue: "ignored: second match" },
  ];

  it("finds a row by name, case-insensitively, first match wins", () => {
    expect(termValue(terms, "payment")).toBe("50% Advance & Balance against readiness");
    expect(termValue(terms, "DELIVERY")).toBe("As above, ex-works, after receipt of PO");
  });

  it("matches a row whose name starts with the word", () => {
    expect(termValue([{ termName: "Payment Terms", termValue: "30 days" }], "payment")).toBe("30 days");
  });

  it("returns an empty string when absent or blank", () => {
    expect(termValue(terms, "insurance")).toBe("");
    expect(termValue([{ termName: "Payment", termValue: null }], "payment")).toBe("");
    expect(termValue(undefined, "payment")).toBe("");
  });
});
