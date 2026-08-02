# src/app/(dashboard)/purchase/orders/create/page.tsx

> Client page at `/purchase/orders/create`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/purchase/orders/create` screen. 658 lines.

## How it works

- `"use client"` — runs in the browser.
- Reads `useSearchParams`, so it **must sit inside a `<Suspense>` boundary** — Next.js 16 fails the build otherwise.
- Calls: `/api/masters/vendors`, `/api/purchase/orders`, `/api/purchase/requisitions`, `/api/sales-orders`, `/api/sales-orders/${soId}`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
