# src/lib/calc/cpo-charges.ts

> The six additional charges on a client PO, the exact field names the API stores them under, and the GST the order carries.

## Why this exists

The client PO create page used to derive each charge's tax flag name from its
amount name (`key + "TaxApplicable"`). Three of the six model columns do not
follow that pattern: `tpiCharges` is flagged by `tpiTaxApplicable`,
`testingCharges` by `testingTaxApplicable`, `packingForwarding` by
`packingTaxApplicable`. The server never received those three flags, coerced
them to false, and computed GST on a smaller base than the screen showed.
Reproduced on 5 Oct 2026: screen grand total ₹48,69,801, stored ₹48,69,495.

Spelling the names out in one place, with a test that checks them against the
POST route, removes the guesswork.

`cpoGst` was taken out of the POST route on 6 Oct 2026 to fix a second
mismatch: the create screen showed "GST not applicable" on an export (a
non-INR order not delivered in India) yet still posted its GST rate field (18%
by default), and the route added GST whenever the rate was above 0 — so the
stored grand total would have carried GST the screen never showed. No non-INR
client PO existed in live data when it was fixed.

## What it does

- `AdditionalCharge` — `{ label, key, taxKey, amount, taxApplicable }`.
- `DEFAULT_CHARGES` — Freight, TPI Charges, Testing Charges, Packing &
  Forwarding, Insurance, Others. Every one starts `taxApplicable: true`.
- `chargePayload(charges)` — flat `{ [key]: amount, [taxKey]: taxApplicable }`
  for spreading into the POST body, plus `otherChargesDescription` — what the
  "Others" charge is for (its `description`, trimmed; null when blank).
- `cpoGst({ taxableAmount, gstRate, currency, isDomesticDelivery, isInterState })`
  → `{ gstRate, cgst, sgst, igst }`, the figures the POST route stores. On an
  export (`currency` not INR and `isDomesticDelivery` false) everything is 0,
  `gstRate` included, so the route stores the rate as null. Otherwise IGST at
  the full rate when `isInterState`, else CGST and SGST at half the rate each.

## How it works

`key` is the amount column and `taxKey` the boolean column, both as named on
`ClientPurchaseOrder` and destructured by `POST /api/client-purchase-orders`.
The route adds each charge to the GST base (`taxableAmount`) only when its flag
is true, then passes that base to `cpoGst`.

`cpoGst` takes the currency the route stores — set from the customer type,
not from the request — and returns the rate it applied: 0 when GST does not
apply, so a rate the form sent for an export never reaches the record (the
detail screen and the acceptance letter print GST rows from the stored rate
and amounts). A rate of 0 or below, or one that is not a number, also gives
no GST. Amounts are not rounded here; the decimal columns round them on save.

## Domain notes

- **TPI** — third-party inspection: an agency (Lloyd's, BV, TUV, SGS) the client
  nominates to inspect material before dispatch. Its fee is often billed on.
- **P&F** — packing and forwarding.
- **GST default.** Freight, packing and insurance charged on a supply of goods
  are part of its taxable value, so "tax applicable" is the right default.
  The user can still switch any charge off.
- **Export** — goods supplied to an overseas buyer and shipped out of India
  are zero-rated: no GST. An overseas client who takes delivery at an Indian
  site is a domestic supply and pays GST; that is what the "Domestic Delivery"
  switch on the client PO form records. CGST / SGST / IGST are explained in
  `po-totals.ts.md`.

## Gotchas and constraints

- Adding a charge means a model column for the amount, one for the flag, the
  POST destructure, and an entry here. The test fails if this list names a
  field the route does not read.
- `POAcceptance` carries the same six flags; the acceptance screen copies
  them from the client PO rather than using this list.

## Related

- `src/app/(dashboard)/client-purchase-orders/create/page.tsx` — calls `DEFAULT_CHARGES` / `chargePayload`.
- `src/app/api/client-purchase-orders/route.ts` — reads these names, works out the GST base, calls `cpoGst`.
- `src/lib/calc/po-totals.ts` — `computePOTotals`, which applies the same export rule.
- `prisma/migrations/20261005090000_charge_tax_default_true` — the matching column defaults.
- Test: `src/lib/calc/cpo-charges.test.ts`.
