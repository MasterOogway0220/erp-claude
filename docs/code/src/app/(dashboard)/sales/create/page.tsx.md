# src/app/(dashboard)/sales/create/page.tsx

> Client page at `/sales/create`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/sales/create` screen. 578 lines.

## How it works

- `"use client"` — runs in the browser.
- Reads `useSearchParams`, so it **must sit inside a `<Suspense>` boundary** — Next.js 16 fails the build otherwise.
- Calls: `/api/masters/customers`, `/api/quotations`, `/api/sales-orders`, `/api/tenders/${tenderId}`.

- Selecting a quotation auto-populates the line items from it. **Lines marked
  `isRegret` are filtered out**: a regretted line is one the company declined
  to quote, so it has no price and cannot be sold. Without the filter it would
  arrive with rate `0` and be rejected later by the sales-order API's
  "unit rate must be positive" check, with no explanation of why.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
