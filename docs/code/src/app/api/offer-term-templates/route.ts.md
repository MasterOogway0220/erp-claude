# src/app/api/offer-term-templates/route.ts

> `/api/offer-term-templates` — GET, POST, DELETE, PATCH

See [README.md](README.md) for this module's shared behaviour, and
[the API pattern](../README.md) for the conventions every route follows.

## What it does

Operates on `offerTermTemplate`.

- **GET** — Read
- **POST** — Create
- **DELETE** — Delete
- **PATCH** — Partial update / status change

## How it works

- Gated by `checkAccess("masters", "read")`, `checkAccess("masters", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](README.md)
