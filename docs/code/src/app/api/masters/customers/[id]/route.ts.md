# src/app/api/masters/customers/[id]/route.ts

> `/api/masters/customers/[id]` — GET, PATCH, DELETE

See [../../README.md](../../README.md) for this module's shared behaviour, and
[the API pattern](../../../README.md) for the conventions every route follows.

## What it does

Operates on `customerMaster`, `customerTag`, `customerDispatchAddress`, `buyerMaster`, `vendorMaster`.

- **GET** — Read
- **PATCH** — Partial update / status change
- **DELETE** — Delete

## How it works

- Gated by `checkAccess("masters", "delete")`, `checkAccess("masters", "read")`, `checkAccess("masters", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Errors return `error.message`, so thrown text reaches the user's toast.
- The edit form sends `""` for unset optional fields. `gstType` is a nullable
  Prisma enum (`GSTType`), so PATCH maps `""` → `null` before the update (in
  both the customer update and the linked-vendor sync) — passing `""` through
  makes Prisma reject the whole save. Typical trigger: international customers,
  which have no GST type. Likewise `openingBalance: ""` maps to `0`, never
  `parseFloat("")` (NaN).

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../README.md)
