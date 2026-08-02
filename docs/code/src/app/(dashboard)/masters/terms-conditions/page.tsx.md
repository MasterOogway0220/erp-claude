# src/app/(dashboard)/masters/terms-conditions/page.tsx

> Client page at `/masters/terms-conditions`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/masters/terms-conditions` screen. 615 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/masters/delivery-terms`, `/api/masters/delivery-terms/${item.id}`, `/api/masters/inspection-agencies`, `/api/masters/inspection-agencies/${item.id}`, `/api/masters/payment-terms`, `/api/masters/payment-terms/${item.id}`, `/api/masters/tax`, `/api/masters/tax/${item.id}`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
