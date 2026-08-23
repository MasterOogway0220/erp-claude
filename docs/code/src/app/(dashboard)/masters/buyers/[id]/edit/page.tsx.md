# src/app/(dashboard)/masters/buyers/[id]/edit/page.tsx

> Client page at `/masters/buyers/[id]/edit`.

See [../../../README.md](../../../README.md) for this module's shared behaviour.

## What it does

Renders the `/masters/buyers/[id]/edit` screen. 283 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/masters/buyers`, `/api/masters/buyers/${id}`, `/api/masters/customers`.
- Reads the buyer master through `useBuyersQuery`. It previously fetched `?search=` — an empty search, which the route treats as no filter at all — so it was pulling the identical list under a URL of its own. Dropping the parameter lets it share the one `["buyers"]` entry.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
