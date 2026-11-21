// Database side of stock entry: duplicate lookup and the insert shared by the
// add-stock route and the import route. Validation lives in stock-rows.ts.

import { prisma } from "@/lib/prisma";
import { primaryRack, stockKey, type StockRow } from "./stock-rows";

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

// Warehouse locations for stock entered by hand or by import, keyed by the
// rack text (rackNo; "" for none). The company has one warehouse today
// (Taloja), so stock is filed there: under its rack (primaryRack), the rack
// being added to the warehouse master if missing, or under a GENERAL location
// when no rack is given. With more than one active warehouse there is no way
// to tell which one a sheet row belongs to, so the map is empty and the stock
// stays unlinked (rack text only) until a warehouse picker exists.
export async function stockLocationIds(
  companyId: string,
  rackNos: (string | null)[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const warehouses = await prisma.warehouseMaster.findMany({
    where: { companyId, isActive: true },
    select: { id: true, locations: { select: { id: true, rack: true, bay: true, shelf: true, zone: true } } },
  });
  if (warehouses.length !== 1) return out;
  const wh = warehouses[0];
  // Only a bare rack location stands for "the rack"; a bay/shelf row is narrower.
  const rackLoc = new Map<string, string>();
  let generalId: string | null = null;
  for (const l of wh.locations) {
    if (l.rack && !l.bay && !l.shelf && !rackLoc.has(l.rack.toLowerCase())) rackLoc.set(l.rack.toLowerCase(), l.id);
    if (!l.rack && !l.bay && !l.shelf && l.zone === "GENERAL") generalId = l.id;
  }
  for (const rackNo of Array.from(new Set(rackNos.map((r) => r ?? "")))) {
    const rack = primaryRack(rackNo);
    if (rack) {
      let id = rackLoc.get(rack.toLowerCase());
      if (!id) {
        id = (await prisma.warehouseLocation.create({ data: { warehouseId: wh.id, zone: "RACK", rack }, select: { id: true } })).id;
        rackLoc.set(rack.toLowerCase(), id);
      }
      out.set(rackNo, id);
    } else {
      if (!generalId) {
        generalId = (await prisma.warehouseLocation.create({ data: { warehouseId: wh.id, zone: "GENERAL" }, select: { id: true } })).id;
      }
      out.set(rackNo, generalId);
    }
  }
  return out;
}

// New stock enters as UNDER_INSPECTION, the schema default, until QC releases
// it, and is filed in the warehouse (see stockLocationIds).
export async function createStockRows(companyId: string, rows: StockRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const locations = await stockLocationIds(companyId, rows.map((r) => r.rackNo));
  const result = await prisma.inventoryStock.createMany({
    data: rows.map((r) => ({
      ...r,
      form: r.form ?? r.product,
      companyId,
      warehouseLocationId: locations.get(r.rackNo ?? "") ?? null,
    })),
  });
  return result.count;
}
