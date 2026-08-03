# src/app/(dashboard)/quotations/create/standard/page.tsx

> Client page at `/quotations/create/standard`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/quotations/create/standard` screen. 2295 lines.

## How it works

- `"use client"` — runs in the browser.
- Fetches with TanStack Query (`useQuery`); server state is not duplicated into local state.
- Writes with `useMutation`, invalidating the affected query keys on success.
- Reads `useSearchParams`, so it **must sit inside a `<Suspense>` boundary** — Next.js 16 fails the build otherwise.
- Calls: `/api/masters/buyers`, `/api/masters/customers`, `/api/masters/customers/${formData.customerId}/terms`, `/api/masters/lengths`, `/api/masters/material-codes`, `/api/masters/material-codes/${dup.id}`, `/api/masters/material-codes/check-duplicate`, `/api/masters/sizes`, `/api/offer-term-templates`.
- The per-item **Length** dropdown is populated from Length Master (`/api/masters/lengths`), not a hardcoded list. A length is the supplied pipe length — either a fixed cut (`6.00 Mtr Fixed`), a range the mill can supply within (`5.00-7.00 Mtr`), or a non-numeric instruction (`Random`, `As Per Drg.`, `Cut Length`). The selected label is stored verbatim on `QuotationItem.length` and printed verbatim on the PDF, so the master's label text is what the customer sees.

## Gotchas

- Large file (2295 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.
- Length is stored as free text, and older rows hold values that were never in the master (`90`, `1620`, and the pre-master `5.8`/`9.0-11.8` codes). The Length select therefore injects the item's current value as an extra option when the master does not contain it — without that, editing an old quotation would render the field blank and invite the user to overwrite a real value with nothing.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
