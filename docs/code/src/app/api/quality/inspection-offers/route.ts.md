# src/app/api/quality/inspection-offers/route.ts

> `/api/quality/inspection-offers` — GET, POST

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `inspectionOffer`.

- **GET** — Read
- **POST** — Create

## How it works

- Gated by `checkAccess("inspectionOffer", "read")`, `checkAccess("inspectionOffer", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- **GET `?view=list`** returns a summary shape: `items` collapses to ids — enough for the register's "N item(s)" count — and `createdBy` is dropped. The offers table never reads a line; heat numbers, colour codes and quantities live on the detail screen. Opt-in, so a caller that forgets the flag is merely slower, never silently handed less than it needs.
- Company-scoped with `companyFilter(companyId)`.
- Allocates a document number with `generateDocumentNumber()` (per company, per financial year).
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/document-numbering.ts`
- [Module overview](../README.md)
