# src/app/(dashboard)/inventory/stock/[id]/page.tsx

> Client page at `/inventory/stock/[id]`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/inventory/stock/[id]` screen. 516 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/inventory/stock/${id}`, `/api/inventory/stock/${params.id}`, `/api/inventory/stock/${params.id}/pipe-details`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
