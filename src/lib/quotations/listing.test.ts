import { describe, expect, it } from "vitest";
import { shouldIncludeTenders } from "./listing";

const noFilters = { category: "", status: "", revision: "", conversionStatus: "" };

describe("shouldIncludeTenders", () => {
  it("includes tenders in the default unfiltered view", () => {
    expect(shouldIncludeTenders(noFilters)).toBe(true);
  });

  it("includes tenders under the explicit Tender category", () => {
    expect(shouldIncludeTenders({ ...noFilters, category: "TENDER" })).toBe(true);
  });

  it("excludes tenders for Standard/Non-Standard categories", () => {
    expect(shouldIncludeTenders({ ...noFilters, category: "STANDARD" })).toBe(false);
    expect(shouldIncludeTenders({ ...noFilters, category: "NON_STANDARD" })).toBe(false);
  });

  it("excludes tenders when quotation-only filters are active", () => {
    expect(shouldIncludeTenders({ ...noFilters, status: "DRAFT" })).toBe(false);
    expect(shouldIncludeTenders({ ...noFilters, revision: "original" })).toBe(false);
    expect(shouldIncludeTenders({ ...noFilters, conversionStatus: "pending" })).toBe(false);
    expect(
      shouldIncludeTenders({ ...noFilters, category: "TENDER", status: "DRAFT" })
    ).toBe(false);
  });
});
