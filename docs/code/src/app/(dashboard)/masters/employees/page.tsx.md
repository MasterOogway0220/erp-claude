# src/app/(dashboard)/masters/employees/page.tsx

> Client page at `/masters/employees`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/masters/employees` screen. 253 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/masters/employees`, `/api/masters/employees/${deleteId}`, `/api/masters/employees/${id}`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
