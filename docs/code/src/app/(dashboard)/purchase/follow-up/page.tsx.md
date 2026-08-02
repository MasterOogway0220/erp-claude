# src/app/(dashboard)/purchase/follow-up/page.tsx

> Client page at `/purchase/follow-up`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/purchase/follow-up` screen. 597 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/purchase/orders/${selectedPO.id}`, `/api/purchase/orders/tracking`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
