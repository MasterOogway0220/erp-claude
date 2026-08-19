# src/app/api/quotations/[id]/revise/route.ts

> `/api/quotations/[id]/revise` — POST

See [../../README.md](../../README.md) for this module's shared behaviour, and
[the API pattern](../../../README.md) for the conventions every route follows.

## What it does

Operates on `quotation`.

- **POST** — Create

## How it works

- Gated by `checkAccess("quotation", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Writes inside `$transaction`. Item updates follow the delete-and-recreate pattern, so **a field the caller omits is lost**.
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Errors return `error.message`, so thrown text reaches the user's toast.
- The new revision's items are built by **listing every column explicitly**
  from the source item, not by spreading it. Any column added to
  `QuotationItem` has to be added to that list too, or the revision silently
  loses it — `isRegret` is in the list for exactly this reason.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../README.md)
