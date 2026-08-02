# src/app/api/masters/customers/[id]/dispatch-addresses/[addressId]/route.ts

> `/api/masters/customers/[id]/dispatch-addresses/[addressId]` — PATCH, DELETE

See [../../../../README.md](../../../../README.md) for this module's shared behaviour, and
[the API pattern](../../../../../README.md) for the conventions every route follows.

## What it does

Operates on `customerDispatchAddress`, `salesOrder`, `dispatchNote`, `invoice`.

- **PATCH** — Partial update / status change
- **DELETE** — Delete

## How it works

- Gated by `checkAccess("masters", "delete")`, `checkAccess("masters", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- **Not company-scoped.** Either catalogue data (deliberately global) or scoped via a parent record — verify which before changing.
- Writes inside `$transaction`. Item updates follow the delete-and-recreate pattern, so **a field the caller omits is lost**.
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Confirm the company-scoping story before reusing this as a template.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../../../README.md)
