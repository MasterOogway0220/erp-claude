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
- Calls: `/api/masters/buyers`, `/api/masters/customers`, `/api/masters/customers/${formData.customerId}/terms`, `/api/masters/material-codes`, `/api/masters/material-codes/${dup.id}`, `/api/masters/material-codes/check-duplicate`, `/api/masters/units` (via `useUnits`), `/api/offer-term-templates`, `/api/quotations/${editId}`.
- The per-item **Unit** dropdown is populated from Unit Master via
  [`useUnits()`](../../../../../../hooks/use-units.ts.md). It used to be a
  module-level `UOM_OPTIONS` array, identical to and separate from the
  standard page's — so Product Master → Units (UOM) reached neither form.

## Gotchas

- **A non-standard line is free text only.** There is no Item/Fitting/Flange
  category and no "Structured" entry mode — both were removed. A non-standard
  item is something the pipe/fitting/flange masters cannot describe (a clad
  plate, a bought-out special), so the typed description *is* the item and gets
  printed verbatim on the PDF.
- **Editing must not rewrite what the form does not show.** The first version
  of the free-text refactor rebuilt the PUT payload from scratch — every edit
  overwrote `product` with "Non-Standard Item", `itemType` with "Item", and
  nulled `hsnCode`, per-item `taxRate`, `dimStandard`, OD/WT, weights, the six
  costing columns, tube/component fields and the `fittingId`/`flangeId` FKs.
  That is the "values changing by themselves" bug the client reported. The
  populate effect now spreads the raw DB row into state and `handleSubmit`
  spreads it back, so hidden columns round-trip untouched; only new rows get
  the `"Item"` / `"Non-Standard Item"` defaults.
- Same edit-mode discipline as the standard page (see its doc for the full
  list): load-time effects are ref-suppressed so opening an EXPORT+INR row
  cannot FX-reprice it, a stored GST rate or hand-typed Currency term
  survives load, a sole buyer is not auto-assigned to a buyer-less quotation,
  zero-terms quotations do not gain template terms, dates go through
  `toDateInput`, terms loads go through `fillBlankCurrencyTerm`, and the
  tender prefill is create-only.
- **Regret and zero rates** work exactly as on the standard page (see its doc
  for the full explanation): a **Regret** checkbox sits beside each row's Unit
  Rate for lines the company declines to quote, ticking it clears the rate and
  amount and shows `REGRET` in both fields, and the populate effect preserves a
  saved rate of `0` instead of reopening the row blank. The submit mapping here
  lists fields explicitly rather than spreading, so `isRegret` had to be added
  to it by name.
- Large file (1794 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.
- The Unit select injects the item's stored value as an extra option when Unit Master no longer contains it, so editing an old quotation shows the saved unit rather than a blank.
- **Currency and GST rate are still hardcoded** here (`CURRENCY_OPTIONS`, `GST_RATES`) despite populated `CurrencyMaster` and `TaxMaster` tables.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
