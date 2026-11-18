# src/app/api/masters/material-codes/[id]/customer-history/route.ts

> `/api/masters/material-codes/[id]/customer-history` — GET

See [../../../README.md](../../../README.md) for this module's shared behaviour, and
[the API pattern](../../../../README.md) for the conventions every route follows.

## What it does

Operates on `quotationItem`, `clientPOItem`.

- **GET** — Read

## How it works

- Gated by `checkAccess("masters", "read")` (authentication + company
  resolution; role enforcement is disabled app-wide). It used to call
  `getServerSession` directly, which skipped the company resolution and the
  sandbox backstop in `rbac.ts`.
- **Company-scoped**, on both lookups: the last quoted price
  (`quotation: { ...companyFilter }`) and the last client-PO price
  (`clientPurchaseOrder: { ...companyFilter }`). The material code itself is
  shared catalogue data, but the prices are commercial data: before this any
  session could read the rates another company quoted and won with a customer.
  A customer that only traded with another company now shows no history.
- `?customerId=` is required.
- The last-quote lookup skips soft-deleted quotations (`deletedAt: null`,
  added 6 Oct 2026), so a deleted draft's rate is not shown as the last price.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Errors return a generic `"Failed to fetch history"` (500); details go to the server log.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../../README.md)
