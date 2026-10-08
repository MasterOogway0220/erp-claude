# src/app/api/quotations/past-prices/route.ts

> `/api/quotations/past-prices` — GET

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `customerMaster`, `quotation`.

- **GET** — Read

## How it works

- Gated by `checkAccess("quotation", "read")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Excludes soft-deleted quotations, so a deleted draft's prices are not offered as history.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../README.md)
