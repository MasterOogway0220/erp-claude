# src/app/api/inventory/stock/[id]/pipe-details/route.ts

> `/api/inventory/stock/[id]/pipe-details` — GET, POST, PUT, DELETE

See [../../../README.md](../../../README.md) for this module's shared behaviour, and
[the API pattern](../../../../README.md) for the conventions every route follows.

## What it does

Operates on `inventoryStock`, `pipeMaterialDetail`.

- **GET** — Read
- **POST** — Create
- **PUT** — Replace
- **DELETE** — Delete

## How it works

- Gated by `checkAccess("inventory", "read")`, `checkAccess("inventory", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Writes inside `$transaction`. Item updates follow the delete-and-recreate pattern, so **a field the caller omits is lost**.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../../README.md)
