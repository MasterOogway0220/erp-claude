# src/app/(dashboard)/dispatch/dispatch-notes/create/page.tsx

> Client page at `/dispatch/dispatch-notes/create`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/dispatch/dispatch-notes/create` screen. 449 lines.

## How it works

- `"use client"` — runs in the browser.
- Reads `useSearchParams`, so it **must sit inside a `<Suspense>` boundary** — Next.js 16 fails the build otherwise.
- Calls: `/api/dispatch/dispatch-notes`, `/api/dispatch/packing-lists`, `/api/masters/other`, `/api/masters/warehouses`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
