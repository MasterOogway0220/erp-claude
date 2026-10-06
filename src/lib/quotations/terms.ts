/**
 * The value of a quotation's offer-term row by name ("Payment", "Delivery"),
 * case-insensitive, matching a row whose name starts with that word. First
 * match wins; "" when absent. Payment and delivery terms are recorded as these
 * rows — the structured payment/delivery-terms fields on Quotation are unused.
 * A leading colon and whitespace, which some stored values begin with, are
 * dropped.
 */
export function termValue(
  terms: { termName: string; termValue?: string | null }[] | null | undefined,
  name: string
): string {
  const want = name.toLowerCase();
  const row = (terms ?? []).find((t) => t.termName.trim().toLowerCase().startsWith(want));
  return row?.termValue?.replace(/^[\s:]+/, "").trim() ?? "";
}

/**
 * An edited terms list (copied from a quotation onto an order) as rows to
 * store: numbered 1..n, trimmed, rows with neither name nor value dropped.
 */
export function orderTermRows(
  terms: { termName?: string | null; termValue?: string | null; isIncluded?: boolean | null }[] | null | undefined
) {
  return (terms ?? [])
    .map((t) => ({
      termName: (t.termName ?? "").trim(),
      termValue: (t.termValue ?? "").trim(),
      isIncluded: t.isIncluded ?? true,
    }))
    .filter((t) => t.termName || t.termValue)
    .map((t, i) => ({ termNo: i + 1, ...t }));
}

/**
 * A tender's edited terms list as rows to store, the same way as
 * orderTermRows, but keeping `isCustom`: a row added with "Add Custom Term",
 * which stays renamable and removable when the tender is edited and when its
 * terms are copied into a quotation raised from it.
 */
export function tenderTermRows(
  terms:
    | { termName?: string | null; termValue?: string | null; isIncluded?: boolean | null; isCustom?: boolean | null }[]
    | null
    | undefined
) {
  return (terms ?? [])
    .map((t) => ({
      termName: (t.termName ?? "").trim(),
      termValue: (t.termValue ?? "").trim(),
      isIncluded: t.isIncluded ?? true,
      isCustom: t.isCustom ?? false,
    }))
    .filter((t) => t.termName || t.termValue)
    .map((t, i) => ({ termNo: i + 1, ...t }));
}
