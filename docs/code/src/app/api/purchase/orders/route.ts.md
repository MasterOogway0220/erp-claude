# src/app/api/purchase/orders/route.ts

> `/api/purchase/orders` — GET, POST

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `purchaseOrder`, `vendorMaster`, `purchaseRequisition`.

- **GET** — Read
- **POST** — Create

## How it works

- Gated by `checkAccess("purchaseOrder", "read")`, `checkAccess("purchaseOrder", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- **GET `?view=list`** returns a summary shape: the PO header plus the already-narrow vendor / sales-order / requisition references, but **no `items`**. Every screen reading the list is a picker or a table, and the ones that go on to copy PO lines into a GRN or an MTC certificate re-fetch the PO by id first. The flag is opt-in — a caller that omits it gets the full shape and is merely slower, whereas defaulting to narrow would silently hand a caller empty lines.
- `vendor` selects `city` alongside `name`. The purchase register renders a city under the vendor name; the select had omitted the column, so that line had been rendering blank on every row.
- Company-scoped with `companyFilter(companyId)`.
- Allocates a document number with `generateDocumentNumber()` (per company, per financial year).
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/document-numbering.ts`
- [Module overview](../README.md)
