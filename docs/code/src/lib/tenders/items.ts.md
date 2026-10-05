# src/lib/tenders/items.ts

> Turns a tender's submitted BOQ lines into `TenderItem` rows.

## Why this exists

A tender's BOQ (bill of quantities: the products and quantities the client is
asking bidders to price) is written when the tender is registered and, since
5 Oct 2026, replaced wholesale when it is edited. One mapping for both keeps
an edited line identical in shape to a new one.

## What it does

`tenderItemRows(items)` → array of `{ sNo, product, material, additionalSpec,
sizeLabel, quantity, uom, estimatedRate, amount, remarks }`.

- `sNo` is 1..n in the order given.
- Text fields are trimmed; blank → `null`.
- `quantity` → number, 0 when missing or not numeric.
- `estimatedRate` → number or `null`; `amount` = quantity × rate when both are
  present, else `null`.
- `null` / `undefined` input → `[]`.

## How it works

Plain mapping; no `tenderId` — the caller adds it (create nests the rows under
the tender, edit adds `tenderId` for `createMany`).

## Gotchas and constraints

None beyond the field rules above.

## Related

- `src/app/api/tenders/route.ts` (POST), `src/app/api/tenders/[id]/route.ts` (PATCH).
- Test: `src/lib/tenders/items.test.ts`.
