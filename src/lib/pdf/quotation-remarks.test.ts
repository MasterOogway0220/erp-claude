/**
 * The quotation-level "Remarks:" line.
 *
 * The client's QTN-Rev.2 sheet reserves a Remarks line between the Total row
 * and OFFER TERMS. It was printed as a bare heading for months with nothing
 * behind it; this pins that whatever is typed on the form reaches the page,
 * in the right place, and that an empty remark does not leave a stray block
 * on the non-standard copy (which has no fixed slot for it).
 */
import { describe, expect, it } from "vitest";
import { generateStandardQuotationHtml } from "./quotation-standard-template";
import { generateNonStandardQuotationHtml } from "./quotation-nonstandard-template";

type Quotation = Parameters<typeof generateStandardQuotationHtml>[0];
const company = { companyName: "NPS Piping Solutions" };

const textOf = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

const base: Quotation = {
  quotationNo: "NPS/26/15213",
  quotationDate: "2026-09-19",
  currency: "USD",
  customer: { name: "Test Customer" },
  items: [{ sNo: 1, slNo: "1", product: "N.A. SEAMLESS PIPE", quantity: "6", unitRate: "3130", amount: "18780", uom: "Mtr" }],
  terms: [],
};

describe("the Remarks line", () => {
  it("prints the saved remark between Total and OFFER TERMS on the standard copy", () => {
    const text = textOf(generateStandardQuotationHtml({ ...base, remarks: "Price valid for full lot & <one> shipment" }, company, "QUOTED"));
    // Escaped on purpose: a "<" typed in a remark must reach the page as
    // text, never as markup.
    const remarks = text.indexOf("Remarks: Price valid for full lot &amp; &lt;one&gt; shipment");
    expect(remarks).toBeGreaterThan(text.indexOf("Total"));
    expect(remarks).toBeLessThan(text.indexOf("OFFER TERMS"));
  });

  it("still prints the bare heading on the standard copy when blank (it is part of the format)", () => {
    expect(textOf(generateStandardQuotationHtml(base, company, "QUOTED"))).toContain("Remarks:");
  });

  it("prints the remark on the non-standard copy only when there is one", () => {
    expect(textOf(generateNonStandardQuotationHtml(base, company, "QUOTED"))).not.toContain("Remarks:");
    const text = textOf(generateNonStandardQuotationHtml({ ...base, remarks: "Ex-stock Mumbai" }, company, "QUOTED"));
    expect(text.indexOf("Remarks: Ex-stock Mumbai")).toBeLessThan(text.indexOf("OFFER TERMS"));
  });
});
