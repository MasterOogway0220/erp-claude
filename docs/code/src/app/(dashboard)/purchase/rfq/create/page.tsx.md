# src/app/(dashboard)/purchase/rfq/create/page.tsx

> Client page at `/purchase/rfq/create`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/purchase/rfq/create` screen. 420 lines.

## How it works

- `"use client"` — runs in the browser.
- Reads `useSearchParams`, so it **must sit inside a `<Suspense>` boundary** — Next.js 16 fails the build otherwise.
- Calls: `/api/masters/vendors`, `/api/purchase/requisitions`, `/api/purchase/rfq`.
- The vendor list comes from the shared `useVendors` hook. It used to be fetched in the same `Promise.all` as the approved PRs; only the PR fetch remains, since that one is genuinely per-screen.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
