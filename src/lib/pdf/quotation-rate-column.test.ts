/**
 * What is allowed to appear in a quotation's Unit Rate / Amount columns.
 *
 * The rule the business asked for: a line is either priced with a number
 * (0 included, for something supplied free or included in another line) or it
 * is regretted, and REGRET is then the only word that may stand in for a
 * price. Nothing else — no "TBA", no "on request", no placeholder 1.00.
 *
 * These render the real templates rather than asserting the rule in prose,
 * because the rule is only worth anything if it survives to the printed page.
 */
import { describe, expect, it } from "vitest";
import { generateStandardQuotationHtml } from "./quotation-standard-template";
import { generateNonStandardQuotationHtml } from "./quotation-nonstandard-template";
import { normalizeItemPricing, type WritableItem } from "../quotations/pricing";
import { priceCellWord } from "../quotations/display";

// Derived from the functions themselves — the templates do not export their
// interfaces, and deriving beats casting to any.
type Quotation = Parameters<typeof generateStandardQuotationHtml>[0];
type Company = Parameters<typeof generateStandardQuotationHtml>[1];

const company: Company = { companyName: "NPS Piping Solutions" };

/** Strip tags so a cell's text can be matched without HTML noise. */
const textOf = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

/**
 * The text of the single item row containing `needle`. Closing at `</tr>`
 * matters: without it the last item row runs on into the Total row, which on a
 * technical copy legitimately reads QUOTED and made this assertion lie.
 */
const rowOf = (html: string, needle: string) =>
  textOf((html.split("<tr").find((r) => r.includes(needle)) ?? "").split("</tr>")[0]);

function quotationWith(items: unknown[]): Quotation {
  return {
    quotationNo: "NPS/26/15213",
    quotationDate: "2026-08-19",
    currency: "INR",
    customer: { name: "Test Customer" },
    items,
    terms: [],
  };
}

// One of each state, which is the whole point: they must be distinguishable
// on the page, not just in the database.
const items = [
  { sNo: 1, slNo: "1", product: "C.S. SEAMLESS PIPE", quantity: "10", unitRate: "1590", amount: "15900", uom: "Mtr" },
  { sNo: 2, slNo: "2", product: "C.S. SAW PIPE", quantity: "5", unitRate: "0", amount: "0", uom: "Mtr" },
  { sNo: 3, slNo: "3", product: "L.T.C.S. PIPE", quantity: "8", unitRate: null, isRegret: true, amount: "0", uom: "Mtr" },
];

describe("the standard quotation PDF", () => {
  const html = generateStandardQuotationHtml(quotationWith(items), company, "QUOTED");

  it("prints a regretted line as REGRET", () => {
    expect(textOf(html)).toContain("REGRET");
  });

  it("prints a deliberate zero rate as 0.00, not blank and not REGRET", () => {
    // The zero-rate row must carry a real number; if 0 were still treated as
    // "unpriced" this cell would render empty.
    const zeroRow = rowOf(html, "C.S. SAW PIPE");
    expect(zeroRow).toContain("0.00");
    expect(zeroRow).not.toContain("REGRET");
  });

  it("keeps a regretted line out of the total", () => {
    // 15900 + 0 + 0 — the regretted line contributes nothing.
    expect(textOf(html)).toContain("15,900.00");
  });

  it("prints REGRET on the technical copy too, never QUOTED", () => {
    const technical = generateStandardQuotationHtml(quotationWith(items), company, "UNQUOTED");
    const regretRow = rowOf(technical, "L.T.C.S. PIPE");
    expect(regretRow).toContain("REGRET");
    expect(regretRow).not.toContain("QUOTED");
  });
});

describe("the non-standard quotation PDF", () => {
  const nsItems = items.map((i) => ({ ...i, itemDescription: i.product }));

  it("prints REGRET on both the commercial and the technical sheet", () => {
    for (const variant of ["QUOTED", "UNQUOTED"] as const) {
      const html = generateNonStandardQuotationHtml(quotationWith(nsItems), company, variant);
      const regretRow = rowOf(html, "L.T.C.S. PIPE");
      expect(regretRow).toContain("REGRET");
      expect(regretRow).not.toContain("QUOTED");
    }
  });

  it("prints a deliberate zero rate as 0.00", () => {
    const html = generateNonStandardQuotationHtml(quotationWith(nsItems), company, "QUOTED");
    expect(rowOf(html, "C.S. SAW PIPE")).toContain("0.00");
  });
});

/**
 * The downloaded PDF is rendered by react-pdf, whose output encodes glyphs with
 * a subset font — the text cannot be read back out of the buffer without a PDF
 * parser. So all three renderers share this one decision instead, and it is
 * asserted here directly; that is what gives the download path coverage of the
 * only part that can be wrong.
 */
describe("which word may replace a price, for every renderer", () => {
  it("returns REGRET for a declined line", () => {
    expect(priceCellWord({ isRegret: true }, false)).toBe("REGRET");
  });

  it("prefers REGRET over QUOTED on the technical copy", () => {
    // QUOTED would imply a price exists for a line that deliberately has none.
    expect(priceCellWord({ isRegret: true }, true)).toBe("REGRET");
  });

  it("returns QUOTED for an ordinary line on the technical copy", () => {
    expect(priceCellWord({ isRegret: false }, true)).toBe("QUOTED");
  });

  it("returns null for an ordinary line on the commercial copy, so the number prints", () => {
    expect(priceCellWord({ isRegret: false }, false)).toBeNull();
    expect(priceCellWord({}, false)).toBeNull();
  });

  it("offers no third word", () => {
    const words = [true, false].flatMap((regret) =>
      [true, false].map((unquoted) => priceCellWord({ isRegret: regret }, unquoted))
    );
    expect(new Set(words)).toEqual(new Set(["REGRET", "QUOTED", null]));
  });
});

describe("no other text can reach the rate column", () => {
  // The column is a Decimal, so the guard that matters is the one on the way
  // in. Anything that is not a number is refused outright rather than being
  // coerced to 0 and quietly printed as a price.
  it.each(["REGRET", "regret", "TBA", "N/A", "on request", "-", "1,590", "abc"])(
    "refuses %o as a unit rate",
    (rate) => {
      expect(normalizeItemPricing({ quantity: "1", unitRate: rate })).toMatch(/unit rate/);
    }
  );

  it("accepts the only two things that are allowed: a number, or the regret flag", () => {
    expect(normalizeItemPricing({ quantity: "1", unitRate: "0" })).toBeNull();
    expect(normalizeItemPricing({ quantity: "1", unitRate: "1590.50" })).toBeNull();
    expect(normalizeItemPricing({ quantity: "1", isRegret: true })).toBeNull();
  });

  it("does not let a regretted line smuggle a price through", () => {
    const item: WritableItem = { quantity: "1", unitRate: "9999", amount: "9999", isRegret: true };
    normalizeItemPricing(item);
    expect(item.unitRate).toBeNull();
    expect(item.amount).toBe("0");
  });
});
