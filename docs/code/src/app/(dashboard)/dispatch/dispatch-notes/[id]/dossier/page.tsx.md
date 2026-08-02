# src/app/(dashboard)/dispatch/dispatch-notes/[id]/dossier/page.tsx

> Client page at `/dispatch/dispatch-notes/[id]/dossier`.

See [../../../README.md](../../../README.md) for this module's shared behaviour.

## What it does

Renders the `/dispatch/dispatch-notes/[id]/dossier` screen. 320 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/dispatch/dispatch-notes`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
