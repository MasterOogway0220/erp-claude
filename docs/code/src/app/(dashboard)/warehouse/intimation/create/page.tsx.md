# src/app/(dashboard)/warehouse/intimation/create/page.tsx

> Client page at `/warehouse/intimation/create`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/warehouse/intimation/create` screen. 453 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/admin/users`, `/api/masters/warehouses`, `/api/sales-orders`, `/api/warehouse/intimation`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
