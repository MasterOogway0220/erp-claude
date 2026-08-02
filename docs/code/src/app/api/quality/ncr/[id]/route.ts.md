# src/app/api/quality/ncr/[id]/route.ts

> `/api/quality/ncr/[id]` — GET, PATCH

See [../../README.md](../../README.md) for this module's shared behaviour, and
[the API pattern](../../../README.md) for the conventions every route follows.

## What it does

Operates on `nCR`.

- **GET** — Read
- **PATCH** — Partial update / status change

## How it works

- Gated by `checkAccess("ncr", "read")`, `checkAccess("ncr", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../README.md)
