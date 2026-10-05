/**
 * A tender's BOQ lines as rows for `TenderItem`, numbered 1..n. Used by tender
 * create and by tender edit, which replaces all lines at once, so an edited
 * line is stored exactly as a new one would be.
 */
export function tenderItemRows(items: Record<string, unknown>[] | null | undefined) {
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const num = (v: unknown) => {
    const n = parseFloat(String(v ?? ""));
    return Number.isFinite(n) ? n : null;
  };
  return (items ?? []).map((item, idx) => {
    const quantity = num(item.quantity) ?? 0;
    const estimatedRate = num(item.estimatedRate);
    return {
      sNo: idx + 1,
      product: text(item.product),
      material: text(item.material),
      additionalSpec: text(item.additionalSpec),
      sizeLabel: text(item.sizeLabel),
      quantity,
      uom: text(item.uom),
      estimatedRate,
      amount: estimatedRate !== null && quantity ? quantity * estimatedRate : null,
      remarks: text(item.remarks),
    };
  });
}
