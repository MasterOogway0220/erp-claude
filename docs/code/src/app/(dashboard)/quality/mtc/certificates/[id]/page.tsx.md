# src/app/(dashboard)/quality/mtc/certificates/[id]/page.tsx

> Client page at `/quality/mtc/certificates/[id]`.

See [../../../README.md](../../../README.md) for this module's shared behaviour.

## What it does

Renders the `/quality/mtc/certificates/[id]` screen. 979 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/mtc/certificates/${id}`, `/api/mtc/certificates/${id}/generate-results`.

## Gotchas

- Large file (979 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
