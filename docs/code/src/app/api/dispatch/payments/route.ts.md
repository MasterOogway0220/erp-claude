# src/app/api/dispatch/payments/route.ts

> `/api/dispatch/payments` — GET, POST

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `paymentReceipt`, `invoice`.

- **GET** — Read. `?search=` matches the receipt number. `?view=list` returns
  the summary shape: the customer collapsed to `{ id, name }` instead of the
  whole customer record. The invoice is always narrowed.
- **POST** — Create

## How it works

- Gated by `checkAccess("payment", "read")`, `checkAccess("payment", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Allocates a document number with `generateDocumentNumber()` (per company, per financial year).
- Writes inside `$transaction`. Item updates follow the delete-and-recreate pattern, so **a field the caller omits is lost**.
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.
- `view=list` is **opt-in**. The database is shared hosting with a hard
  connection cap, so the list screens ask for less; a caller that forgets the
  flag gets the full customer record and is merely slow, never short of data.
  Never invert it — a caller silently handed less than it needs breaks with no
  error, just a blank cell.
- Both readers of this list (`/dispatch` payments tab, `/dispatch/bank-reconciliation`)
  send `view=list` and share the React Query key `["payment-receipts", "list"]`.
  They must stay in agreement: two screens on one key requesting different
  shapes means whichever loads first fills the cache and the other reads the
  wrong shape. A future screen needing the full customer must use its own key.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/document-numbering.ts`
- [Module overview](../README.md)
