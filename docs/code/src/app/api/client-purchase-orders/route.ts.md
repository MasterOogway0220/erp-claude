# src/app/api/client-purchase-orders/route.ts

> `/api/client-purchase-orders` — GET, POST

See [README.md](README.md) for this module's shared behaviour, and
[the API pattern](../README.md) for the conventions every route follows.

## What it does

Operates on `clientPurchaseOrder`, `quotation`, `quotationItem`, `customerMaster`, `rateRevision`.

- **GET** — Read
- **POST** — Create

## How it works

- Gated by `checkAccess("clientPO", "read")`, `checkAccess("clientPO", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Allocates a document number with `generateDocumentNumber()` (per company, per financial year).
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Fields worth knowing about

The POST body carries, besides the commercial fields:
`deliverySchedule` (free text — the written delivery period),
`contactEmail` / `contactPhone` (the contact for this order, as opposed to the
customer master default), `billingAddressId` (bill-to party, separate from
`dispatchAddressId`; null = the customer master address),
`clientPoDocumentPath` / `clientPoDocumentName` (the client's signed P.O. copy),
and per item `qtyRemark` (why the ordered qty differs from the quoted balance).

Quantity and rate are still validated against the quotation balance here — the
screen's checks are convenience, this is the boundary.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.
- `?view=list` on the GET returns a summary shape: the line items come back as
  bare ids instead of whole rows. Both current callers (the CPO register table
  and the P.O. acceptance picker) only need `items.length`, and both send it.
  It is opt-in on purpose — a caller that forgets it gets the full rows and is
  merely slow, whereas one silently handed less than it needs would build a
  document with empty lines. Those two callers also share one React Query key,
  so if you change one of them you must change the other, or whichever fetch
  lands first will fill the cache with the shape the other cannot read.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/document-numbering.ts`
- [Module overview](README.md)
