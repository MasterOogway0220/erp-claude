// Database side of stock entry: duplicate lookup and the insert shared by the
// add-stock route and the import route. Validation lives in stock-rows.ts.

import { prisma } from "@/lib/prisma";
import { stockKey, type StockRow } from "./stock-rows";

// Keys of stock already held for this company, limited to the heat numbers
// being written so the lookup stays small.
export async function existingStockKeys(
  companyId: string,
  heatNos: string[]
): Promise<Set<string>> {
  const unique = Array.from(new Set(heatNos.filter(Boolean)));
  if (unique.length === 0) return new Set();
  const rows = await prisma.inventoryStock.findMany({
    where: { companyId, heatNo: { in: unique } },
    select: { heatNo: true, mtcNo: true, sizeLabel: true, rackNo: true },
  });
  return new Set(rows.map((r) => stockKey({ ...r, heatNo: r.heatNo ?? "" })));
}

// New stock enters as UNDER_INSPECTION, the schema default, until QC releases it.
export async function createStockRows(companyId: string, rows: StockRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const result = await prisma.inventoryStock.createMany({
    data: rows.map((r) => ({ ...r, form: r.form ?? r.product, companyId })),
  });
  return result.count;
}
