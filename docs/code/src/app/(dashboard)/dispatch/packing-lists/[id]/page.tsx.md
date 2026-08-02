# src/app/(dashboard)/dispatch/packing-lists/[id]/page.tsx

> Client page at `/dispatch/packing-lists/[id]`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/dispatch/packing-lists/[id]` screen. 278 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/dispatch/packing-lists/${id}`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
