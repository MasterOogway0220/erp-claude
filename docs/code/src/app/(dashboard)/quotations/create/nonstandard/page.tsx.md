# src/app/(dashboard)/quotations/create/nonstandard/page.tsx

> Client page at `/quotations/create/nonstandard`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/quotations/create/nonstandard` screen. 1794 lines.

## How it works

- `"use client"` — runs in the browser.
- Fetches with TanStack Query (`useQuery`); server state is not duplicated into local state.
- Writes with `useMutation`, invalidating the affected query keys on success.
- Reads `useSearchParams`, so it **must sit inside a `<Suspense>` boundary** — Next.js 16 fails the build otherwise.
- Calls: `/api/masters/buyers`, `/api/masters/customers`, `/api/masters/customers/${formData.customerId}/terms`, `/api/masters/material-codes`, `/api/masters/material-codes/${dup.id}`, `/api/masters/material-codes/check-duplicate`, `/api/offer-term-templates`, `/api/quotations/${editId}`.

## Gotchas

- **A non-standard line is free text only.** There is no Item/Fitting/Flange
  category and no "Structured" entry mode — both were removed. A non-standard
  item is something the pipe/fitting/flange masters cannot describe (a clad
  plate, a bought-out special), so the typed description *is* the item and gets
  printed verbatim on the PDF. Every row saves as `itemType: "Item"` /
  `product: "Non-Standard Item"`, and `fittingId`/`flangeId` are no longer sent.
- Historical rows created before that change may still carry a `fittingId`,
  `flangeId` or a real product name. They load as plain free text from the saved
  `itemDescription` (which was always persisted), and re-saving clears the stale
  FKs. Nothing reconstructs the old picker.
- Large file (1794 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
