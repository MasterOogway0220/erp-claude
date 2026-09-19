/**
 * Whose name goes in the quotation's Contact / Email cells.
 *
 * It is the deal owner — the salesperson who owns the enquiry — not the login
 * that keyed the quotation in. An admin preparing an offer on a salesperson's
 * behalf must not end up as the customer's point of contact. The creator is
 * printed only when no owner is assigned.
 */
import { describe, expect, it } from "vitest";
import { generateStandardQuotationHtml } from "./quotation-standard-template";
import { generateNonStandardQuotationHtml } from "./quotation-nonstandard-template";

const company = { companyName: "NPS Piping Solutions" };
const textOf = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

const admin = { name: "Admin User", email: "admin@nps.example" };
const owner = { name: "U C Jain", email: "ucjain@nps.example", phone: "9876543210" };

const base = {
  quotationNo: "NPS/26/15271",
  quotationDate: "2026-09-19",
  currency: "INR",
  customer: { name: "Test Customer" },
  items: [{ sNo: 1, slNo: "1", product: "C.S. SEAMLESS PIPE", quantity: "1", unitRate: "100", amount: "100", uom: "Mtr" }],
  terms: [],
};

describe.each([
  ["standard", generateStandardQuotationHtml],
  ["non-standard", generateNonStandardQuotationHtml],
] as const)("the %s copy's contact block", (_, render) => {
  it("prints the deal owner when one is assigned, not the creator", () => {
    const text = textOf(render({ ...base, preparedBy: admin, dealOwner: owner }, company, "QUOTED"));
    expect(text).toContain("U C Jain");
    expect(text).toContain("ucjain@nps.example");
    expect(text).not.toContain("Admin User");
    expect(text).not.toContain("admin@nps.example");
  });

  it("falls back to the creator when no owner is assigned", () => {
    const text = textOf(render({ ...base, preparedBy: admin, dealOwner: null }, company, "QUOTED"));
    expect(text).toContain("Admin User");
  });
});
