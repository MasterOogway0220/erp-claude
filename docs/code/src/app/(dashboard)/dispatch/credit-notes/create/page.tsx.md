# src/app/(dashboard)/dispatch/credit-notes/create/page.tsx

> Client page at `/dispatch/credit-notes/create`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/dispatch/credit-notes/create` screen. 280 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/dispatch/invoices`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
