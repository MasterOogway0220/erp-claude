# src/app/(dashboard)/quality/inspection-offers/create/page.tsx

> Client page at `/quality/inspection-offers/create`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/quality/inspection-offers/create` screen. 462 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/masters/customers`, `/api/masters/inspection-agencies`, `/api/quality/inspection-offers`, `/api/sales-orders`, `/api/sales-orders/${v}/qap`.
- Requests `/api/sales-orders?view=list` for the order dropdown, which maps only the id, `soNo` and customer name.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
