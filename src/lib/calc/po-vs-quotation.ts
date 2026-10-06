/** An order line as the order Review step compares it with the quotation. */
export interface PoLine {
  sNo: number;
  /** The quoted line it came from; null on lines added by hand and on older orders. */
  quotationItemId?: string | null;
  product?: string | null;
  material?: string | null;
  sizeLabel?: string | null;
  quantity: number;
  unitRate: number;
  amount: number;
}

export interface QuotedLine {
  id: string;
  sNo: number;
  quantity: number;
  unitRate: number;
  amount: number;
}

export interface ComparisonRow {
  /** The order line S.No, or several ("1, 2") for a quoted line split on the client PO. */
  itemNo: string;
  product: string;
  material: string;
  size: string;
  quotationQty: number;
  poQty: number;
  qtyVariance: number;
  quotationRate: number;
  poRate: number;
  rateVariance: number;
  quotationAmount: number;
  poAmount: number;
  amountVariance: number;
  hasVariance: boolean;
}

function row(lines: PoLine[], quoted: QuotedLine | undefined): ComparisonRow {
  const first = lines[0];
  const poQty = lines.reduce((s, l) => s + l.quantity, 0);
  const poAmount = lines.reduce((s, l) => s + l.amount, 0);
  // Split parts can carry different negotiated rates; what the client pays per
  // unit across them is their weighted average.
  const poRate = lines.length === 1 ? first.unitRate : poQty ? poAmount / poQty : first.unitRate;
  const quotationQty = quoted?.quantity ?? 0;
  const quotationRate = quoted?.unitRate ?? 0;
  const quotationAmount = quoted?.amount ?? 0;
  const qtyVariance = poQty - quotationQty;
  const rateVariance = poRate - quotationRate;
  const amountVariance = poAmount - quotationAmount;
  // Every stored amount is rounded to the paisa, so split parts can sum a paisa
  // or two off the quoted amount: allow half a paisa per amount compared.
  const amountTolerance = 0.005 * (lines.length + 1) + 1e-9;
  // A part at another rate is a real difference even when the parts average
  // back to the quoted rate.
  const partRateDiffers = !!quoted && lines.some((l) => Math.abs(l.unitRate - quoted.unitRate) > 0.01);
  return {
    itemNo: lines.map((l) => l.sNo).join(", "),
    product: first.product ?? "",
    material: first.material ?? "",
    size: first.sizeLabel ?? "",
    quotationQty,
    poQty,
    qtyVariance,
    quotationRate,
    poRate,
    rateVariance,
    quotationAmount,
    poAmount,
    amountVariance,
    hasVariance:
      Math.abs(qtyVariance) > 0.01 ||
      Math.abs(rateVariance) > 0.01 ||
      Math.abs(amountVariance) > amountTolerance ||
      partRateDiffers,
  };
}

/**
 * The order's lines against the quotation: one row per quoted line that was
 * ordered, its order lines summed, and one row per line added by hand (nothing
 * quoted). Quoted lines that were not ordered are not listed. Orders made
 * before lines recorded their quoted line (no `quotationItemId` anywhere) are
 * paired by S.No, as they always were.
 */
export function poVsQuotation(po: PoLine[], quoted: QuotedLine[]): ComparisonRow[] {
  if (!po.some((l) => l.quotationItemId)) {
    return po.map((l) => row([l], quoted.find((q) => q.sNo === l.sNo)));
  }
  const groups = new Map<string, PoLine[]>();
  for (const l of po) {
    const key = l.quotationItemId ?? `line:${l.sNo}`;
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }
  return [...groups].map(([key, lines]) => row(lines, quoted.find((q) => q.id === key)));
}
