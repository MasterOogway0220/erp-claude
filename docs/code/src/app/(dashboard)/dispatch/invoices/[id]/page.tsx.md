# src/app/(dashboard)/dispatch/invoices/[id]/page.tsx

> Client page at `/dispatch/invoices/[id]`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/dispatch/invoices/[id]` screen. 670 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/dispatch/invoices/${id}`, `/api/dispatch/invoices/${id}/emails`, `/api/dispatch/invoices/${invoice.id}`, `/api/dispatch/invoices/${invoice.id}/e-invoice`, `/api/dispatch/invoices/${invoice.id}/email`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
