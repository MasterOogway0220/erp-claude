import { describe, expect, it } from "vitest";
import { letterData, letterSummary, type AcceptanceForLetter } from "./letter";

// The letter's Total is the client PO grand total (material + charges + GST).
// These rows show what makes it up, so the total adds up on the page.
describe("letterSummary", () => {
  const cpo = {
    subtotal: 144000, freight: 100, tpiCharges: 1000, testingCharges: null, packingForwarding: 0,
    insurance: null, otherCharges: 600, gstRate: 18, cgst: 13311, sgst: 13311, igst: null, roundOff: 0.5,
  };

  it("lists material value, non-zero charges, GST split and round-off", () => {
    expect(letterSummary(cpo, "Crane hire")).toEqual([
      { label: "Material Value", amount: 144000 },
      { label: "Freight", amount: 100 },
      { label: "TPI Charges", amount: 1000 },
      { label: "Others — Crane hire", amount: 600 },
      { label: "CGST @ 9%", amount: 13311 },
      { label: "SGST @ 9%", amount: 13311 },
      { label: "Round Off", amount: 0.5 },
    ]);
  });

  it("labels Others plainly without a description, and shows IGST at the full rate", () => {
    const rows = letterSummary({ ...cpo, cgst: null, sgst: null, igst: 26622, roundOff: null }, null);
    expect(rows.map((r) => r.label)).toEqual(["Material Value", "Freight", "TPI Charges", "Others", "IGST @ 18%"]);
  });
});

// A non-standard line's product reads only "Non-Standard Item"; what the item
// is lives in its itemDescription, which the letter used to leave out.
describe("letterData", () => {
  it("prints a non-standard line's own description as its product", () => {
    const line = {
      poSlNo: null, poItemCode: null, material: null, additionalSpec: null, sizeLabel: null, ends: null,
      uom: "Nos", qtyOrdered: 2, unitRate: 500, amount: 1000,
    };
    const acceptance = {
      acceptanceNo: "POA/2026-27/00042",
      acceptanceDate: new Date("2026-10-06"),
      committedDeliveryDate: new Date("2026-12-15"),
      otherChargesDescription: null,
      company: null,
      createdBy: { name: "U C Jain", email: null, phone: null },
      clientPurchaseOrder: {
        cpoNo: "CPO/2026-27/00013", clientPoNumber: "RBL-340/26-27", currency: "INR", subtotal: 2000, grandTotal: 2360,
        customer: { name: "Spraytech Systems (India) Pvt. Ltd." },
        terms: [],
        items: [
          { ...line, sNo: 1, product: "Non-Standard Item", itemDescription: "ITEM ID: 20\nN.A. PLATE 16MM" },
          { ...line, sNo: 2, product: "C.S. SEAMLESS PIPE", itemDescription: null },
        ],
      },
    } as unknown as AcceptanceForLetter;

    expect(letterData(acceptance, "https://erp.example").data.items.map((i) => i.product)).toEqual([
      "ITEM ID: 20\nN.A. PLATE 16MM",
      "C.S. SEAMLESS PIPE",
    ]);
  });
});
