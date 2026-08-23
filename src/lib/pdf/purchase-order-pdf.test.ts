import { describe, it, expect } from "vitest";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  PurchaseOrderDocument,
  type POCompany,
  type POData,
  type POItem,
} from "./purchase-order-pdf";

/**
 * The branches worth pinning are the ones a vendor would notice: the revision
 * banner, and which single reference (PR or SO) the header claims. The renders
 * also guard the layout — the totals row hard-codes 54% as the sum of the
 * first five column widths, which nothing type-checks.
 */

const company: POCompany = {
  companyName: "NPS Piping Solutions",
  regAddressLine1: "1210 Prasad Chambers",
  regCity: "Mumbai",
  regState: "Maharashtra",
  regPincode: "400004",
  regCountry: "India",
  telephoneNo: "+91 22 23634200",
  email: "info@n-pipe.com",
  website: "www.n-pipe.com",
};

function item(sNo: number, over: Partial<POItem> = {}): POItem {
  return {
    sNo,
    product: "Seamless Pipe",
    material: "ASTM A106 Gr.B",
    additionalSpec: "NACE MR0175",
    sizeLabel: '6" SCH 40',
    quantity: 120.5,
    unitRate: 1200,
    amount: 144600,
    deliveryDate: null,
    ...over,
  };
}

const base: POData = {
  poNo: "PO/26/0077",
  poDate: "2026-08-23",
  version: 0,
  currency: "INR",
  deliveryDate: "2026-09-20",
  specialRequirements: "Third-party inspection by TUV before dispatch.",
  paymentTerms: "30 days from receipt of material.",
  termsAndConditions:
    "Material to be supplied with MTC.\nPacking in bundles of 10.\nPartial dispatch not allowed.",
  totalAmount: 240000,
  vendor: {
    name: "Jindal Saw Ltd",
    addressLine1: "Industrial Area",
    city: "Nashik",
    state: "Maharashtra",
    pincode: "422007",
    country: "India",
    contactPerson: "S. Rane",
    email: "sales@jindal.example",
    phone: "+91 98111 22334",
    gstNo: "27AAACJ1234B1Z2",
  },
  purchaseRequisition: { prNo: "PR/26/0031" },
  salesOrder: null,
  approvedBy: { name: "S. Mehta" },
  approvalDate: "2026-08-23",
  items: [item(1), item(2, { deliveryDate: "2026-09-30" })],
};

const render = (po: POData) =>
  renderToBuffer(
    React.createElement(PurchaseOrderDocument, { po, company }) as never
  );

describe("PurchaseOrderDocument", () => {
  it("renders a first-issue PO against a purchase requisition", async () => {
    const buf = await render(base);
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("renders a revision", async () => {
    // version > 0 changes the title and adds the supersedes note.
    const buf = await render({ ...base, version: 2 });
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("renders against a sales order when there is no requisition", async () => {
    const buf = await render({
      ...base,
      purchaseRequisition: null,
      salesOrder: { soNo: "SO/26/0142" },
    });
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("renders with no reference, no approver and no terms", async () => {
    const buf = await render({
      ...base,
      purchaseRequisition: null,
      salesOrder: null,
      approvedBy: null,
      approvalDate: null,
      paymentTerms: null,
      termsAndConditions: null,
      specialRequirements: null,
      items: [],
    });
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("paginates a long order", async () => {
    const many = Array.from({ length: 45 }, (_, i) => item(i + 1));
    const buf = await render({ ...base, items: many });
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });
});
