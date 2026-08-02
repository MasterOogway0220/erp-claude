# src/app/api/alerts/route.ts

> `/api/alerts` — GET, POST

See [README.md](README.md) for this module's shared behaviour, and
[the API pattern](../README.md) for the conventions every route follows.

## What it does

Operates on `warehouseIntimation`, `inventoryStock`, `labLetter`, `salesOrderItem`, `alert`.

- **GET** — Read
- **POST** — Create

## How it works

- Gated by `checkAccess("alerts", "read")`, `checkAccess("alerts", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](README.md)
