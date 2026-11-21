# src/app/(dashboard)/inventory/stock/[id]/page.tsx

> Client page at `/inventory/stock/[id]`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/inventory/stock/[id]` screen. 516 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/inventory/stock/${id}`, `/api/inventory/stock/${params.id}`, `/api/inventory/stock/${params.id}/pipe-details`.

### Details shown (Nov 2026)

- **Stock Details** has MTC No., **MTC Date**, MTC Type (shown as 3.1 / 3.2),
  TPI Agency and **Vendor**. Vendor is who we bought from: the GRN's vendor,
  else the PO's, else "-". It moved here from the inventory table. **Make**,
  the mill, is a separate field.
- **Location & Status** has **Warehouse**, the name of the linked warehouse
  location's warehouse, from the detail API's `warehouseLocation`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
