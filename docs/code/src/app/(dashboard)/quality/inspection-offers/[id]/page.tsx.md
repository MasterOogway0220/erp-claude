# src/app/(dashboard)/quality/inspection-offers/[id]/page.tsx

> Client page at `/quality/inspection-offers/[id]`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/quality/inspection-offers/[id]` screen. 419 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/quality/inspection-offers/${id}`, `/api/quality/inspection-offers/${id}/pdf`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
