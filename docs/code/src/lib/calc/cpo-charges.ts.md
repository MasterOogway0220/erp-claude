# src/lib/calc/cpo-charges.ts

> The six additional charges on a client PO, and the exact field names the API stores them under.

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

## What it does

- `AdditionalCharge` — `{ label, key, taxKey, amount, taxApplicable }`.
- `DEFAULT_CHARGES` — Freight, TPI Charges, Testing Charges, Packing &
  Forwarding, Insurance, Others. Every one starts `taxApplicable: true`.
- `chargePayload(charges)` — flat `{ [key]: amount, [taxKey]: taxApplicable }`
  for spreading into the POST body, plus `otherChargesDescription` — what the
  "Others" charge is for (its `description`, trimmed; null when blank).

## How it works

`key` is the amount column and `taxKey` the boolean column, both as named on
`ClientPurchaseOrder` and destructured by `POST /api/client-purchase-orders`.
The server then adds each charge to the GST base only when its flag is true;
that calculation lives in the route and is unchanged.

## Domain notes

- **TPI** — third-party inspection: an agency (Lloyd's, BV, TUV, SGS) the client
  nominates to inspect material before dispatch. Its fee is often billed on.
- **P&F** — packing and forwarding.
- **GST default.** Freight, packing and insurance charged on a supply of goods
  are part of its taxable value, so "tax applicable" is the right default.
  The user can still switch any charge off.

## Gotchas and constraints

- Adding a charge means a model column for the amount, one for the flag, the
  POST destructure, and an entry here. The test fails if this list names a
  field the route does not read.
- `POAcceptance` carries the same six flags; the acceptance screen copies
  them from the client PO rather than using this list.

## Related

- `src/app/(dashboard)/client-purchase-orders/create/page.tsx` — the only caller.
- `src/app/api/client-purchase-orders/route.ts` — reads these names, does the GST maths.
- `prisma/migrations/20261005090000_charge_tax_default_true` — the matching column defaults.
- Test: `src/lib/calc/cpo-charges.test.ts`.
