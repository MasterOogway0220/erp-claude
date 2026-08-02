# src/app/api/reports/management-review/route.ts

> `/api/reports/management-review` — GET

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `invoice`, `salesOrder`, `quotation`, `purchaseOrder`, `salesOrderItem`, `inventoryStock`.

- **GET** — Read

## How it works

- Gated by `checkAuth()` — session required, no module check.
- Company-scoped with `companyFilter(companyId)`.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../README.md)
