import { describe, expect, it } from "vitest";
import { tenderItemRows } from "./items";

// A tender's BOQ lines are written by create and replaced wholesale by edit;
// both go through one mapping so an edited line is stored the way a new one is.
describe("tenderItemRows", () => {
  it("numbers lines 1..n and computes the amount from qty x estimated rate", () => {
    expect(
      tenderItemRows([
        { product: "C.S. SEAMLESS PIPE", material: "A106 Gr.B", sizeLabel: '6" SCH 40', quantity: "120.5", uom: "Mtr", estimatedRate: "1200", remarks: "" },
        { product: "FLANGE", quantity: 4, estimatedRate: null },
      ])
    ).toEqual([
      { sNo: 1, product: "C.S. SEAMLESS PIPE", material: "A106 Gr.B", additionalSpec: null, sizeLabel: '6" SCH 40', quantity: 120.5, uom: "Mtr", estimatedRate: 1200, amount: 144600, remarks: null },
      { sNo: 2, product: "FLANGE", material: null, additionalSpec: null, sizeLabel: null, quantity: 4, uom: null, estimatedRate: null, amount: null, remarks: null },
    ]);
  });

  it("treats a missing or junk quantity as 0", () => {
    expect(tenderItemRows([{ product: "X", quantity: "" }])[0].quantity).toBe(0);
  });

  it("returns no rows for no items", () => {
    expect(tenderItemRows([])).toEqual([]);
    expect(tenderItemRows(undefined)).toEqual([]);
  });
});
