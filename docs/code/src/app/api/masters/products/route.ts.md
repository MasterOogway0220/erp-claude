# src/app/api/masters/products/route.ts

> `/api/masters/products` — GET, POST

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `productSpecMaster`.

- **GET** — Read
- **POST** — Create

## How it works

- Gated by `checkAccess("masters", "read")`, `checkAccess("masters", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- **Not company-scoped.** Either catalogue data (deliberately global) or scoped via a parent record — verify which before changing.
- Writes an audit row. Audit failures are swallowed and never block the operation.
- **POST** trims every text field and returns **409** when a row identical on
  every field already exists (product, category, specification, grade,
  material, additional spec, ends, size, length, dimensional standard,
  company). Not on product alone: rows of one product legitimately differ by
  size, ends or spec. MySQL's default collation makes the match
  case-insensitive and blind to trailing spaces, which is how duplicates such
  as "C.S. SEAMLESS PIPE " got in.

## Gotchas

- Confirm the company-scoping story before reusing this as a template.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../README.md)
