import { describe, expect, it } from "vitest";
import { fillBlankCurrencyTerm, followCurrencyTerm, resolveUpdateCurrency } from "./currency";

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

// Terms copied from another document (a tender's onto a quotation) or loaded
// for a different currency (Export defaults on a EUR tender) must not print a
// Currency line that contradicts the header.
describe("followCurrencyTerm", () => {
  it("replaces a Currency value that names another currency", () => {
    expect(followCurrencyTerm([{ termName: "Currency", termValue: "USD ($)" }], "EUR")).toEqual([
      { termName: "Currency", termValue: "EUR" },
    ]);
    expect(followCurrencyTerm([{ termName: "Currency", termValue: "USD ($)" }], "INR")).toEqual([
      { termName: "Currency", termValue: "INR" },
    ]);
  });

  it("keeps a value that already names the currency, as written", () => {
    expect(followCurrencyTerm([{ termName: "Currency", termValue: "USD ($)" }], "USD")).toEqual([
      { termName: "Currency", termValue: "USD ($)" },
    ]);
    expect(followCurrencyTerm([{ termName: "currency", termValue: " usd " }], "USD")[0].termValue).toBe(" usd ");
  });

  it("fills a blank and leaves other rows alone", () => {
    const terms = [
      { termName: "Price", termValue: "Ex-works" },
      { termName: "Price Currency", termValue: "" },
    ];
    expect(followCurrencyTerm(terms, "INR")).toEqual([
      { termName: "Price", termValue: "Ex-works" },
      { termName: "Price Currency", termValue: "INR" },
    ]);
    // input list is not mutated
    expect(terms[1].termValue).toBe("");
  });
});
