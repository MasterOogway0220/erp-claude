# src/app/(dashboard)/quality/ncr/[id]/page.tsx

> Client page at `/quality/ncr/[id]`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/quality/ncr/[id]` screen. 606 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/quality/ncr/${id}`, `/api/quality/ncr/${params.id}`, `/api/users`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
