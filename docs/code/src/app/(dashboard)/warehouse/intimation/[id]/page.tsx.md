# src/app/(dashboard)/warehouse/intimation/[id]/page.tsx

> Client page at `/warehouse/intimation/[id]`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/warehouse/intimation/[id]` screen. 672 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/warehouse/intimation/${id}`, `/api/warehouse/intimation/${id}/details`, `/api/warehouse/intimation/${id}/generate-inspection-offer`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
