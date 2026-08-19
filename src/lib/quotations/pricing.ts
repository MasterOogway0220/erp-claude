/**
 * Price-gate helpers: quotations may be saved as DRAFT with items left
 * unpriced, but must be settled before entering the approval flow. "Settled"
 * means one of three things, which the data model keeps distinct:
 *
 *   unitRate = null    → nobody has decided a price yet (the gate blocks this)
 *   unitRate = 0       → deliberately quoted at zero (free / included in
 *                        another line) — a real price, the gate allows it
 *   isRegret = true    → we are declining to quote this line at all; the PDF
 *                        prints "REGRET" instead of a rate, and the line
 *                        contributes nothing to the total
 */

/**
 * Parse a rate that may be null, undefined, "", a string, a number, or a
 * Prisma Decimal. Returns `null` when no rate has been entered (which is NOT
 * the same as 0) and `NaN` when the value is not a number at all.
 */
export function parseRate(value: unknown): number | null {
  if (value == null || value === "") return null;
  return Number(String(value));
}

export interface RatedItem {
  sNo?: number | null;
  unitRate?: unknown;
  isRegret?: boolean | null;
}

/** A line is settled if we are regretting it, or it carries a real rate >= 0. */
function isSettled(item: RatedItem): boolean {
  if (item.isRegret) return true;
  const rate = parseRate(item.unitRate);
  return rate !== null && Number.isFinite(rate) && rate >= 0;
}

/** Line numbers (sNo, falling back to 1-based position) of unsettled items. */
export function findUnpricedItems(items: RatedItem[]): number[] {
  return items
    .map((item, idx) => ({ sNo: item.sNo ?? idx + 1, settled: isSettled(item) }))
    .filter(({ settled }) => !settled)
    .map(({ sNo }) => sNo);
}

export interface WritableItem {
  quantity?: unknown;
  unitRate?: unknown;
  amount?: unknown;
  isRegret?: boolean | null;
}

/**
 * Validate and normalise one item's money fields **in place**, ready to store.
 * Returns an error suffix (the caller prefixes "Item N: ") or null when the
 * item is fine.
 *
 * This is the invariant the whole regret feature rests on, so it lives here
 * rather than being copy-pasted into POST and PUT: a regretted line stores no
 * rate and no amount, whatever the client sent. Without that, a line switched
 * to Regret keeps its old price and prints it to the customer — which is the
 * bug this replaced.
 */
export function normalizeItemPricing(item: WritableItem): string | null {
  const qty = parseFloat(String(item.quantity));
  if (!Number.isFinite(qty) || qty <= 0) {
    return "quantity is required and must be a positive number";
  }

  const rate = parseRate(item.unitRate);
  if (rate !== null && (!Number.isFinite(rate) || rate < 0)) {
    return "unit rate must be a non-negative number";
  }

  if (item.isRegret) {
    item.unitRate = null;
    item.amount = "0";
    return null;
  }

  item.unitRate = rate;
  // Recompute qty × rate when the client's amount is missing or invalid, so a
  // priced item cannot slip through totalling zero.
  const amount = parseFloat(String(item.amount));
  if (!Number.isFinite(amount) || amount < 0) {
    item.amount = (qty * (rate ?? 0)).toFixed(2);
  }
  return null;
}

/**
 * "Item 3 has no unit rate. <instruction>" / "Items 2, 5 and 7 have no unit
 * rate. <instruction>" — or null when every item is priced or regretted.
 */
export function unpricedItemsError(items: RatedItem[], instruction: string): string | null {
  const sNos = findUnpricedItems(items);
  if (sNos.length === 0) return null;
  const list =
    sNos.length === 1
      ? `Item ${sNos[0]} has`
      : `Items ${sNos.slice(0, -1).join(", ")} and ${sNos[sNos.length - 1]} have`;
  return `${list} no unit rate. ${instruction}`;
}
