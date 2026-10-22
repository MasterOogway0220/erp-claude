# src/lib/inventory/stock-write.ts

> The database side of stock entry: find what already exists, then insert rows.

## Why this exists

Both the manual add route and the Excel import route need the same two database
steps. Keeping them here means the duplicate rule and the default status are
written once, so the two entry paths cannot drift apart.

## What it does

- `existingStockKeys(companyId, heatNos)` - returns a `Set` of `stockKey` strings for
  stock already held for that company, limited to the heat numbers given. An
  empty list returns an empty set without querying.
- `createStockRows(companyId, rows)` - inserts the rows with `createMany` and returns
  the count written. Empty input writes nothing.

## How it works

- The lookup filters by `companyId` first, so one company never sees another's
  stock, and by `heatNo IN (...)`, so it stays small on a 2000-row file.
- `form` defaults to `product` when absent, matching the GRN route, which writes the
  same field that way.
- Status is not set here. Prisma applies the schema default `UNDER_INSPECTION`,
  which is the state every new stock line starts in. A line that is already
  inspected must move through QC later, not be inserted as `ACCEPTED`.
- `createMany` is one statement. A failure rolls back the whole insert on MySQL,
  so a file never lands half-written.

## Gotchas and constraints

- `createMany` skips relations and does not return the created rows, only the count.
  Nothing in these routes needs the ids.
- The lookup is a read followed by a write, not a locked transaction. Two
  concurrent imports of the same file can both pass the duplicate check. The
  upgrade path is a unique index on (companyId, heatNo, mtcNo, sizeLabel, rackNo),
  which would need the existing duplicates cleaned first.

## Related

- `stock-rows.ts` - decides what is written.
- `src/app/api/inventory/stock/route.ts` and `.../stock/import/route.ts` - the callers.
- `prisma/schema.prisma` -> `InventoryStock`.
