# src/app/(dashboard)/quotations/page.tsx

> Client page at `/quotations`.

See [README.md](README.md) for this module's shared behaviour.

## What it does

Renders the `/quotations` screen. 453 lines.

## How it works

- `"use client"` — runs in the browser.
- Fetches with TanStack Query (`useQuery`); server state is not duplicated into local state.
- Calls: `/api/quotations`.
- The search box matches quotation no., customer, the client's enquiry ref and
  tender ref (see `quotationSearchWhere` in `src/lib/quotations/listing.ts`);
  its placeholder says so.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
