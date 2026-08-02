# src/app/(dashboard)/purchase/supplier-quotations/create/page.tsx

> Client page at `/purchase/supplier-quotations/create`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/purchase/supplier-quotations/create` screen. 748 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/masters/vendors`, `/api/purchase/rfq`, `/api/purchase/supplier-quotations`.

## Gotchas

- Large file (748 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
