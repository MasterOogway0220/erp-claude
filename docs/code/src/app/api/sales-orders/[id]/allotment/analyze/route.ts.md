# src/app/api/sales-orders/[id]/allotment/analyze/route.ts

> `/api/sales-orders/[id]/allotment/analyze` — GET

See [../../../README.md](../../../README.md) for this module's shared behaviour, and
[the API pattern](../../../../README.md) for the conventions every route follows.

## What it does

Operates on `salesOrder`, `inventoryStock`.

- **GET** — Read

## How it works

- Gated by `checkAccess("salesOrder", "read")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../../README.md)
