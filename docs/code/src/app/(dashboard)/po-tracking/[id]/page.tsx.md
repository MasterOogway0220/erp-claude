# src/app/(dashboard)/po-tracking/[id]/page.tsx

> Client page at `/po-tracking/[id]`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/po-tracking/[id]` screen. 537 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/po-tracking/${id}`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
