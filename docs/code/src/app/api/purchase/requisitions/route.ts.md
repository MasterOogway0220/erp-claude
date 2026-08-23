# src/app/api/purchase/requisitions/route.ts

> `/api/purchase/requisitions` — GET, POST

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `purchaseRequisition`, `salesOrder`.

- **GET** — Read
- **POST** — Create

## How it works

- Gated by `checkAccess("purchaseRequisition", "read")`, `checkAccess("purchaseRequisition", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- **GET `?view=list`** returns a summary shape: `items` collapses to ids, enough for the purchase list table's "N item(s)" count. The PO and RFQ create screens copy PR lines into the document they are building, so they omit the flag and get every line field. Opt-in for that reason — narrowing by default would give those documents empty lines with nothing reporting an error.
- `suggestedVendor` selects `city` alongside `name`, for the same reason as the PO route: the register renders it and the select had omitted it.
- Company-scoped with `companyFilter(companyId)`.
- Allocates a document number with `generateDocumentNumber()` (per company, per financial year).
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/document-numbering.ts`
- [Module overview](../README.md)
