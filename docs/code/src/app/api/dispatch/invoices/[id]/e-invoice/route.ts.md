# src/app/api/dispatch/invoices/[id]/e-invoice/route.ts

> `/api/dispatch/invoices/[id]/e-invoice` — GET

See [../../../README.md](../../../README.md) for this module's shared behaviour, and
[the API pattern](../../../../README.md) for the conventions every route follows.

## What it does

No direct Prisma access — delegates or computes.

- **GET** — Read

## How it works

- Gated by `checkAccess("invoice", "read")`. **Authentication only** — role enforcement is disabled app-wide.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../../README.md)
