# src/lib/quotations/item-rows.ts

> Maps a quotation form's line items to `QuotationItem` create rows.

## Why this exists

This mapping was inline in `POST /api/quotations`. A client PO registered
against a tender quotation that had no lines now builds that tender's order
quotation from lines typed in the same item editor
([`/api/tenders/[id]/order-quotation`](../../app/api/tenders/[id]/order-quotation/route.ts.md)).
Both routes use this one function, so a line is stored identically whichever
screen it was typed on.

## What it does

`quotationItemRows(items)` numbers the lines `sNo` 1..n and turns the
editor's string fields into column values. Blank becomes NULL, numeric text
becomes a number, and the rate goes through `parseRate`, so a missing rate is
NULL and not 0.

Callers must validate first with `normalizeItemPricing`, which fixes up
qty / rate / amount and handles regret lines. This function only maps.

## Related

- [`pricing.ts`](./pricing.ts.md)
