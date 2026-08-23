# src/app/(dashboard)/quality/qc-release/create/page.tsx

> Client page at `/quality/qc-release/create`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/quality/qc-release/create` screen. 230 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/quality/inspections`, `/api/quality/qc-release`.
- Requests `/api/quality/inspections?view=list`. Everything this screen needs — the stock row's id, status, product, size and quantity — is in the summary shape; the measured parameters it never reads are not.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
