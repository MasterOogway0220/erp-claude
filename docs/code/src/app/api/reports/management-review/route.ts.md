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
- Quotation counts exclude soft-deleted quotations.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Sandbox preview (temporary, from 5 Oct 2026)

`route.ts` is currently a gate: the sandbox login gets `route.sandbox.ts`
— the behaviour this doc describes — and every other user gets
`route.legacy`, the version from before the 03/10/26 meeting fixes. See
`src/lib/sandbox/preview.ts.md`. Going live: replace this file with the
`.sandbox` copy and delete both copies; then delete this section.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../README.md)
