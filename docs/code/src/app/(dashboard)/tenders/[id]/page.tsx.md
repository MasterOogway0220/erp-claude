# src/app/(dashboard)/tenders/[id]/page.tsx

> Client page at `/tenders/[id]`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/tenders/[id]` screen. 790 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/tenders/${id}`, `/api/tenders/${id}/documents`, `/api/tenders/${id}/documents/${docId}`.

## Gotchas

- Large file (790 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
