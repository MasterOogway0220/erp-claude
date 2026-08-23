# src/app/(dashboard)/quality/mtc/create/page.tsx

> Client page at `/quality/mtc/create`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/quality/mtc/create` screen. 282 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/inventory/grn`, `/api/inventory/stock`, `/api/purchase/orders?view=list`, `/api/quality/mtc`. The PO dropdown takes the summary shape (`view=list`) — it shows only the PO number and vendor name.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
