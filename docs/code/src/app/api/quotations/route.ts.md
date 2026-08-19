# src/app/api/quotations/route.ts

> `/api/quotations` — GET, POST

See [README.md](README.md) for this module's shared behaviour, and
[the API pattern](../README.md) for the conventions every route follows.

## What it does

Operates on `quotation`, `tender`, `customerMaster`, `customerContact`, `buyerMaster`, `user`.

- **GET** — Read
- **POST** — Create

## How it works

- Gated by `checkAccess("quotation", "read")`, `checkAccess("quotation", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Allocates a document number with `generateDocumentNumber()` (per company, per financial year).
- Writes an audit row. Audit failures are swallowed and never block the operation.

### Item rates on create

Quantity is required and must be positive. The unit rate is not: a draft can be
saved with lines still to be priced, and the gate that insists on prices lives
on the status change to `PENDING_APPROVAL`, not here.

What the route does enforce is the *shape* of a rate. Each item goes through
`normalizeItemPricing` from `src/lib/quotations/pricing.ts` — shared with the
PUT route and tested there, rather than duplicated in both handlers:

- blank / absent → stored as `NULL`, meaning "not priced yet" — **not** `0`
- `0` → stored as `0`, a real quoted price (free, or included in another line)
- negative or unparseable → rejected with the offending item number
- `isRegret` set → rate forced to `NULL` and amount to `0`, whatever the client
  sent, because a line we decline to quote has no price by definition

Amounts are recomputed as qty × rate when the client's `amount` is missing or
invalid, so a priced line cannot slip through totalling zero. The quotation
subtotal is summed from the normalised amounts *after* this loop runs, which is
what keeps regretted lines out of the total.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.
- Sending `unitRate: 0` and omitting `unitRate` are different requests now.
  Anything that rebuilds an item payload must preserve the distinction.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/document-numbering.ts`
- [Module overview](README.md)
