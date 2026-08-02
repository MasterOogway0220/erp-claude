# src/app/(dashboard)/admin/page.tsx

> Client page at `/admin`.

See [README.md](README.md) for this module's shared behaviour.

## What it does

Renders the `/admin` screen. 977 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/admin/audit-logs`, `/api/admin/users`, `/api/admin/users/${deactivatingUser.id}`, `/api/admin/users/${editingUser.id}`.

## Gotchas

- Large file (977 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
