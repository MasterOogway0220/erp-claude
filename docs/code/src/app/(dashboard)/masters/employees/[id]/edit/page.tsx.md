# src/app/(dashboard)/masters/employees/[id]/edit/page.tsx

> Client page at `/masters/employees/[id]/edit`.

See [../../../README.md](../../../README.md) for this module's shared behaviour.

## What it does

Renders the `/masters/employees/[id]/edit` screen. 345 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/masters/departments`, `/api/masters/employees`, `/api/masters/employees/${id}`.
- Reads the employee master through `useEmployeesQuery` — the same `["employees"]` entry the owner/approver pickers use — and picks the row by id rather than re-fetching the list.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.
- Client-side password minimum is **12** characters, matching
  `MIN_PASSWORD_LENGTH` in `src/lib/rbac.ts` (it was 6). The check here is only
  a convenience; the API enforces the same number, and also refuses (403) any
  role change that `userWriteError` blocks, such as an ADMIN touching a
  SUPER_ADMIN login.

## Related

- [Module overview](../../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
