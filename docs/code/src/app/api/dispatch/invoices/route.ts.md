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
- Allocates the invoice number with `generateDocumentNumber(docType, companyId, tx)`
  **inside the same `prisma.$transaction` as `invoice.create`**. The series is
  `INVOICE_DOMESTIC` or `INVOICE_EXPORT` by `invoiceType`. A GST tax invoice
  series must have no gaps in a financial year; previously the number was
  taken before the create, so any failed create (validation, a bad foreign
  key) burnt a number and left a hole an auditor would ask about. Now a failed
  create rolls the counter back too. See
  [document-numbering](../../../../lib/document-numbering.ts.md).
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/document-numbering.ts`
- [Module overview](../README.md)

## Change (2026-10-22, frontend and API follow-up)

The list GET takes `pageSize` (default and cap 500) via `takeFrom`. Callers that pass no pageSize get the first 500 rows.
