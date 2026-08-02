# src/app/api/po-acceptance/route.ts

> `/api/po-acceptance` — GET, POST

See [README.md](README.md) for this module's shared behaviour, and
[the API pattern](../README.md) for the conventions every route follows.

## What it does

Operates on `pOAcceptance`, `clientPurchaseOrder`, `auditLog`.

- **GET** — Read
- **POST** — Create

## How it works

- Gated by `checkAccess("poAcceptance", "read")`, `checkAccess("poAcceptance", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Allocates a document number with `generateDocumentNumber()` (per company, per financial year).

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/document-numbering.ts`
- [Module overview](README.md)
