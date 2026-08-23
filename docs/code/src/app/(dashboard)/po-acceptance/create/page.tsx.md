# src/app/(dashboard)/po-acceptance/create/page.tsx

> Client page at `/po-acceptance/create`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/po-acceptance/create` screen. 1551 lines.

## How it works

- `"use client"` — runs in the browser.
- Reads `useSearchParams`, so it **must sit inside a `<Suspense>` boundary** — Next.js 16 fails the build otherwise.
- Calls: `/api/client-purchase-orders`, `/api/client-purchase-orders/${cpoId}`, `/api/masters/customer-contacts`, `/api/po-acceptance`, `/api/po-acceptance/${createdId}/email`, `/api/po-acceptance/${newId}/finalize`.

## Gotchas

- Large file (1551 lines). Read the section you are changing rather than pattern-matching from a sibling.
- The CPO dropdown deliberately reuses the CPO register screen's React Query key
  and URL, `?status=REGISTERED&view=list`, so the two share one cache entry.
  `view=list` returns the summary shape (line items as bare ids); this picker
  reads only header fields, and the priced lines come from the per-CPO fetch. If
  you change either the key or the flag, change the register screen to match —
  otherwise whichever query lands first fills the cache with a shape the other
  cannot read, and the dropdown or the table silently empties.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
