# src/app/api/sales-orders/route.ts

> `/api/sales-orders` — GET, POST

See [README.md](README.md) for this module's shared behaviour, and
[the API pattern](../README.md) for the conventions every route follows.

## What it does

Operates on `salesOrder`, `customerMaster`, `invoice`.

- **GET** — Read
- **POST** — Create

## How it works

- Gated by `checkAccess("salesOrder", "read")`, `checkAccess("salesOrder", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Allocates a document number with `generateDocumentNumber()` (per company, per financial year).
- Writes inside `$transaction`. Item updates follow the delete-and-recreate pattern, so **a field the caller omits is lost**.
- Writes an audit row. Audit failures are swallowed and never block the operation.
- **POST** stores each line's `uom` (its unit: `Nos` for pieces, `Mtr` for
  metres of pipe) and `itemDescription` (a non-standard line's own text; its
  product reads only "Non-Standard Item") when the caller sends them. The
  Create Order screen does (sandbox from 6 Oct 2026, everyone from 8 Oct
  2026). A caller that does not stores null in both.
- **POST** also stores `quotationItemId` per line when sent: the quoted line
  a line was taken from (the Create Order screen sends it for lines
  filled from a quotation). The order Review step compares each line with it.
  Null for lines added by hand and on orders made before 8 Oct 2026 by
  non-sandbox users.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/document-numbering.ts`
- [Module overview](README.md)
