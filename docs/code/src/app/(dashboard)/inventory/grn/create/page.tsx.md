# src/app/(dashboard)/inventory/grn/create/page.tsx

> Client page at `/inventory/grn/create`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/inventory/grn/create` screen. 376 lines.

## How it works

- `"use client"` — runs in the browser.
- Reads `useSearchParams`, so it **must sit inside a `<Suspense>` boundary** — Next.js 16 fails the build otherwise.
- Calls: `/api/inventory/grn`, `/api/masters/warehouses`, `/api/purchase/orders?view=list`, `/api/purchase/orders/${poId}`. The PO dropdown takes the summary shape (`view=list`); the lines come from the by-id fetch once a PO is chosen.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
