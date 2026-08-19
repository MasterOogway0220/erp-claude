# src/app/(dashboard)/quotations/[id]/page.tsx

> Client page at `/quotations/[id]`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/quotations/[id]` screen. 1719 lines.

## How it works

- `"use client"` — runs in the browser.
- Fetches with TanStack Query (`useQuery`); server state is not duplicated into local state.
- Writes with `useMutation`, invalidating the affected query keys on success.
- Calls: `/api/quotations/${params.id}`, `/api/quotations/${params.id}/activity`, `/api/quotations/${params.id}/email`, `/api/quotations/${params.id}/emails`, `/api/quotations/${params.id}/revise`, `/api/quotations/${params.id}/terms`.

## Gotchas

- Large file (1719 lines). Read the section you are changing rather than pattern-matching from a sibling.
- The standard items table must show every field the edit form saves — Length
  was once saved and printed but not shown here, and users read the gap as
  "my edit didn't save". The total row's `colSpan` is keyed to this column
  count; adding a column means bumping it.
- **Rate and amount cells are three-way**, in both the standard and the
  non-standard branch of the items table: `REGRET` for a line the company
  declined to quote, `---` when `unitRate` is `NULL` (not priced yet), and the
  number otherwise — including a real `0`. `parseFloat(null)` is `NaN`, so
  dropping the null check prints `NaN` on screen. The internal costing table
  further down uses `item.unitRate || 0` and is unaffected.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
