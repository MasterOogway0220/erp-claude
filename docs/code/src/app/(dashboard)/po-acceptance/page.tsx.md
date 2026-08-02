# src/app/(dashboard)/po-acceptance/page.tsx

> Client page at `/po-acceptance`.

See [README.md](README.md) for this module's shared behaviour.

## What it does

Renders the `/po-acceptance` screen. 217 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/po-acceptance`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
