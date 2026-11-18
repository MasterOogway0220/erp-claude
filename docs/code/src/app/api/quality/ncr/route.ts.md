# src/app/api/quality/ncr/route.ts

> `/api/quality/ncr` — GET, POST

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `nCR`.

- **GET** — Read
- **POST** — Create

## How it works

- Gated by `checkAccess("ncr", "read")`, `checkAccess("ncr", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Allocates a document number with `generateDocumentNumber()` (per company, per financial year).
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/document-numbering.ts`
- [Module overview](../README.md)

## Change (2026-11-18, row cap)

The list GET takes `pageSize` (default and cap 500) via `takeFrom` in `src/lib/pagination.ts`, newest first. Callers that pass no pageSize get the newest 500 rows. There is no offset yet, so a screen that filters in the browser cannot reach rows past the newest 500; server-side paging is the upgrade when a table nears that size.
