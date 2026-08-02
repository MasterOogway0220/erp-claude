# src/app/(dashboard)/quality/inspection-prep/[id]/page.tsx

> Client page at `/quality/inspection-prep/[id]`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/quality/inspection-prep/[id]` screen. 992 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/customers`, `/api/quality/inspection-prep/${id}`, `/api/quality/inspection-prep/${id}/generate-offer`, `/api/quality/inspection-prep/${prepId}/items/${item.id}/heats`, `/api/quality/inspection-prep/${prepId}/items/${item.id}/heats/${heatId}`, `/api/quality/inspection-prep/${prepId}/items/${itemId}/heats/${heat.id}/mtc`, `/api/quality/inspection-prep/${prepId}/items/${itemId}/heats/${heat.id}/mtc/${mtcId}`.

## Gotchas

- Large file (992 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
