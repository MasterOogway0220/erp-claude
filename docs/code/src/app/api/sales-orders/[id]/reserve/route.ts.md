# src/app/api/sales-orders/[id]/reserve/route.ts

> `/api/sales-orders/[id]/reserve` — POST, GET, DELETE

See [../../README.md](../../README.md) for this module's shared behaviour, and
[the API pattern](../../../README.md) for the conventions every route follows.

## What it does

Operates on `salesOrder`, `salesOrderItem`, `inventoryStock`.

- **POST** — Create
- **GET** — Read
- **DELETE** — Delete

## How it works

- Gated by `checkAccess("salesOrder", "read")`, `checkAccess("salesOrder", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Writes inside `$transaction`. Item updates follow the delete-and-recreate pattern, so **a field the caller omits is lost**.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Error responses distinguish two kinds of failure. The route throws plain
  `new Error("...")` for business-rule refusals (e.g. not enough stock); those
  are detected with `error.constructor === Error` and returned as **400** with
  their message. Anything else, including Prisma errors (which are `Error`
  subclasses), returns a generic **500** (`"Failed to create reservation"` /
  `"Failed to release reservation"`) with details only in the server log. It
  used to send any `error.message` as a 400, which leaked database internals
  and mislabelled server faults as user errors.
- A new user-facing refusal must be thrown as a plain `Error`, not a subclass,
  or it will show as the generic 500.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../README.md)
