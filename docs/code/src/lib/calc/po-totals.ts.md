# src/lib/calc/po-totals.ts

> Turns line items and additional charges into a taxable amount, a GST split
> and a grand total.

## Why this exists

The same arithmetic is needed by the Client PO screen, the PO Acceptance
wizard and the documents printed from both. Three implementations of a tax
calculation is three chances to disagree with each other, and a disagreement
here is a wrong number on an invoice.

The rules are also not obvious. Whether GST applies at all depends on the
customer *and* the delivery, and whether it splits into CGST+SGST or lands as
IGST depends on state lines. Both are easy to get subtly wrong and hard to spot
after the fact.

## What it does

`computePOTotals(input)` → `{ subtotal, additionalChargesTotal, taxableAmount,
cgst, sgst, igst, grandTotal }`.

Pure. Inputs are plain numbers; the caller has already parsed them.

## How it works

### Taxable amount

`subtotal` (Σ qty × rate) + `additionalChargesTotal` (freight, packing,
insurance, other, testing, TPI).

Note that **charges are taxed**. Under Indian GST, freight and packing &
forwarding charged on an invoice form part of the taxable value of the supply
— they are not tax-free add-ons. Adding them before applying the rate is
deliberate and legally required.

### Does GST apply?

```ts
const gstApplies = !input.isInternational || input.isDomesticDelivery;
```

Two cases:

- **Domestic customer** — always.
- **International customer** — only when `isDomesticDelivery` is true. An
  export is zero-rated, but an overseas client who has the material delivered
  to an Indian site is a domestic supply and attracts GST. That flag is what
  the "Domestic Delivery" switch on the Client PO form sets, and this is the
  only place it changes a number.

### CGST/SGST vs IGST

`isInterState` decides. Intra-state supplies split the rate in half between
Central and State GST — hence `/ 200` rather than `/ 100`, which is the rate
halved and converted from a percentage in one step. Inter-state supplies levy
the whole rate as Integrated GST.

The unused components stay `0` rather than `null`, so callers can total them
unconditionally.

### Rounding

Each tax component is rounded to 2 dp **as it is computed**, then the grand
total is rounded again after summing. Rounding the components first means the
printed CGST and SGST lines add up to the printed total — if you rounded only
at the end, an invoice could show two 2-decimal figures that do not sum to the
third, which an accounts department will query.

`subtotal`, `additionalChargesTotal` and `taxableAmount` are **not** rounded.
They are intermediate.

## Domain notes

- **GST** — India's Goods and Services Tax. **CGST** Central, **SGST** State,
  **IGST** Integrated. Intra-state → CGST + SGST, each half the rate.
  Inter-state → IGST at the full rate. Never both.
- **Place of supply** determines "inter-state": the supplier's state versus the
  client's. This is why the Client PO carries `supplierState` and
  `clientState`, and why picking the right dispatch address matters
  commercially, not just logistically.
- **TPI** — Third Party Inspection, an independent agency (Lloyd's, BV, TUV,
  SGS) the client nominates to witness testing. Their fee is often passed
  through as a charge, hence its own line.

## Gotchas and constraints

- The caller decides `isInterState`; this function does not compare states.
- No currency handling. `currency` is on the input type but unused in the
  arithmetic — GST is only meaningful in INR, and an export with
  `isDomesticDelivery = false` produces zero tax anyway.
- No per-line tax rates. One rate for the whole document, which matches how
  the company quotes.

## Related

- `src/lib/calc/po-totals.test.ts`
- `src/app/(dashboard)/client-purchase-orders/create/page.tsx`
- `src/app/api/po-acceptance/[id]/route.ts`
