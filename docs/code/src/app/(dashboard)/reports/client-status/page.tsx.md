# src/app/(dashboard)/reports/client-status/page.tsx

> Client page at `/reports/client-status`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/reports/client-status` screen. 623 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/reports/client-status/${selectedSOId}/email`, `/api/reports/client-status/${selectedSOId}/excel`, `/api/reports/client-status/${selectedSOId}/pdf`, `/api/reports/client-status/${soId}`, `/api/sales-orders`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
