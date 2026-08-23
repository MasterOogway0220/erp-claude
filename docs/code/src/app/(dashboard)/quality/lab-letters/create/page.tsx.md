# src/app/(dashboard)/quality/lab-letters/create/page.tsx

> Client page at `/quality/lab-letters/create`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/quality/lab-letters/create` screen. 504 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/inventory/stock`, `/api/masters/inspection-agencies`, `/api/masters/testing`, `/api/quality/lab-letters`.
- The testing master comes from the shared `["testing-masters"]` entry. Mandatory tests are still pre-ticked, but only on the list's **first** arrival — guarded by a ref, because a refetch would otherwise silently re-tick them and wipe the user's own selections.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
