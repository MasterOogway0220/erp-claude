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
- Calls: `/api/masters/buyers`, `/api/masters/customers`, `/api/masters/customers/${formData.customerId}/terms`, `/api/masters/lengths`, `/api/masters/material-codes`, `/api/masters/material-codes/${dup.id}`, `/api/masters/material-codes/check-duplicate`, `/api/masters/sizes`, `/api/offer-term-templates`, `/api/quotations/material-history`, `/api/quotations/past-prices`.
- Master dropdowns (customers, sizes, lengths, buyers, item codes) read through `useReferenceQuery` (ten minutes) rather than a hand-rolled `useQuery` (60 seconds). The form shares `["customers"]`, `["sizes"]` and `["lengths"]` with the app-wide hooks, so the shorter window had been forcing refetches for every other screen as well. Buyers and item codes keep the customer id and quotation category in their key — those remain a per-customer list, and must never be pointed at a fetch-everything hook.
- Under the read-only customer **Address**, the selected customer's **GSTIN**
  (GST registration number) is shown when the master has one, so the person
  quoting can see which registered entity they are quoting without leaving the
  form. Display only; nothing is saved from it.
- The per-item **Unit** dropdown is populated from Unit Master via
  [`useUnits()`](../../../../../../hooks/use-units.ts.md)
  (`/api/masters/units`). It used to be a module-level
  `UOM_OPTIONS = ["Mtr","Nos","Kg","MT","Feet","Set","Lot"]`, so editing
  Product Master → Units (UOM) had no effect here and the list had already
  drifted from the master's 12 active codes. The per-category *defaults*
  (`Mtr` for pipe, `Nos` for fittings/flanges, `Kg` for plate) stay in this
  file — they are business rules, not a list of legal values.
- The per-item **Length** dropdown is populated from Length Master (`/api/masters/lengths`), not a hardcoded list. A length is the supplied pipe length — either a fixed cut (`6.00 Mtr Fixed`), a range the mill can supply within (`5.00-7.00 Mtr`), or a non-numeric instruction (`Random`, `As Per Drg.`, `Cut Length`). The selected label is stored verbatim on `QuotationItem.length` and printed verbatim on the PDF, so the master's label text is what the customer sees.

### Pipe sizes: size pool vs. Product Master row

A pipe's **Size** field (NPS × Schedule, e.g. `6" NB X Sch 40S`) has two
sources:

- The **pipe-size master** (`/api/masters/sizes`, `PipeSizeMaster`), keyed by
  `pipeType` — `CS_AS` for carbon/alloy, `SS_DS` for stainless/duplex.
  `getPipeType()` derives the pool from the product-name prefix (`C.S.`,
  `A.S.`, `L.T.C.S.` → CS_AS; `S.S.`, `D.S.` → SS_DS). Picking one of these
  sets `sizeId`, and `updateItem`'s `sizeId` branch derives OD, WT, schedule
  and weight/metre from the row.
- The **`size` column on the Product Master row** (`ProductSpecMaster.size`,
  via `getMasterExtraSizes`). This is the only source for pipes with no pool —
  nickel alloy (`N.A.`), titanium, cupro-nickel — where `getPipeType()` is
  `null`.

The combobox merges both (pool first, master-row labels deduped after) and is
enabled as soon as a product is chosen. Choosing a master-row size behaves like
free text: `sizeLabel` is set and `sizeId`/OD/WT/weight are cleared, since
there is no master row to derive them from. `onAutoFill` also copies the
master-row size onto a *blank* item, but only for pool-less pipes — a CS/SS
pipe must get its label via `sizeId` so the derived dimensions stay in sync.

History: the combobox used to be `disabled` whenever `getPipeType()` returned
`null`, showing "Select product first" even with a product selected, and the
autofill skipped every pipe. A client added `N.A. SEAMLESS PIPE` rows with
sizes to the master and the quotation printed `—` for Size on every line.

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
- A quotation raised from a tender that has its own Terms & Conditions
  (`TenderTerm`, from 6 Oct 2026) starts with them, not with the customer's
  or template defaults. The prefill stores them in `tenderTermsRef`. The
  terms loader then re-applies them on every reload, because the prefill
  itself sets the customer, and the customer's type flips the market type,
  and each change re-runs the loader. Stale customer-terms responses are
  dropped once tender terms are present. Rows keep `isCustom`;
  `isHeadingEditable` follows it, as on every saved quotation. The tender's
  Currency row is set to this quotation's currency on every application
  (`followCurrencyTerm`). A USD tender quoted in INR therefore does not print
  "Currency : USD ($)", nor write it back into the customer's default terms
  on save. A tender without terms changes nothing.
- The unit rate round-trips as a **string**, and `""` is not `"0"`. The
  populate effect uses `item.unitRate == null ? "" : String(item.unitRate)`,
  so a line deliberately quoted at zero reopens showing `0` rather than blank.
  (The old rule was `Number(item.unitRate) > 0 ? … : ""`, which erased a saved
  zero on every edit.)

### Regret

Each item row carries a **Regret** checkbox next to the Unit Rate field, for
lines the company declines to quote — the client asked for twelve items, we
can supply nine, and the quotation still lists all twelve so it matches their
enquiry line for line.

Ticking it clears that row's rate and zeroes its amount, disables the rate
input, and shows `REGRET` as the placeholder; the API forces the same values
server-side so a stale payload cannot smuggle a price back in. The PDF prints
`REGRET` in the Unit Rate and Amount columns, and the zeroed amount keeps the
line out of the grand total without any special-casing in the sum.

Quantity is still required on a regretted row — it is the enquiry quantity,
and it is what identifies the line being regretted.

`updateItem` therefore takes `string | boolean`; the `sizeId` branch narrows
with `typeof value === "string"` before using it as a lookup key.

### Line items

The item editor (every line field, the past-quote lookup, Copy From, material-code
recording) lives in the shared
[`StandardItemsEditor`](../../../../../components/quotations/standard-items-editor.tsx.md)
(moved out in Nov 2026 so client PO registration can use the same fields). This page
owns the `items` array, the totals block, saving, edit-load and the tender prefill,
and passes `historyReady={!editId || editLoadedRef.current}`.

### Past Quote / Past PO

Each line shows the price we last quoted this client for **the same item**,
so the salesperson can stay consistent with what the client has already seen.
The rule lives in `src/lib/quotations/past-quote-match.ts`; two gates apply:

1. **We actually gave this client a quote.** Only standard quotations for the
   same client (customer rows with the same name) count, and only ones that
   reached the client. Drafts, quotations pending approval, internally
   rejected ones and cancelled ones are skipped. The quotation being edited
   is excluded so it never matches itself.
2. **Same item.** Product, material, additional spec and size must all
   match, ignoring case and extra spaces. A blank spec matches only a blank
   spec.

How it is wired (inside the shared editor):

- A debounced effect (400 ms) re-runs the lookup
  (`/api/quotations/material-history?customerId=&product=&material=&additionalSpec=&size=`)
  whenever a line's four fields or the client change. It does not refetch on
  unrelated edits (qty, rate). A line that no longer matches anything gets
  Past Quote#, its price, Past PO# and its price **cleared**, because a past
  price for a different item is worse than none.
- Picking a material code no longer triggers the lookup by itself. It fills
  product/material/spec/size, and the effect takes it from there.
- On edit, the loaded lines count as already looked up, so opening a saved
  quotation never rewrites its stored past quote. Only an edit to one of the
  four fields does.
- The **Past Quote#** dropdown is disabled until product, material and size
  are filled in. It lists only past quotes that pass both gates. The item
  picker dialog shows only that quote's matching lines, so the price can't
  come from a different item on the same quote.
- Stale responses are dropped: a result is applied only if the row still has
  the same four-field key it was requested for.

## Gotchas

- Large file (2295 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.
- Length is stored as free text, and older rows hold values that were never in the master (`90`, `1620`, and the pre-master `5.8`/`9.0-11.8` codes). The Length select therefore injects the item's current value as an extra option when the master does not contain it — without that, editing an old quotation would render the field blank and invite the user to overwrite a real value with nothing. The **Unit (UOM)** select applies the same fallback, now against Unit Master rather than a hardcoded array — so a unit deactivated in the master still displays on quotations already saved with it.
- **Currency and GST rate are still hardcoded** here (`CURRENCY_OPTIONS`, `GST_RATES`) even though `CurrencyMaster` (4 rows) and `TaxMaster` (9 rows) exist and are populated. Changing them in Masters does nothing to this form.
- Rows whose length/uom were already nulled by pre-fix saves stay null — the fix stops future loss, it cannot restore past loss (the audit diff did not track `length`/`ends`/`uom` until now).

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
