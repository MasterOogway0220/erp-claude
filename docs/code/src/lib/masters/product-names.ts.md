# src/lib/masters/product-names.ts

> One comparison key for product names, so spellings that differ only in case or spaces count as one product.

## Why this exists

`ProductSpecMaster.product` is free text with no unique constraint. The live
master holds both "C.S. SEAMLESS PIPE" and "C.S. SEAMLESS PIPE " (a trailing
space), and the product picker de-duplicated on the exact string, so "C.S.
Seamless" appeared twice on quotation create (the 03/10/26 meeting note). Its
other comparisons were case-insensitive but not space-insensitive, so picking
one spelling hid the materials stored under the other.

## What it does

- `productKey(name)` — `name.trim().toUpperCase()`.
- `uniqueProductNames(names)` — one entry per key, the first spelling seen
  (trimmed), sorted.

## How it works

A `Map` from key to first spelling. Nothing is rewritten in the database: the
duplicate rows still exist and are still matched, they just list once.

## Domain notes

"C.S." is carbon steel; "SEAMLESS PIPE" is pipe made without a weld seam. The
product name is the first thing a quotation line is built from.

## Gotchas and constraints

- The duplicate rows remain in the master. Merging them is a data clean-up
  that needs sign-off; the products POST now refuses new exact duplicates.
- A `@@unique` on the master is not possible until that clean-up is done, and
  the master seeder uses `createMany`.

## Related

- `src/components/shared/product-material-select.tsx` — the picker.
- `src/app/api/masters/products/route.ts` — POST duplicate guard.
- Test: `src/lib/masters/product-names.test.ts`.
