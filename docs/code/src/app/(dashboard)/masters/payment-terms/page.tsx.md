# src/app/(dashboard)/masters/payment-terms/page.tsx

> Client page at `/masters/payment-terms`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/masters/payment-terms` screen. 394 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/masters/payment-terms`, `/api/masters/payment-terms/${item.id}`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
