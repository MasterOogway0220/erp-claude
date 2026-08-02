# src/app/(dashboard)/masters/customer-contacts/page.tsx

> Client page at `/masters/customer-contacts`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/masters/customer-contacts` screen. 433 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/masters/customer-contacts`, `/api/masters/customer-contacts/${id}`, `/api/masters/customers`, `/api/masters/departments`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
