import { describe, expect, it } from "vitest";
import { letterSummary } from "./letter";

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
