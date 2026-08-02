# src/app/(dashboard)/sales/[id]/page.tsx

> Client page at `/sales/[id]`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/sales/[id]` screen. 409 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/sales-orders/${id}`, `/api/sales-orders/${salesOrder.id}`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
