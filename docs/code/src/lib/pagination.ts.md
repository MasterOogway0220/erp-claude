# src/lib/pagination.ts

> Turns the `pageSize` query parameter into a row limit for list endpoints.

## Why this exists

List endpoints used to return every row. The inventory table then showed 10 rows per page over whatever came back, and a list over a few thousand rows would make each request slow. The default (500) covers the stock and document lists today; the cap (500) stops one request from pulling the whole table.

## What it does

- `takeFrom(searchParams, fallback = 500, max = 500)` returns `pageSize` from the query, or the fallback when it is missing, not a number, zero or negative. Values above `max` are reduced to `max`.

## How it works

- Parses with `parseInt(..., 10)` and checks `Number.isFinite` and `> 0`. Anything else falls through to the fallback, so bad input never reaches Prisma.

## Gotchas and constraints

- It is a row limit, not a page offset. There is no `page` parameter; a list larger than 500 rows is cut at 500 with no way to reach the rest. Upgrade path: add cursor paging when a list reaches the cap.
- Used by the list GET of GRN, dispatch invoices, stock issues, purchase orders and dispatch notes.

## Related

- `pagination.test.ts`
- `src/app/api/inventory/grn/route.ts` and the other four list routes.
