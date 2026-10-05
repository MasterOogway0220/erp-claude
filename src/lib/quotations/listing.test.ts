import { describe, expect, it } from "vitest";
import { shouldIncludeTenders, collapseRevisions, quotationSearchWhere, tenderSearchWhere } from "./listing";

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

describe("collapseRevisions", () => {
  // As the API orders them: quotationNo desc, version desc.
  const rows = [
    { quotationNo: "QTN/25-26/00012", version: 2, status: "DRAFT" },
    { quotationNo: "QTN/25-26/00012", version: 1, status: "SENT" },
    { quotationNo: "QTN/25-26/00012", version: 0, status: "APPROVED" },
    { quotationNo: "QTN/25-26/00011", version: 0, status: "APPROVED" },
  ];

  it("keeps only the latest revision of a chain", () => {
    expect(collapseRevisions(rows)).toEqual([
      { quotationNo: "QTN/25-26/00012", version: 2, status: "DRAFT" },
      { quotationNo: "QTN/25-26/00011", version: 0, status: "APPROVED" },
    ]);
  });

  it("keeps the latest revision that survived the status filter", () => {
    // ?status=APPROVED,SENT — Rev.2 is a draft and never reached this list
    const filtered = rows.filter((r) => r.status === "APPROVED" || r.status === "SENT");
    expect(collapseRevisions(filtered).map((r) => r.version)).toEqual([1, 0]);
  });

  it("leaves an unrevised list untouched", () => {
    const single = [{ quotationNo: "QTN/25-26/00011", version: 0 }];
    expect(collapseRevisions(single)).toEqual(single);
    expect(collapseRevisions([])).toEqual([]);
  });
});

// Users look a quotation up by the client's enquiry number or by the tender it
// came from, not only by our quotation number.
describe("quotationSearchWhere", () => {
  const or = quotationSearchWhere("RFQ-77");
  it("matches our number, the customer, the client's enquiry/reference and the source tender", () => {
    expect(or).toContainEqual({ quotationNo: { contains: "RFQ-77" } });
    expect(or).toContainEqual({ customer: { name: { contains: "RFQ-77" } } });
    expect(or).toContainEqual({ inquiryNo: { contains: "RFQ-77" } });
    expect(or).toContainEqual({ customerReference: { contains: "RFQ-77" } });
    expect(or).toContainEqual({ sourceTender: { tenderRef: { contains: "RFQ-77" } } });
    expect(or).toContainEqual({ sourceTender: { tenderNo: { contains: "RFQ-77" } } });
  });
});

describe("tenderSearchWhere", () => {
  it("matches the client's own tender reference", () => {
    expect(tenderSearchWhere("GAIL/T/9")).toContainEqual({ tenderRef: { contains: "GAIL/T/9" } });
  });
  it("keeps the customer match the quotation list relied on", () => {
    expect(tenderSearchWhere("x")).toContainEqual({ customer: { name: { contains: "x" } } });
  });
});
