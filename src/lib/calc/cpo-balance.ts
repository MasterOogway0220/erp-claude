/**
 * The first quotation item whose client PO lines, summed, order more than its
 * remaining balance; null when every item fits. A quoted line can be split
 * into several PO lines, so a per-line check is not enough.
 */
export function firstOverBalance(
  lines: { quotationItemId: string; qtyOrdered: number }[],
  balance: Map<string, number>
): { quotationItemId: string; ordered: number; balance: number } | null {
  const ordered = new Map<string, number>();
  for (const l of lines) {
    ordered.set(l.quotationItemId, (ordered.get(l.quotationItemId) ?? 0) + l.qtyOrdered);
  }
  for (const [id, qty] of ordered) {
    const bal = balance.get(id);
    // Tolerance: summed decimal quantities carry float error (1.1 + 2.2 > 3.3).
    if (bal !== undefined && qty - bal > 1e-6) return { quotationItemId: id, ordered: qty, balance: bal };
  }
  return null;
}
