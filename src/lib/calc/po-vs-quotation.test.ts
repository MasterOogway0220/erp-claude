import { describe, expect, it } from "vitest";
import { poVsQuotation, type PoLine, type QuotedLine } from "./po-vs-quotation";

// The order Review step compares the client's order with the quotation. It
// used to pair lines by S.No, so a split client PO line (100 + 20 of a quoted
// 120) or a skipped quoted line shifted every pairing after it.
const quoted: QuotedLine[] = [
  { id: "q1", sNo: 1, quantity: 120, unitRate: 850, amount: 102000 },
  { id: "q2", sNo: 2, quantity: 60, unitRate: 1450, amount: 87000 },
  { id: "q3", sNo: 3, quantity: 10, unitRate: 500, amount: 5000 },
];
const line = (sNo: number, quotationItemId: string | null, quantity: number, unitRate: number): PoLine => ({
  sNo, quotationItemId, product: "C.S. SEAMLESS PIPE", material: "ASTM A106 GR.B", sizeLabel: `${sNo}"NB`,
  quantity, unitRate, amount: quantity * unitRate,
});

describe("poVsQuotation", () => {
  it("sums a split line's parts against their quoted line", () => {
    const rows = poVsQuotation([line(1, "q1", 100, 850), line(2, "q1", 20, 850), line(3, "q2", 60, 1450)], quoted);
    expect(rows.map((r) => [r.itemNo, r.quotationQty, r.poQty, r.poRate, r.poAmount, r.hasVariance])).toEqual([
      ["1, 2", 120, 120, 850, 102000, false],
      ["3", 60, 60, 1450, 87000, false],
    ]);
  });

  it("compares each line of a part order with its own quoted line", () => {
    const rows = poVsQuotation([line(1, "q1", 120, 850), line(2, "q3", 10, 500)], quoted);
    expect(rows.map((r) => [r.itemNo, r.quotationQty, r.quotationRate, r.hasVariance])).toEqual([
      ["1", 120, 850, false],
      ["2", 10, 500, false],
    ]);
  });

  it("shows a short-ordered quantity as a variance", () => {
    const [row] = poVsQuotation([line(1, "q1", 100, 850)], quoted);
    expect([row.qtyVariance, row.amountVariance, row.rateVariance, row.hasVariance]).toEqual([-20, -17000, 0, true]);
  });

  it("shows split parts' average rate, and flags a part at another rate even when they average out", () => {
    const [row] = poVsQuotation([line(1, "q1", 60, 800), line(2, "q1", 60, 900)], quoted);
    expect([row.poQty, row.poAmount, row.poRate, row.rateVariance, row.hasVariance]).toEqual([120, 102000, 850, 0, true]);
  });

  // Each stored amount is rounded to the paisa, so the parts of a split line can
  // sum a paisa away from the quoted amount (121 m @ 50.01 = 6051.21, but
  // 100.5 m and 20.5 m store 5026.01 + 1025.21 = 6051.22).
  it("does not flag the paisa that rounding each split part adds", () => {
    const q: QuotedLine[] = [{ id: "q9", sNo: 1, quantity: 121, unitRate: 50.01, amount: 6051.21 }];
    const parts: PoLine[] = [
      { sNo: 1, quotationItemId: "q9", quantity: 100.5, unitRate: 50.01, amount: 5026.01 },
      { sNo: 2, quotationItemId: "q9", quantity: 20.5, unitRate: 50.01, amount: 1025.21 },
    ];
    expect(poVsQuotation(parts, q)[0].hasVariance).toBe(false);
  });

  it("lists a line added by hand as its own row with nothing quoted", () => {
    const rows = poVsQuotation([line(1, "q1", 120, 850), line(2, null, 5, 100)], quoted);
    expect(rows[1]).toMatchObject({ itemNo: "2", quotationQty: 0, poQty: 5, quotationAmount: 0, hasVariance: true });
  });

  it("pairs by S.No for orders made before lines recorded their quoted line", () => {
    const rows = poVsQuotation([line(1, null, 100, 850), line(2, null, 20, 850)], quoted);
    expect(rows.map((r) => [r.itemNo, r.quotationQty, r.quotationRate])).toEqual([
      ["1", 120, 850],
      ["2", 60, 1450],
    ]);
  });
});
