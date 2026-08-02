# src/app/(dashboard)/quality/inspections/create/page.tsx

> Client page at `/quality/inspections/create`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/quality/inspections/create` screen. 758 lines.

## How it works

- `"use client"` — runs in the browser.
- Reads `useSearchParams`, so it **must sit inside a `<Suspense>` boundary** — Next.js 16 fails the build otherwise.
- Calls: `/api/inventory/stock`, `/api/masters/inspection-agencies`, `/api/quality/inspection-offers/${id}`, `/api/quality/inspections`, `/api/upload`.

## Gotchas

- Large file (758 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
