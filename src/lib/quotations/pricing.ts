/**
 * Price-gate helpers: quotations may be saved as DRAFT without unit rates,
 * but must be fully priced before entering the approval flow.
 */

/** Parse a rate that may be "", null, undefined, string, number, or Prisma Decimal. */
export function parseRate(value: unknown): number {
  if (value == null || value === "") return 0;
  const n = Number(String(value));
  return Number.isFinite(n) ? n : NaN;
}

export interface RatedItem {
  sNo?: number | null;
  unitRate?: unknown;
}

/** Line numbers (sNo, falling back to 1-based position) of items with no positive unit rate. */
export function findUnpricedItems(items: RatedItem[]): number[] {
  return items
    .map((item, idx) => ({ sNo: item.sNo ?? idx + 1, rate: parseRate(item.unitRate) }))
    .filter(({ rate }) => !(rate > 0))
    .map(({ sNo }) => sNo);
}

/**
 * "Item 3 has no unit rate. <instruction>" / "Items 2, 5 and 7 have no unit
 * rate. <instruction>" — or null when all items are priced.
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
