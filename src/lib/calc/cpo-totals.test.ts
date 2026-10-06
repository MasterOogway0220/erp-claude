import { describe, it, expect } from "vitest";
import { cpoTotals } from "./cpo-totals";

/**
 * The P.O. acceptance screen charged GST on the material value plus every
 * charge, while the client PO taxes only the charges ticked Taxable, so the
 * two disagreed whenever a charge was unticked. These figures are worked by
 * hand the way the client PO POST route works them.
 */
describe("cpoTotals", () => {
  const freightTaxed = { amount: 100, taxApplicable: true };
  const insuranceUntaxed = { amount: 50.5, taxApplicable: false };

  it("taxes only the ticked charges, adds every charge, and rounds to the rupee", () => {
    // Taxable 13,612.45 x 9% = 1,225.1205 each half. Total before rounding
    // 13,512.45 + 150.50 + 2,450.241 = 16,113.191.
    expect(
      cpoTotals({ subtotal: 13512.45, charges: [freightTaxed, insuranceUntaxed], gstRate: 18, isInterState: false })
    ).toEqual({
      subtotal: 13512.45,
      additionalChargesTotal: 150.5,
      taxableAmount: 13612.45,
      cgst: 1225.12,
      sgst: 1225.12,
      igst: 0,
      roundOff: -0.19,
      grandTotal: 16113,
    });
  });

  it("levies IGST at the full rate on an inter-state order", () => {
    const t = cpoTotals({ subtotal: 13512.45, charges: [freightTaxed, insuranceUntaxed], gstRate: 18, isInterState: true });
    expect([t.cgst, t.sgst, t.igst]).toEqual([0, 0, 2450.24]);
    expect([t.roundOff, t.grandTotal]).toEqual([-0.19, 16113]);
  });

  it("charges no GST at a zero rate and rounds half a rupee and more up", () => {
    const t = cpoTotals({ subtotal: 1000.65, charges: [{ amount: 10, taxApplicable: true }], gstRate: 0, isInterState: false });
    expect([t.taxableAmount, t.cgst, t.sgst, t.igst]).toEqual([1010.65, 0, 0, 0]);
    expect([t.roundOff, t.grandTotal]).toEqual([0.35, 1011]);
  });

  // 88.2 m x 4,224.50 + 24 x 71.74 sums to 374,322.66000000003 in floating
  // point, so the total lands a hair above the rupee. A round-off of -0
  // printed as "+-0.00".
  it("reports a round-off of 0, not -0, when the total lands on the rupee", () => {
    const t = cpoTotals({
      subtotal: 88.2 * 4224.5 + 24 * 71.74,
      charges: [{ amount: 608.03, taxApplicable: false }, { amount: 19.31, taxApplicable: false }],
      gstRate: 0,
      isInterState: false,
    });
    expect(t.subtotal).toBe(374322.66);
    expect(t.grandTotal).toBe(374950);
    expect(t.roundOff).toBe(0);
  });
});
