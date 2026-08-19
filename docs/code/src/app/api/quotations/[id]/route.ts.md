# src/app/api/quotations/[id]/route.ts

> `/api/quotations/[id]` — GET, PATCH, DELETE, PUT

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `quotation`, `customerContact`, `buyerMaster`.

- **GET** — Read
- **PATCH** — Partial update / status change
- **DELETE** — Delete
- **PUT** — Replace

## How it works

- Gated by `checkAccess("quotation", "approve")`, `checkAccess("quotation", "delete")`, `checkAccess("quotation", "read")`, `checkAccess("quotation", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Writes inside `$transaction`. Item updates follow the delete-and-recreate pattern, so **a field the caller omits is lost** — which is why the edit pages spread the raw loaded row back into their payload, and why the header fields below are guarded.
- Status changes validated against a transition map; invalid moves are refused.
- Writes an audit row. Audit failures are swallowed and never block the operation.

### PUT guards against silent data loss

Each of these exists because an ordinary edit destroyed data at least once:

- **Currency** resolves through `resolveUpdateCurrency(currency, existing.currency)` —
  a blank/missing payload currency keeps the stored value instead of the old
  `currency || "INR"`, which repriced EXPORT quotation NPS/26/15214 from USD
  to INR (amount-in-words included) with nothing logged.
- **`quotationType`** is persisted when sent. It used to be dropped, so a
  DOMESTIC↔EXPORT switch kept its currency side-effect while the header kept
  the old market type.
- **`paymentTermsId` / `deliveryTermsId` / `deliveryPeriod`** are written only
  when the key is present in the body. Neither edit form carries them, and the
  old unconditional `x || null` wiped values that revisions had copied
  forward. Explicit `null` still clears.
- **`dealOwnerId`** goes through `dealOwnerPatch` (absent = leave alone,
  null/"" = unassign); **`preparedById` is write-once** — editing is not
  authoring.
- The **item audit diff** tracks `slNo, product, material, dimStandard,
  sizeLabel, length, ends, uom, quantity, unitRate, isRegret, amount`, and the
  `existing` select fetches exactly those fields — a diffed field missing from
  the select reads as `undefined` and logs a phantom change. `length/ends/uom`
  were added after a client reported lengths "disappearing" and the audit log
  could not prove or disprove it.

### The price gate

Two places call `unpricedItemsError` (`src/lib/quotations/pricing.ts`):

- **PATCH**, when the status moves to `PENDING_APPROVAL` or `APPROVED` — this
  is the real gate, and it reads the *stored* items, so its `select` must
  include `isRegret` as well as `unitRate` or every regretted line reads as
  unpriced and approval becomes impossible.
- **PUT**, when the quotation is already past `DRAFT` — an edit must not strip
  the prices off a document that has been approved or sent.

A line satisfies the gate by carrying a rate (**`0` counts**; a deliberately
free line is a real price) or by being marked `isRegret`. Only `NULL`, negative
and unparseable rates fail. The PUT write path applies the same `parseRate`
normalisation as POST — blank becomes `NULL`, a regretted line is forced to
`NULL` rate and `0` amount.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../README.md)
