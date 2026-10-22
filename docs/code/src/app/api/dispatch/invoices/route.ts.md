# src/app/api/dispatch/invoices/route.ts

> `/api/dispatch/invoices` — GET, POST

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `invoice`, `customerMaster`.

- **GET** — Read
- **POST** — Create

## How it works

- Gated by `checkAccess("invoice", "read")`, `checkAccess("invoice", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Allocates a document number with `generateDocumentNumber()` (per company, per financial year).
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/document-numbering.ts`
- [Module overview](../README.md)

## Change (2026-10-22, frontend and API follow-up)

The list GET takes `pageSize` (default and cap 500) via `takeFrom`. Callers that pass no pageSize get the first 500 rows.
