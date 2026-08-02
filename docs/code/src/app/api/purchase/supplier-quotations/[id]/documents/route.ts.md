# src/app/api/purchase/supplier-quotations/[id]/documents/route.ts

> `/api/purchase/supplier-quotations/[id]/documents` — GET, POST

See [../../../README.md](../../../README.md) for this module's shared behaviour, and
[the API pattern](../../../../README.md) for the conventions every route follows.

## What it does

Operates on `supplierQuotationDocument`, `supplierQuotation`.

- **GET** — Read
- **POST** — Create

## How it works

- Gated by `checkAccess("supplierQuotation", "read")`, `checkAccess("supplierQuotation", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- **Not company-scoped.** Either catalogue data (deliberately global) or scoped via a parent record — verify which before changing.
- Stores uploads with `storeFile()` — into the database, not the filesystem.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Confirm the company-scoping story before reusing this as a template.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/storage/files.ts`
- [Module overview](../../../README.md)
