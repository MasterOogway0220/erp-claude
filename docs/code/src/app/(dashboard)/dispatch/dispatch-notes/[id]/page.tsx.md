# src/app/(dashboard)/dispatch/dispatch-notes/[id]/page.tsx

> Client page at `/dispatch/dispatch-notes/[id]`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/dispatch/dispatch-notes/[id]` screen. 319 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/dispatch/dispatch-notes`, `/api/dispatch/packing-lists/${found.packingList.id}`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
