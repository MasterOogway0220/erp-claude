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

/**
 * Collapse a revision chain to one row: a revision replaces its predecessor in
 * the listing, so QTN/…/00012 never appears three times once it reaches Rev.2.
 * Earlier revisions stay reachable in the Revision History on the detail page.
 *
 * Keeps the FIRST row seen per quotationNo, so the caller must order by
 * version descending — the highest revision that matches the active filters
 * is the one that survives.
 */
export function collapseRevisions<T extends { quotationNo: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.quotationNo)) return false;
    seen.add(row.quotationNo);
    return true;
  });
}

/**
 * `OR` conditions for searching the quotation list. Besides our number and the customer, users
 * look a quotation up by the client's own enquiry number (`inquiryNo`), their
 * reference (`customerReference`), or the tender it was raised from — the
 * tender's register number or the client's own tender reference.
 */
export function quotationSearchWhere(search: string) {
  const c = { contains: search };
  return [
    { quotationNo: c },
    { customer: { name: c } },
    { inquiryNo: c },
    { customerReference: c },
    { sourceTender: { tenderRef: c } },
    { sourceTender: { tenderNo: c } },
  ];
}

/** `OR` conditions for searching the tender rows shown in the quotation list. */
export function tenderSearchWhere(search: string) {
  const c = { contains: search };
  return [
    { tenderNo: c },
    { tenderRef: c },
    { organization: c },
    { projectName: c },
    { customer: { name: c } },
  ];
}
