# src/app/(dashboard)/warehouse/intimation/page.tsx

> Client page at `/warehouse/intimation`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/warehouse/intimation` screen. 11 lines.

## How it works

- `"use client"` — runs in the browser.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
