# src/app/(dashboard)/tenders/create/page.tsx

> Client page at `/tenders/create`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/tenders/create` screen. 535 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/masters/customers`, `/api/quotations/preview-number`, `/api/tenders`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
