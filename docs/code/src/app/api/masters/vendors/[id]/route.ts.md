# src/app/api/masters/vendors/[id]/route.ts

> `/api/masters/vendors/[id]` — GET, PATCH, DELETE

See [../../README.md](../../README.md) for this module's shared behaviour, and
[the API pattern](../../../README.md) for the conventions every route follows.

## What it does

Operates on `vendorMaster`.

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
  Prisma enum (`GSTType`), so PATCH maps `""` → `null` before the update —
  passing `""` through makes Prisma reject the whole save.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../README.md)
