# src/app/(dashboard)/masters/sizes/[id]/edit/page.tsx

> Client page at `/masters/sizes/[id]/edit`.

See [../../../README.md](../../../README.md) for this module's shared behaviour.

## What it does

Renders the `/masters/sizes/[id]/edit` screen. 272 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/masters/sizes`, `/api/masters/sizes/${id}`.
- Reads the size master from the shared `["sizes"]` cache entry and picks the row by id rather than re-fetching the list.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
