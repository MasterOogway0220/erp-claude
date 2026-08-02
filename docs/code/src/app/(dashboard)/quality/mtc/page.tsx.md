# src/app/(dashboard)/quality/mtc/page.tsx

> Client page at `/quality/mtc`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/quality/mtc` screen. 200 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/quality/mtc/${mtcId}`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
