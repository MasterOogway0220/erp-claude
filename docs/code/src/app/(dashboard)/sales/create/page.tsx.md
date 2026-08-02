# src/app/(dashboard)/sales/create/page.tsx

> Client page at `/sales/create`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/sales/create` screen. 578 lines.

## How it works

- `"use client"` — runs in the browser.
- Reads `useSearchParams`, so it **must sit inside a `<Suspense>` boundary** — Next.js 16 fails the build otherwise.
- Calls: `/api/masters/customers`, `/api/quotations`, `/api/sales-orders`, `/api/tenders/${tenderId}`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
