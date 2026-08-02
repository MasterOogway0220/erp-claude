# src/app/(dashboard)/reports/customer-ageing/page.tsx

> Client page at `/reports/customer-ageing`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/reports/customer-ageing` screen. 257 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/reports/customer-ageing`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
