# src/app/(dashboard)/inventory/page.tsx

> Client page at `/inventory`.

See [README.md](README.md) for this module's shared behaviour.

## What it does

Renders the `/inventory` screen. 704 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/inventory/grn`, `/api/inventory/stock`, `/api/inventory/stock-issue`, `/api/masters/vendors`, `/api/masters/warehouses`.
- The Stock View header has two buttons: **Import Excel** (`ImportStockDialog`, which
  posts to `/api/inventory/stock/import`) and **Add Stock** (`AddStockDialog`, which
  posts to `/api/inventory/stock`). Both dialogs are rendered once, after `</Tabs>`,
  and refresh the `inventory-stock` query on success.

### Stock View columns

The columns are: Heat No., Product, Specification, Size, Qty (Mtr), Pcs,
Status, Rack / Bay, Make, MTC No., MTC Date, MTC Type, TPI, GRN.

- **Heat number** identifies one melt batch of steel. Every pipe from that
  heat shares one chemistry and one test certificate.
- **MTC** (mill test certificate) is the manufacturer's test report for that
  heat. A 3.1 certificate is issued by the mill itself; a 3.2 certificate is
  also witnessed by an independent inspector.
- **TPI** (third-party inspection) is the agency that did the inspection.
- **Make** is the mill that made the pipe.

There is **no Warehouse column** (removed Nov 2026). The company has one
warehouse, Taloja, so the column said the same thing on every row. The
**Warehouse filter stays**, because a second warehouse is expected.

That filter matches on `warehouseLocation`. Add Stock and Import Excel file
new stock under Taloja's rack locations
([`stock-write.ts`](../../../lib/inventory/stock-write.ts.md)), and the
existing stock was backfilled, so the filter finds all of it.

**Rack / Bay** shows the typed `rackNo` text when there is one, because it
can name two racks ("5 & 8"). Otherwise it shows the linked location's
rack / bay / shelf.

There is **no Vendor column** either (removed Nov 2026). Vendor (who we
bought from, via the GRN or PO) is shown on the stock's own page. The
**Vendor filter stays**. Today's stock came from the inventory sheet, not a
GRN, so it has no vendor yet; GRN-received stock will.

## Gotchas

- Large file (704 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
