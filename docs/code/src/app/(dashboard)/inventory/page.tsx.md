# src/app/(dashboard)/inventory/page.tsx

> Client page at `/inventory`.

See [README.md](README.md) for this module's shared behaviour.

## What it does

Renders the `/inventory` screen. 704 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/inventory/grn`, `/api/inventory/stock`, `/api/inventory/stock-issue`, `/api/masters/vendors`, `/api/masters/warehouses`.

## Gotchas

- Large file (704 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
