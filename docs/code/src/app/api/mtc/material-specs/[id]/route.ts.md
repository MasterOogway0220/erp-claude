# src/app/api/mtc/material-specs/[id]/route.ts

> `/api/mtc/material-specs/[id]` — GET, PATCH, DELETE

See [../../README.md](../../README.md) for this module's shared behaviour, and
[the API pattern](../../../README.md) for the conventions every route follows.

## What it does

Operates on `mTCMaterialSpec`.

- **GET** — Read
- **PATCH** — Partial update / status change
- **DELETE** — Delete

## How it works

- Gated by `checkAccess("mtc", "delete")`, `checkAccess("mtc", "read")`, `checkAccess("mtc", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Writes inside `$transaction`. Item updates follow the delete-and-recreate pattern, so **a field the caller omits is lost**.
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../README.md)
