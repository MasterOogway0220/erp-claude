# src/app/api/quality/lab-letters/route.ts

> `/api/quality/lab-letters` — GET, POST

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `labLetter`, `testingMaster`, `inspectionAgencyMaster`.

- **GET** — Read
- **POST** — Create

## How it works

- Gated by `checkAccess("labLetter", "read")`, `checkAccess("labLetter", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Allocates a document number with `generateDocumentNumber()` (per company, per financial year).
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/document-numbering.ts`
- [Module overview](../README.md)
