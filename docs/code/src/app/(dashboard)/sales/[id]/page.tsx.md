# src/app/(dashboard)/sales/[id]/page.tsx

> Client page at `/sales/[id]`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/sales/[id]` screen. 409 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/sales-orders/${id}`, `/api/sales-orders/${salesOrder.id}`.
- The header's "Reference Quotation" number links to `/quotations/[id]`.
- A line's `itemDescription` is shown under its product when set. That is a
  non-standard line's own text: its product reads only "Non-Standard Item".
  Order lines carry it from 6 Oct 2026 — the Create Order screen and
  `/api/sales-orders/from-cpo` copy it; older lines have none.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.
- The Line Items table shows each line's quantity with its own unit (`uom`,
  kept on order lines since 6 Oct 2026). A line saved before that has no unit
  and reads "Mtr", which is what the whole column used to say.
- The Reserved column and its Shortfall carry the same unit. They are counted
  the way the reserve API counts: the line's `reservedQtyMtr` summed against
  the line quantity. Stock is kept in metres and allotment never records
  pieces, so for a Nos line that sum is whatever was reserved against it, not
  a converted piece count; pieces-based allotment was not built (owner's
  choice, 6 Oct 2026). Until then both read "Mtr" on every line, so a Nos line
  showed "Shortfall: 1371.000 Mtr".

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
