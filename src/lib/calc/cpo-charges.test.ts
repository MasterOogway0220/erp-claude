import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_CHARGES, chargePayload, cpoGst } from "./cpo-charges";

/**
 * The client PO form used to derive each tax flag's name from its amount
 * column (`tpiCharges` -> `tpiChargesTaxApplicable`). Three of the six model
 * columns are named differently (`tpiTaxApplicable`, ...), so those flags
 * never reached the server and GST was computed on too small a base.
 */
describe("client PO additional charges", () => {
  const route = readFileSync(
    path.resolve(__dirname, "../../app/api/client-purchase-orders/route.ts"),
    "utf8"
  );

  it("names every tax flag the way the POST route reads it", () => {
    for (const c of DEFAULT_CHARGES) {
      expect(route, `${c.taxKey} not read by POST`).toMatch(new RegExp(`\\b${c.taxKey}\\b,`));
      expect(route, `${c.key} not read by POST`).toMatch(new RegExp(`\\b${c.key}\\b,`));
    }
  });

  it("defaults every charge to tax applicable", () => {
    expect(DEFAULT_CHARGES.every((c) => c.taxApplicable)).toBe(true);
  });

  it("builds the payload from the explicit flag names", () => {
    const charges = DEFAULT_CHARGES.map((c) =>
      c.key === "tpiCharges" ? { ...c, amount: 1000 } : c.key === "packingForwarding" ? { ...c, amount: 200, taxApplicable: false } : c
    );
    const p = chargePayload(charges);
    expect(p.tpiCharges).toBe(1000);
    expect(p.tpiTaxApplicable).toBe(true);
    expect(p.packingForwarding).toBe(200);
    expect(p.packingTaxApplicable).toBe(false);
    expect(p.freight).toBe(0);
    expect(p).not.toHaveProperty("tpiChargesTaxApplicable");
    expect(p).not.toHaveProperty("packingForwardingTaxApplicable");
  });

  // "Others" is the one charge whose name says nothing; the user states what it is.
  it("sends what the Others charge is, trimmed, null when blank", () => {
    const withDesc = DEFAULT_CHARGES.map((c) =>
      c.key === "otherCharges" ? { ...c, amount: 500, description: "  Crane hire " } : c
    );
    expect(chargePayload(withDesc).otherChargesDescription).toBe("Crane hire");
    expect(chargePayload(DEFAULT_CHARGES).otherChargesDescription).toBeNull();
    expect(route, "otherChargesDescription not read by POST").toMatch(/\botherChargesDescription\b,/);
  });
});

/**
 * The create screen showed "GST not applicable" on an export yet posted its
 * 18% default, and the POST added GST whenever the rate was above 0.
 */
describe("client PO GST", () => {
  it("charges no GST on an export, whatever rate the form sent", () => {
    const order = { taxableAmount: 1000, gstRate: 18, isInterState: true };
    expect(cpoGst({ ...order, currency: "USD", isDomesticDelivery: false })).toEqual({ gstRate: 0, cgst: 0, sgst: 0, igst: 0 });
    // A foreign-currency order delivered to an Indian site is a domestic supply.
    expect(cpoGst({ ...order, currency: "USD", isDomesticDelivery: true })).toEqual({ gstRate: 18, cgst: 0, sgst: 0, igst: 180 });
  });

  it("splits GST into CGST + SGST within a state and IGST across states", () => {
    const inr = { taxableAmount: 1000, gstRate: 18, currency: "INR", isDomesticDelivery: false };
    expect(cpoGst({ ...inr, isInterState: false })).toEqual({ gstRate: 18, cgst: 90, sgst: 90, igst: 0 });
    expect(cpoGst({ ...inr, isInterState: true })).toEqual({ gstRate: 18, cgst: 0, sgst: 0, igst: 180 });
  });
});
