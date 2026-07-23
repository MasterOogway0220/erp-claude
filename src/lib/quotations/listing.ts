export interface QuotationListFilters {
  category: string;
  status: string;
  revision: string;
  conversionStatus: string;
}

// Tenders share the quotation number series, so the listing shows tender
// records alongside quotations — both in the default unfiltered view and
// under the explicit Tender category. Tenders have no quotation status,
// revision or conversion state, so any of those filters excludes them, as do
// the Standard/Non-Standard category filters.
export function shouldIncludeTenders(f: QuotationListFilters): boolean {
  return (
    (!f.category || f.category === "TENDER") &&
    !f.status &&
    !f.revision &&
    !f.conversionStatus
  );
}
