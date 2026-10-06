# src/lib/calc/cpo-totals.ts

> An order's totals worked the way the client PO works them: GST only on the
> charges ticked taxable, the total rounded to the rupee.

## Why this exists

The P.O. acceptance screen priced the order with `computePOTotals`
(`po-totals.ts`), which charges GST on the material value plus *every*
additional charge. The client PO it accepts lets each charge be ticked
"Taxable" or not and taxes only the ticked ones. So as soon as one charge was
unticked, the acceptance showed and saved more GST and a bigger total than the
client PO it was accepting. It also saved an unrounded grand total (15,944.62)
next to a round-off it never applied. Found on the sandbox login, 6 Oct 2026.

## What it does

`cpoTotals({ subtotal, charges, gstRate, isInterState })` →
`{ subtotal, additionalChargesTotal, taxableAmount, cgst, sgst, igst, roundOff, grandTotal }`
— the eight total columns `POAcceptance` stores, under the same names, so a
caller can spread the result straight into its payload.

- `subtotal` — material value, Σ qty × rate.
- `charges` — `{ amount, taxApplicable }[]`: the six additional charges.
- `gstRate` — percent. Pass 0 when GST does not apply (an export: a
  foreign-currency order not delivered in India). The function has no
  currency logic of its own.
- `isInterState` — IGST when true, CGST + SGST when false.

Pure.

## How it works

The same steps, in the same floating-point order, as
`POST /api/client-purchase-orders`, so the same inputs give the same grand
total:

1. `additionalChargesTotal` is every charge; `taxableAmount` is the subtotal
   plus only the ticked ones. An unticked charge is still paid, just not taxed.
2. GST on `taxableAmount`: IGST at the full rate, or CGST and SGST at half
   each. Not rounded at this point — the client PO does not round it either.
3. `grandTotal = Math.round(subtotal + every charge + GST)`: to the rupee,
   half up. `roundOff` is the grand total minus that unrounded sum.
4. Every figure except the grand total is then rounded to paise. The
   `POAcceptance` columns are `Decimal(14, 2)` (`roundOff` `Decimal(10, 2)`) and
   the live MySQL rounds extra decimals silently, so rounding here first makes
   the screen show exactly what the database will hold.

`roundOff` is normalised from -0 to 0. A subtotal such as 88.2 m × 4,224.50 +
24 × 71.74 sums to 374,322.66000000003 in floating point; the total lands a
hair above the rupee, `toFixed(2)` gives "-0.00", and the screen printed the
round-off as "+-0.00".

## Domain notes

- **GST** — India's Goods and Services Tax. Within one state it is split into
  CGST (central) and SGST (state) at half the rate each; across state lines it
  is IGST at the full rate. `po-totals.ts.md` has the longer note.
- **Additional charges** — freight, TPI (third-party inspection) charges,
  testing charges, P&F (packing and forwarding), insurance and "Others", each
  with its own Taxable tick on the client PO. See `cpo-charges.ts.md`.
- **Round-off** — orders are billed to the whole rupee; the paise difference is
  shown as its own line so the figures still add up.

## Gotchas and constraints

- The client PO's own POST route and create form work these figures out
  themselves, not through this function. A change to the rule has to change
  them too, or the acceptance and the order disagree again.
- GST is added to the total unrounded, as on the client PO. So in rare cases
  the printed CGST + SGST + round-off differ from the grand total by a paisa
  or two. The client PO has the same property; matching its grand total
  exactly was the point.
- Pass the charges in the client PO route's order (freight, TPI, testing,
  P&F, insurance, others) and the floating-point sums are bit-identical to its
  own.
- `po-totals.ts` is the older all-charges-taxed version. The legacy
  acceptance page (`page.legacy.tsx`) still uses it until the sandbox preview
  goes live.

## Related

- `src/app/(dashboard)/po-acceptance/create/page.sandbox.tsx` — the caller.
- `src/app/api/client-purchase-orders/route.ts` (POST) — the arithmetic this
  mirrors.
- `src/lib/calc/po-totals.ts` — the older version.
- Test: `src/lib/calc/cpo-totals.test.ts`.
