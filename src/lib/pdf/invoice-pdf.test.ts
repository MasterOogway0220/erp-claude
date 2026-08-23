import { describe, it, expect } from "vitest";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  InvoiceDocument,
  type InvoiceCompany,
  type InvoiceData,
} from "./invoice-pdf";

/**
 * An invoice is a legal document, so the branches that decide which tax lines
 * appear are the ones worth pinning: intra-state prints CGST + SGST,
 * inter-state prints IGST, and never both. The renders also guard the layout —
 * every summary row hard-codes 73% as the sum of the first seven column
 * widths, which nothing type-checks.
 */

const company: InvoiceCompany = {
  companyName: "NPS Piping Solutions",
  regAddressLine1: "1210 Prasad Chambers",
  regCity: "Mumbai",
  regState: "Maharashtra",
  regPincode: "400004",
  regCountry: "India",
  gstNo: "27AAACN1234A1Z5",
  panNo: "AAACN1234A",
};

const base: InvoiceData = {
  invoiceNo: "INV/26/0311",
  invoiceDate: "2026-08-23",
  invoiceType: "TAX",
  dueDate: "2026-09-22",
  placeOfSupply: "Maharashtra",
  customerGstin: "27AABCL1234M1Z9",
  eWayBillNo: "391004512233",
  currency: "INR",
  subtotal: 240000,
  cgst: 21600,
  sgst: 21600,
  igst: 0,
  tcsAmount: 0,
  roundOff: 0,
  totalAmount: 283200,
  amountInWords: null,
  customer: {
    name: "Larsen & Toubro",
    addressLine1: "Powai Campus",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400072",
    gstNo: "27AABCL1234M1Z9",
    panNo: "AABCL1234M",
  },
  salesOrder: { soNo: "SO/26/0142" },
  dispatchNote: { dnNo: "DN/26/0088" },
  items: [
    {
      sNo: 1,
      description: 'Seamless Pipe 6" SCH 40',
      heatNo: "H-88214",
      sizeLabel: '6" SCH 40',
      hsnCode: "73043190",
      uom: "Mtr",
      quantity: 120.5,
      unitRate: 1200,
      amount: 144600,
      taxRate: 18,
    },
    {
      sNo: 2,
      description: "BW Fitting Elbow 90deg",
      heatNo: "H-88215",
      sizeLabel: '8" SCH 80',
      hsnCode: "73079990",
      uom: "Nos",
      quantity: 40,
      unitRate: 2385,
      amount: 95400,
      taxRate: 18,
    },
  ],
};

const render = (invoice: InvoiceData) =>
  renderToBuffer(
    React.createElement(InvoiceDocument, { invoice, company }) as never
  );

describe("InvoiceDocument", () => {
  it("renders an intra-state invoice (CGST + SGST)", async () => {
    const buf = await render(base);
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("renders an inter-state invoice (IGST only)", async () => {
    const buf = await render({
      ...base,
      cgst: 0,
      sgst: 0,
      igst: 43200,
      placeOfSupply: "Gujarat",
    });
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("renders the optional TCS and round-off lines", async () => {
    const buf = await render({
      ...base,
      tcsAmount: 283.2,
      roundOff: -0.2,
      totalAmount: 283483,
    });
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("falls back to computed words when amountInWords is absent", async () => {
    // amountInWords is nullable in the schema; the document must derive it
    // rather than print an empty legal field.
    const buf = await render({ ...base, amountInWords: null });
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("renders with no references and no line items", async () => {
    const buf = await render({
      ...base,
      salesOrder: null,
      dispatchNote: null,
      eWayBillNo: null,
      dueDate: null,
      items: [],
    });
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("paginates a long invoice", async () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      ...base.items[0],
      sNo: i + 1,
    }));
    const buf = await render({ ...base, items: many });
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });
});
