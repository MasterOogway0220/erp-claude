# src/app/(dashboard)/tenders/[id]/page.tsx

> Client page at `/tenders/[id]`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/tenders/[id]` screen. 842 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/tenders/${id}`, `/api/tenders/${id}/documents`, `/api/tenders/${id}/documents/${docId}`.
- An **Edit** button (to `/tenders/create?editId=<id>`) shows while the tender is undecided; it is hidden once it is won, lost or no-bid (`isTerminal`).
- A **Delete** button (soft delete, after a `confirm()`) shows only while no quotation or sales order has been raised from the tender; the API enforces the same rule and returns to the tender list on success.
- A read-only **Terms & Conditions** card lists the tender's ticked terms (from `GET /api/tenders/[id]`); it is hidden when none are ticked. They are edited on the edit screen.

## Gotchas

- Large file (842 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
