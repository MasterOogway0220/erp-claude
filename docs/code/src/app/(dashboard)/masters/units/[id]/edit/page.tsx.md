# src/app/(dashboard)/masters/units/[id]/edit/page.tsx

> Client page at `/masters/units/[id]/edit`.

See [../../../README.md](../../../README.md) for this module's shared behaviour.

## What it does

Renders the `/masters/units/[id]/edit` screen. 185 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/masters/units`, `/api/masters/units/${id}`.
- Reads the whole unit master from the shared `["units-master"]` cache entry and picks the row by id, instead of fetching the list again. This screen is almost always opened from the Unit Master list, which has just loaded the same rows, so the edit form now renders with no request at all.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
