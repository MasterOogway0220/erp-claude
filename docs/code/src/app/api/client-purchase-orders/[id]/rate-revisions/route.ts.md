# src/app/api/client-purchase-orders/[id]/rate-revisions/route.ts

> `/api/client-purchase-orders/[id]/rate-revisions` — GET

See [../../README.md](../../README.md) for this module's shared behaviour, and
[the API pattern](../../../README.md) for the conventions every route follows.

## What it does

Operates on `rateRevision`.

- **GET** — Read

## How it works

- Gated by `checkAccess("clientPO", "read")`. **Authentication only** — role enforcement is disabled app-wide.
- **Company-scoped through the parent record.** A rate revision has no
  `companyId`; the query reaches it through
  `clientPOItem.clientPurchaseOrder: companyFilter(companyId)`. Before this,
  any logged-in user could read another company's negotiated rate changes by
  id. An id from another company now returns an **empty list** (200), not a
  404. The optional `?itemId=` filter narrows within that scope.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Errors return a generic `"Failed to fetch rate revisions"` (500); details go to the server log.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../README.md)
