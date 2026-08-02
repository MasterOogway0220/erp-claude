# src/app/(dashboard)/quality/lab-letters/page.tsx

> Client page at `/quality/lab-letters`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/quality/lab-letters` screen. 151 lines.

## How it works

- `"use client"` — runs in the browser.
- Fetches with TanStack Query (`useQuery`); server state is not duplicated into local state.
- Calls: `/api/quality/lab-letters`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
