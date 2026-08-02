# src/app/(dashboard)/purchase/supplier-quotations/[id]/page.tsx

> Client page at `/purchase/supplier-quotations/[id]`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/purchase/supplier-quotations/[id]` screen. 686 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/purchase/supplier-quotations/${id}`, `/api/purchase/supplier-quotations/${id}/documents`, `/api/purchase/supplier-quotations/${id}/documents/${docId}`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
