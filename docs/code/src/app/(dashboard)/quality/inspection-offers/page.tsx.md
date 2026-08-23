# src/app/(dashboard)/quality/inspection-offers/page.tsx

> Client page at `/quality/inspection-offers`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/quality/inspection-offers` screen. 156 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/quality/inspection-offers`.
- Requests `?view=list`. The table renders `items.length` and no line field, so `items` arrives as ids only.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
