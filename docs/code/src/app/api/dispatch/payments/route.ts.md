# src/app/api/dispatch/payments/route.ts

> `/api/dispatch/payments` — GET, POST

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `paymentReceipt`, `invoice`.

- **GET** — Read. `?search=` matches the receipt number. `?view=list` returns
  the summary shape: the customer collapsed to `{ id, name }` instead of the
  whole customer record. The invoice is always narrowed.
- **POST** — Record a payment receipt against one invoice and move the
  invoice to `PARTIALLY_PAID` or `PAID`. **201** with the receipt.
  - **404** if the invoice is not in the caller's company.
  - **400** `"Customer does not match the invoice"` if `customerId` differs
    from the invoice's customer.
  - **409** `"This payment was just recorded"` if a receipt with the same
    amount and reference was saved on this invoice in the last 60 seconds.
  - **409** `"Reference … is already on receipt …"` if `referenceNo` is already
    used on any receipt in the company.
  - **400** `"Amount exceeds the outstanding balance of …"` if amount + TDS is
    more than the invoice total minus everything already received (+0.01).
  - **500** `"Failed to create payment receipt"` on anything else.

## How it works

- Gated by `checkAccess("payment", "read")`, `checkAccess("payment", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- POST, in order:
  1. Loads the invoice **within the caller's company** (it used to be
     `findUnique` by id alone, so a receipt could be recorded against another
     company's invoice).
  2. Requires the body's `customerId` to equal the invoice's, and stores the
     **invoice's** customer on the receipt, never the body's. Before, a wrong
     customer id put the money on the wrong customer's ledger.
  3. Opens a `$transaction` and locks the invoice row with
     `SELECT id FROM Invoice WHERE id = … FOR UPDATE`. Two receipts for the same
     invoice now run one after the other, so both cannot read the same
     "already paid" total and together overpay it.
  4. Duplicate checks (both 409): same amount + same reference on this invoice
     within 60 seconds (a double-click or network retry), and the bank
     reference (UTR/cheque number) already used on another receipt in the
     company. There is no idempotency key; these checks stand in for one.
  5. Overpayment check: `amount + TDS` may not exceed
     `totalAmount − Σ(previous amountReceived + tdsAmount)`, with 0.01 of
     slack for paisa rounding.
  6. Allocates the receipt number with
     `generateDocumentNumber("RECEIPT", companyId, tx)` inside the same
     transaction, so a refused or failed save does not burn a number.
  7. Creates the receipt and sets the invoice status from the new total paid.
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Gotchas

- Unexpected errors return a generic 500 message; details go to the server log.
- The refusals in steps 4 and 5 are returned *from* the transaction callback
  as `{ error, status }`, not thrown, so the transaction commits having
  written nothing. Do not add writes before those checks.
- The row lock uses raw SQL against the `Invoice` table name. The sandbox
  adapter rewrites raw SQL to the `sbx_` tables, so it works there too; if the
  model is ever `@@map`ped to another table name, this query must change.
- The 60-second duplicate window will also refuse a genuine second payment of
  the same amount with the same (or no) reference inside a minute. The user
  can wait or add a reference.
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

## Domain notes

- **TDS** (Tax Deducted at Source): Indian customers withhold a percentage of
  the payment and pay it to the tax department on the supplier's behalf. The
  supplier receives less cash but the invoice is still settled by cash + TDS,
  which is why both count towards the outstanding balance.
- **Reference number** is the bank's transaction reference (NEFT/RTGS UTR or
  cheque number). It is unique per real-world payment, which is what makes it
  a usable duplicate check.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/document-numbering.ts`
- [Module overview](../README.md)

## Change (2026-11-18, row cap)

The list GET takes `pageSize` (default and cap 500) via `takeFrom` in `src/lib/pagination.ts`, newest first. Callers that pass no pageSize get the newest 500 rows. There is no offset yet, so a screen that filters in the browser cannot reach rows past the newest 500; server-side paging is the upgrade when a table nears that size.
