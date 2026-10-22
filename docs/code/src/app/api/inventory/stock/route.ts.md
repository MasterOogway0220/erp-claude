# src/app/api/inventory/stock/route.ts

> `/api/inventory/stock` — GET (list, filtered), POST (add stock by hand).

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## Why this exists

The stock list was read-only. Stock came in only through a goods receipt, so
an existing inventory held outside the system had to be re-entered by GRN.
POST lets the stores team add stock lines directly, one or many. The bulk path is
the sheet import in `stock/import/route.ts`.

## What it does

- **GET** — the list. Filters: status, product, size, heat, location, warehouse,
  rack, bay, vendor, self-stock. Paged, with a status summary. Unchanged by this work.
- **POST** — body `{ items: [ {...}, ... ] }`. A single add is one item. Up to 500
  items per request. Returns `201 { created }`.
  - `400 { error, issues: [{ line, error }] }` when any line is invalid. Nothing is written.
  - `409 { error, duplicates: [{ line, key }] }` when a line already exists (same
    heat, MTC, size and rack), either in the database or earlier in the same request.
    Nothing is written.
  - `400` when no active company is selected.

## How it works

- Auth: `checkAccess("inventory", "write")`. Role enforcement is disabled app-wide
  (see `rbac.ts`), so this is authentication only.
- Company: the row is written to the session's `companyId`. A user without one is
  refused rather than writing unscoped stock.
- Every line goes through `normalizeStockRow` before any database call. Validation
  errors are collected for all lines, so the user sees every bad line at once.
- Duplicates are checked against the database (`existingStockKeys`) and within
  the request (`seen`). The whole request is refused on any duplicate.
- Insert through `createStockRows` as `UNDER_INSPECTION`.

## Gotchas

- `items` may be non-array or missing; both return the "Add at least one item" error.
- Warnings from normalisation (for example an MTC type that is not 3.1/3.2) are not
  returned on POST. The manual form has no warning step; the import dialog does.
- No audit row is written for manual adds (GRN and stock updates do write one).
  Add it here if the audit trail for manual adds becomes a requirement.

## Related

- `src/lib/inventory/stock-rows.ts`, `stock-write.ts`.
- `src/components/inventory/add-stock-dialog.tsx` — the caller.
- `src/app/api/inventory/stock/import/route.ts` — the bulk path.
- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../README.md)
