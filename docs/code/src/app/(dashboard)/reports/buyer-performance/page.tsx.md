# src/app/(dashboard)/reports/buyer-performance/page.tsx

> Client page at `/reports/buyer-performance`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/reports/buyer-performance` screen. 176 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/masters/customers`, `/api/reports/buyer-performance`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
