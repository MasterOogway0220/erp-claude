/**
 * A non-standard quotation line is identified by the customer's own item ID
 * (their SAP / tender line number), stored as `materialCodeLabel`. The
 * non-standard copy must print it as ITEM ID, never as a material code —
 * the business has no material codes on non-standard work.
 */
import { describe, expect, it } from "vitest";
import { generateNonStandardQuotationHtml } from "./quotation-nonstandard-template";

const company = { companyName: "NPS Piping Solutions" };
const textOf = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

const quotation = {
  quotationNo: "NPS/26/15271",
  quotationDate: "2026-09-19",
  currency: "USD",
  customer: { name: "Test Customer" },
  terms: [],
  items: [
    { sNo: 1, slNo: "1", materialCodeLabel: "6000061996", itemDescription: "N.A. SEAMLESS PIPE 6\" SCH 40S", quantity: "6", unitRate: "3130", amount: "18780", uom: "Mtr" },
    // ID already inside the description — must not be printed twice
    { sNo: 2, slNo: "2", materialCodeLabel: "20", itemDescription: "ITEM ID: 20\nN.A. PLATE 16MM", quantity: "1", unitRate: "29707", amount: "29707", uom: "Kg" },
  ],
};

describe("the non-standard copy", () => {
  const text = textOf(generateNonStandardQuotationHtml(quotation, company, "QUOTED"));

  it("prints the customer's item ID as ITEM ID", () => {
    expect(text).toContain("ITEM ID: 6000061996");
    expect(text).not.toContain("MATERIAL CODE");
  });

  it("does not repeat an ID the description already carries", () => {
    expect(text.match(/ITEM ID: 20/g)?.length).toBe(1);
  });
});
