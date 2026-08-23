# src/app/(dashboard)/quality/lab-reports/create/page.tsx

> Client page at `/quality/lab-reports/create`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/quality/lab-reports/create` screen. 371 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/inventory/stock`, `/api/purchase/orders?pageSize=200&view=list`, `/api/quality/lab-reports`, `/api/upload`. The PO dropdown takes the summary shape (`view=list`).

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
