import { describe, expect, it } from "vitest";
import { fillBlankCurrencyTerm, resolveUpdateCurrency } from "./currency";

describe("resolveUpdateCurrency", () => {
  it("uses the currency the client sent", () => {
    expect(resolveUpdateCurrency("USD", "INR")).toBe("USD");
    expect(resolveUpdateCurrency("AED", "USD")).toBe("AED");
  });

  // The regression this file exists for: NPS/26/15214 was an EXPORT quotation
  // in USD. An update arrived without a usable currency and the old
  // `currency || "INR"` repriced it to INR behind the user's back.
  it("keeps the stored currency when the payload omits one", () => {
    expect(resolveUpdateCurrency(undefined, "USD")).toBe("USD");
    expect(resolveUpdateCurrency(null, "USD")).toBe("USD");
    expect(resolveUpdateCurrency("", "USD")).toBe("USD");
    expect(resolveUpdateCurrency("   ", "USD")).toBe("USD");
  });

  it("never silently rewrites a non-INR quotation to INR", () => {
    for (const stored of ["USD", "EUR", "AED", "GBP"]) {
      expect(resolveUpdateCurrency("", stored)).toBe(stored);
      expect(resolveUpdateCurrency(undefined, stored)).toBe(stored);
    }
  });

  it("falls back to INR only when nothing is known", () => {
    expect(resolveUpdateCurrency(undefined, null)).toBe("INR");
    expect(resolveUpdateCurrency("", "")).toBe("INR");
  });

  it("ignores non-string payload values rather than coercing them", () => {
    expect(resolveUpdateCurrency(0, "USD")).toBe("USD");
    expect(resolveUpdateCurrency(false, "USD")).toBe("USD");
    expect(resolveUpdateCurrency({}, "USD")).toBe("USD");
  });
});

describe("fillBlankCurrencyTerm", () => {
  const term = (termName: string, termValue: string) => ({ termName, termValue });

  it("fills a blank Currency term from the header currency", () => {
    expect(fillBlankCurrencyTerm([term("Currency", "")], "USD")).toEqual([
      term("Currency", "USD"),
    ]);
  });

  it("matches the term by name, case-insensitively and as a substring", () => {
    expect(fillBlankCurrencyTerm([term("CURRENCY OF PAYMENT", "")], "EUR")).toEqual([
      term("CURRENCY OF PAYMENT", "EUR"),
    ]);
  });

  it("never overwrites a value someone typed by hand", () => {
    expect(fillBlankCurrencyTerm([term("Currency", "USD ($)")], "INR")).toEqual([
      term("Currency", "USD ($)"),
    ]);
  });

  it("leaves unrelated terms alone", () => {
    const terms = [term("Payment", "30 days"), term("Currency", "")];
    expect(fillBlankCurrencyTerm(terms, "AED")).toEqual([
      term("Payment", "30 days"),
      term("Currency", "AED"),
    ]);
    // input list is not mutated
    expect(terms[1].termValue).toBe("");
  });
});
