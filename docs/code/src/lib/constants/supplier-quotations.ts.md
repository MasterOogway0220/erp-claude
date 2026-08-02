# src/lib/constants/supplier-quotations.ts

> Picklists for supplier quotations: charge types, pricing units, price basis,
> and quotation status.

## Why this exists

A vendor's quotation is not one number. It is a rate, a pricing unit, a price
basis and a stack of separate charges — and the comparative statement can only
rank vendors fairly if every quote is captured against the same vocabulary.

Fixed constants rather than a master table because these are commercial trade
terms (Incoterms and their local variants), not company preferences.

## What it does

| Export | Contents |
|---|---|
| `CHARGE_TYPES` | 10 charge lines including `CUSTOM`. |
| `STANDARD_CHARGES` | The same list minus `CUSTOM`. |
| `PRICING_UNITS` | Per metre, piece, metric ton, kg, lumpsum. |
| `PRICE_BASIS_OPTIONS` | Ex-Works, FOR, CIF, FOB, Delivered. |
| `SQ_STATUSES` | Received → Under Review → Compared → Accepted/Rejected/Expired. |

## How it works

`STANDARD_CHARGES` is derived — `CHARGE_TYPES.filter(c => c.value !== "CUSTOM")`
— so the two cannot drift. The form pre-populates the standard rows and lets a
buyer add `CUSTOM` lines for anything a vendor invents.

All lists are `as const`.

## Domain notes

**Price basis decides who pays for what**, and is the single most important
field when comparing quotes:

- **Ex-Works** — buyer collects from the vendor's premises and bears
  everything from there.
- **FOR** (Free on Rail) — vendor delivers to the railhead.
- **FOB** (Free on Board) — vendor covers cost to the ship's rail; buyer takes
  it from there.
- **CIF** (Cost, Insurance and Freight) — vendor covers freight and insurance
  to the destination port.
- **Delivered** — vendor covers everything to the door.

A CIF quote that looks dearer than an Ex-Works one can be cheaper landed, which
is exactly why the comparative statement ranks on **total landed cost** rather
than rate.

**Pricing units** matter because pipe trades by metre or by weight depending on
the vendor. Comparing a per-metre quote against a per-MT quote requires the
weight conversion in `weight-calculation.ts`.

**Charge types:** freight, testing, TPI, packing & forwarding, insurance are
routine. **Tooling** and **Die** charges are one-off setup costs for
non-standard sizes — a mill making a size it does not normally roll. **Minimum
order surcharge** applies below a mill's minimum quantity.

## Gotchas and constraints

- **Values are stored.** Changing one orphans existing rows.
- `SQ_STATUSES` duplicates a Prisma enum. They must stay in step; the constant
  exists to attach display labels.
- No currency here — that is on the quotation record.

## Related

- `prisma/schema.prisma` → `SupplierQuotation`, `SupplierQuotationCharge`,
  `PriceBasis`.
- `src/app/(dashboard)/purchase/supplier-quotations/**`
- `src/app/(dashboard)/purchase/comparative-statement/**` — landed-cost
  ranking.
