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

### Edit mode must not change what it did not touch

A client reported values "changing by themselves" after edits (lengths gone,
currency removed, buyers appearing). The page now enforces one rule: **opening
a quotation and pressing Save must be a no-op.** The pieces:

- The populate effect spreads the raw DB item (`...item`) into form state, so
  columns the form does not edit (costing, hsnCode, tube fields, …) round-trip
  through the PUT's delete-and-recreate instead of being wiped.
- Load-time effect suppression: the populate effect syncs `prevCurrencyRef`,
  `prevQuotationTypeRef`, `termCurrencyRef` and `loadedCustomerIdRef` before
  setting `editLoadedRef`. Without those refs the post-load effect flush
  treated the programmatic state changes as user actions: an EXPORT quotation
  stored in INR was flipped to USD and every rate FX-converted via
  open.er-api.com; a stored GST rate was cleared (changing the grand total); a
  hand-typed Currency term ("USD ($)") was rewritten to "USD"; and a customer
  with exactly one buyer had that buyer silently assigned to a buyer-less
  quotation.
- `termsLoadedForKey` is recorded even when the quotation has zero saved
  terms, so the template effect does not add a full T&C block to a document
  saved without one.
- Terms loads are wrapped in `fillBlankCurrencyTerm` (see
  `src/lib/quotations/currency.ts`) so a blank Currency term is filled from
  the header instead of printing as an empty "Currency :" line.
- Dates load through `toDateInput` (`src/lib/dates.ts`) — the previous
  `toISOString()` used the UTC calendar date, which shifted IST early-morning
  timestamps one day back on every re-save.
- The currency loaded from the DB is trimmed and defaulted (`"INR"`), because
  incident-era rows hold whitespace junk that a `Select` cannot display —
  every "(curr)" label rendered "()".
- The tender prefill effect is create-only (`editId` guard) so a URL carrying
  both `tenderId` and `editId` cannot race the populate and replace saved
  items.

## Gotchas

- Large file (2295 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.
- Length is stored as free text, and older rows hold values that were never in the master (`90`, `1620`, and the pre-master `5.8`/`9.0-11.8` codes). The Length select therefore injects the item's current value as an extra option when the master does not contain it — without that, editing an old quotation would render the field blank and invite the user to overwrite a real value with nothing. The **Unit (UOM)** select applies the same fallback for legacy values like `MTR`.
- Rows whose length/uom were already nulled by pre-fix saves stay null — the fix stops future loss, it cannot restore past loss (the audit diff did not track `length`/`ends`/`uom` until now).

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
