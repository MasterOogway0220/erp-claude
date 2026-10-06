import { describe, expect, it } from "vitest";
import { letterAddressee, letterData, letterSummary, type AcceptanceForLetter } from "./letter";

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

// The letter used to go to the customer master address even when the client
// PO named another billing address (a client billing from another site or
// GST registration).
describe("letterAddressee", () => {
  const customer = {
    name: "Spraytech Systems (India) Pvt. Ltd.", contactPerson: null, email: null, phone: null,
    addressLine1: "Plot No.: R-513, T.T.C. Industrial Area", addressLine2: "MIDC Rabale, Navi Mumbai",
    city: "Thane", state: "Maharashtra", gstNo: "27AAKCS8770L1ZI",
  };
  const site = {
    companyName: "Spraytech Systems (India) Pvt. Ltd. - Unit 2", addressLine1: "Plot 12, Wagle Industrial Area",
    addressLine2: "Road No. 16", city: "Thane", pincode: "400604", state: "Maharashtra", gstNo: null,
  };

  it("keeps the customer master address when the PO names no billing address", () => {
    expect(letterAddressee(customer, null, null)).toBe(customer);
  });

  it("prints the PO's billing site, with its PIN", () => {
    expect(letterAddressee(customer, site, null)).toEqual({
      ...customer,
      name: "Spraytech Systems (India) Pvt. Ltd. - Unit 2",
      addressLine1: "Plot 12, Wagle Industrial Area",
      addressLine2: "Road No. 16",
      city: "Thane - 400604",
      state: "Maharashtra",
      gstNo: "27AAKCS8770L1ZI",
    });
  });

  it("uses the site's own GSTIN, and the customer's only for a site in the same state", () => {
    expect(letterAddressee(customer, { ...site, gstNo: "27AAKCS8770L2ZH" }, null).gstNo).toBe("27AAKCS8770L2ZH");
    expect(letterAddressee(customer, { ...site, state: "Gujarat" }, null).gstNo).toBeNull();
  });

  it("keeps the customer's name for a site without a company name", () => {
    expect(letterAddressee(customer, { ...site, companyName: null }, null).name).toBe(customer.name);
  });

  // Typed as "Billing name, address, GSTIN": the billing entity can differ from
  // the customer master, so its name comes from the typed text, not the master.
  it("prints a typed billing address as written: first line as the name, the rest as the address", () => {
    expect(letterAddressee(customer, site, "  Spraytech Projects LLP\nGate 2, Thane 400604\nGSTIN: 27AAKCS8770L1ZI  ")).toEqual({
      ...customer,
      name: "Spraytech Projects LLP",
      addressLine1: "Gate 2, Thane 400604\nGSTIN: 27AAKCS8770L1ZI",
      addressLine2: null,
      city: null,
      state: null,
      gstNo: null,
    });
    expect(letterAddressee(customer, null, "Spraytech, Gate 2").addressLine1).toBeNull();
  });
});

describe("letterData terms", () => {
  it("prints term values without a stored leading colon", () => {
    const acceptance = {
      acceptanceNo: "POA/2026-27/00012", acceptanceDate: new Date("2026-10-06"), committedDeliveryDate: new Date("2026-11-17"),
      otherChargesDescription: null, company: null, createdBy: { name: "Akash", email: null, phone: null },
      clientPurchaseOrder: {
        cpoNo: "CPO/2026-27/00014", clientPoNumber: "E2E-CPO-NS-0610", currency: "INR", subtotal: 72000, grandTotal: 88730,
        customer: { name: "Universal Heat Exchangers Limited" },
        items: [],
        terms: [{ termName: "Price", termValue: ": Ex-Godown, Navi Mumbai, India" }, { termName: "GST", termValue: "18% GST extra" }],
      },
    } as unknown as AcceptanceForLetter;

    expect(letterData(acceptance, "https://erp.example").data.terms).toEqual([
      { termName: "Price", termValue: "Ex-Godown, Navi Mumbai, India" },
      { termName: "GST", termValue: "18% GST extra" },
    ]);
  });
});
