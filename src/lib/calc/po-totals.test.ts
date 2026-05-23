import { describe, it, expect } from "vitest";
import { computePOTotals } from "./po-totals";

describe("computePOTotals", () => {
  const baseItem = { qty: 10, unitRate: 100 }; // subtotal: 1000

  it("domestic INR with GST applies cgst+sgst when intra-state", () => {
    const result = computePOTotals({
      items: [baseItem],
      currency: "INR",
      isInternational: false,
      isDomesticDelivery: false,
      gstRate: 18,
      isInterState: false,
      charges: { freight: 0, packing: 0, insurance: 0, other: 0, testing: 0, tpi: 0 },
    });
    expect(result.subtotal).toBe(1000);
    expect(result.cgst).toBe(90);
    expect(result.sgst).toBe(90);
    expect(result.igst).toBe(0);
    expect(result.grandTotal).toBe(1180);
  });

  it("international USD has no GST", () => {
    const result = computePOTotals({
      items: [baseItem],
      currency: "USD",
      isInternational: true,
      isDomesticDelivery: false,
      gstRate: 18,
      isInterState: false,
      charges: { freight: 0, packing: 0, insurance: 0, other: 0, testing: 0, tpi: 0 },
    });
    expect(result.subtotal).toBe(1000);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.igst).toBe(0);
    expect(result.grandTotal).toBe(1000);
  });

  it("international USD with domestic delivery re-enables GST", () => {
    const result = computePOTotals({
      items: [baseItem],
      currency: "USD",
      isInternational: true,
      isDomesticDelivery: true,
      gstRate: 18,
      isInterState: true,
      charges: { freight: 0, packing: 0, insurance: 0, other: 0, testing: 0, tpi: 0 },
    });
    expect(result.subtotal).toBe(1000);
    expect(result.igst).toBe(180);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.grandTotal).toBe(1180);
  });
});
