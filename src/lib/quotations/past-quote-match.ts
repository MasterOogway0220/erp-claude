/**
 * When does an earlier quotation count as the "past quote" for a line on a
 * new standard quotation?
 *
 * Two gates, in order:
 *
 * 1. We actually gave that client a quote. The quotation must belong to the
 *    same client and must have left the building — a draft, one still waiting
 *    for approval, one rejected internally, or one cancelled was never in the
 *    client's hands, so its price is not something we "quoted him before".
 *
 * 2. The earlier line is the same item. Product, material, additional spec
 *    and size must all match. A material-code match alone is not enough: two
 *    lines can share a code but differ in spec or size, and quoting the wrong
 *    past price is worse than quoting none.
 *
 * Comparison is trimmed, whitespace-collapsed and case-insensitive, so
 * "SMLS  Pipe" and "smls pipe" are the same product. A blank additional spec
 * is a real value: it matches only another blank spec. Product, material and
 * size must be filled in before a line can be matched at all.
 */

/** Statuses of quotations that never reached the client. */
export const NOT_GIVEN_QUOTATION_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "REJECTED",
  "CANCELLED",
] as const;

export function wasGivenToClient(status: string | null | undefined): boolean {
  return !!status && !(NOT_GIVEN_QUOTATION_STATUSES as readonly string[]).includes(status);
}

export interface PastQuoteMatchFields {
  product?: string | null;
  material?: string | null;
  additionalSpec?: string | null;
  sizeLabel?: string | null;
}

export function normalizeMatchValue(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

/** A line can only be matched once product, material and size are filled. */
export function isMatchable(line: PastQuoteMatchFields): boolean {
  return (
    normalizeMatchValue(line.product) !== "" &&
    normalizeMatchValue(line.material) !== "" &&
    normalizeMatchValue(line.sizeLabel) !== ""
  );
}

/**
 * A stable key for the four fields; "" when the line is not matchable.
 * Used to notice when a line's identity changes and its past quote must be
 * looked up again.
 */
export function matchKey(line: PastQuoteMatchFields): string {
  if (!isMatchable(line)) return "";
  return [line.product, line.material, line.additionalSpec, line.sizeLabel]
    .map(normalizeMatchValue)
    .join("|");
}

export function isSameItem(line: PastQuoteMatchFields, past: PastQuoteMatchFields): boolean {
  const key = matchKey(line);
  return key !== "" && key === matchKey(past);
}
