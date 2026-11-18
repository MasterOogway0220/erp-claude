# src/app/api/quality/inspection-prep/[id]/items/route.ts

> `/api/quality/inspection-prep/[id]/items` — POST

See [../../../README.md](../../../README.md) for this module's shared behaviour, and
[the API pattern](../../../../README.md) for the conventions every route follows.

## What it does

Operates on `inspectionPrepItem`.

- **POST** — Add a line item to an inspection prep. **201** with the item; **404** `"Inspection prep not found"` if the prep is not in the caller's company; **500** `"Failed to add item"` on any other error.

## How it works

- Gated by `checkAccess("inspectionPrep", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- **Company-scoped through the parent record.** The item table has no
  `companyId`, so the route first loads the prep with
  `{ id, ...companyFilter(companyId) }` and 404s if it is not there. Before
  this, any logged-in user could add items to another company's inspection
  prep by id.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- The 500 message is generic. It used to return `error.message`, which leaked Prisma internals (table and constraint names) to the browser; details now go to the server log only.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../../README.md)
