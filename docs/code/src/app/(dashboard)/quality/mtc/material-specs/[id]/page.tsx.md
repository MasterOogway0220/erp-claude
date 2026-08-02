# src/app/(dashboard)/quality/mtc/material-specs/[id]/page.tsx

> Client page at `/quality/mtc/material-specs/[id]`.

See [../../../README.md](../../../README.md) for this module's shared behaviour.

## What it does

Renders the `/quality/mtc/material-specs/[id]` screen. 371 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/mtc/material-specs/${id}`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
