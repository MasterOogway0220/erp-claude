# src/app/(dashboard)/masters/inspection-agencies/page.tsx

> Client page at `/masters/inspection-agencies`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/masters/inspection-agencies` screen. 476 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/masters/inspection-agencies`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
