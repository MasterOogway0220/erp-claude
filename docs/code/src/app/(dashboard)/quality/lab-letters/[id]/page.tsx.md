# src/app/(dashboard)/quality/lab-letters/[id]/page.tsx

> Client page at `/quality/lab-letters/[id]`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/quality/lab-letters/[id]` screen. 282 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/quality/lab-letters/${id}`, `/api/quality/lab-letters/${id}/pdf`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
