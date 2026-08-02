# src/app/(dashboard)/dispatch/invoices/create/page.tsx

> Client page at `/dispatch/invoices/create`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/dispatch/invoices/create` screen. 697 lines.

## How it works

- `"use client"` — runs in the browser.
- Reads `useSearchParams`, so it **must sit inside a `<Suspense>` boundary** — Next.js 16 fails the build otherwise.
- Calls: `/api/dispatch/dispatch-notes`, `/api/dispatch/invoices`, `/api/dispatch/packing-lists/${dn.packingList.id}`, `/api/masters/tax`, `/api/masters/warehouses`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
