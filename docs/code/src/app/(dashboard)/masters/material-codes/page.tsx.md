# src/app/(dashboard)/masters/material-codes/page.tsx

> Client page at `/masters/material-codes`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/masters/material-codes` screen. 703 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/masters/material-codes`, `/api/masters/material-codes/${deleteTarget.id}`, `/api/masters/material-codes/${editingItem.id}`.

## Gotchas

- Large file (703 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
