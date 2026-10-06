import { describe, expect, it } from "vitest";
import { termValue, orderTermRows, tenderTermRows, cleanTermValue } from "./terms";

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

// A tender keeps its terms the way a quotation does: template rows plus rows
// the user added, which must stay renamable and removable after a reload.
describe("tenderTermRows", () => {
  it("numbers rows in order, trims, keeps the included and custom flags", () => {
    expect(
      tenderTermRows([
        { termName: " Payment ", termValue: " 30 days ", isIncluded: true, isCustom: false },
        { termName: "LD Clause", termValue: "0.5% per week", isIncluded: false, isCustom: true },
      ])
    ).toEqual([
      { termNo: 1, termName: "Payment", termValue: "30 days", isIncluded: true, isCustom: false },
      { termNo: 2, termName: "LD Clause", termValue: "0.5% per week", isIncluded: false, isCustom: true },
    ]);
  });

  it("drops blank rows, numbers without gaps, defaults the flags", () => {
    expect(
      tenderTermRows([
        { termName: " ", termValue: "", isCustom: true },
        { termName: "Validity", termValue: "" },
      ])
    ).toEqual([{ termNo: 1, termName: "Validity", termValue: "", isIncluded: true, isCustom: false }]);
  });

  it("handles a missing list", () => {
    expect(tenderTermRows(null)).toEqual([]);
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

  // Some stored values begin with ": " (the first case is a live value); an
  // order's Payment Terms must not inherit it.
  it("strips a leading colon and whitespace, keeping colons inside the value", () => {
    expect(
      termValue([{ termName: "Payment", termValue: ": 50% advance against Proforma Invoice & Balance prior to dispatch" }], "payment")
    ).toBe("50% advance against Proforma Invoice & Balance prior to dispatch");
    expect(termValue([{ termName: "Delivery", termValue: "  :  Ex-works: Mumbai " }], "delivery")).toBe("Ex-works: Mumbai");
    expect(termValue([{ termName: "Payment", termValue: " : " }], "payment")).toBe("");
  });
});

// PDFs print a term as "Name : value"; a stored value that already begins
// with ": " came out as "Price : : Ex-Godown".
describe("cleanTermValue", () => {
  it("drops a leading colon and the spaces around it", () => {
    expect(cleanTermValue(": Ex-Godown, Navi Mumbai, India")).toBe("Ex-Godown, Navi Mumbai, India");
    expect(cleanTermValue(" :: 2% Extra ")).toBe("2% Extra");
  });

  it("keeps a value without one, and colons inside the value", () => {
    expect(cleanTermValue("18% GST extra")).toBe("18% GST extra");
    expect(cleanTermValue("Ex-works: Mumbai")).toBe("Ex-works: Mumbai");
  });

  it("returns an empty string for a missing value", () => {
    expect(cleanTermValue(null)).toBe("");
    expect(cleanTermValue(undefined)).toBe("");
  });
});
