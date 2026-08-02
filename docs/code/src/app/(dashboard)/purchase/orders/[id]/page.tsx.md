# src/app/(dashboard)/purchase/orders/[id]/page.tsx

> Client page at `/purchase/orders/[id]`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/purchase/orders/[id]` screen. 934 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/purchase/orders/${id}`, `/api/purchase/orders/${po.id}`, `/api/purchase/orders/${po.id}/amend`, `/api/purchase/orders/${poId}/variance`.

## Gotchas

- Large file (934 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
