# src/app/(dashboard)/client-purchase-orders/page.tsx

> Client page at `/client-purchase-orders`.

See [README.md](README.md) for this module's shared behaviour.

## What it does

Renders the `/client-purchase-orders` screen. 213 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/client-purchase-orders?...&view=list`.

## Gotchas

- `view=list` asks the API for the summary shape — line items arrive as bare
  ids, which is all the "Items" count column needs. The P.O. acceptance picker
  (`/po-acceptance/create`) shares this screen's React Query cache key when the
  status filter is `REGISTERED` and the search box is empty, and sends the same
  flag. Drop it here and the two would disagree on the shape behind one cache
  entry. `view` is appended last so the two URLs match character for character.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
