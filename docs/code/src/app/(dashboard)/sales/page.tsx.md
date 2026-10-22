# src/app/(dashboard)/sales/page.tsx

> Client page at `/sales`.

See [README.md](README.md) for this module's shared behaviour.

## What it does

Renders the `/sales` screen. 470 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/sales-orders`, `/api/sales/dashboard`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`

## Change (2026-10-22, frontend and API follow-up)

KPI tiles have no coloured left strip. The `borderColor` prop is still accepted by callers but no longer used.
