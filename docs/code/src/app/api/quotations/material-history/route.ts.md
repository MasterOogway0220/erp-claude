# src/app/api/quotations/material-history/route.ts

> `/api/quotations/material-history` — GET

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `customerMaster`, `quotationItem`, `clientPOItem`.

- **GET** — Read

`?customerId=&materialCodeId=` returns the latest priced quotation line and
latest Client PO line for that customer (and same-named customers in the
company) carrying that material-code master row. `?customerId=&label=` does
the same by the identifier **text** (`materialCodeLabel`) — a non-standard
quotation's customer item ID is stored as text with no master FK, and this is
how its history is found even when the ID was typed rather than picked.

`?customerId=&product=&material=&additionalSpec=&size=[&excludeQuotationId=]`
is the mode the **standard** quotation form uses. A past quote counts only
if (1) it is a standard quotation that was given to this client, so not
`DRAFT`, `PENDING_APPROVAL`, `REJECTED` or `CANCELLED`, and (2) its line has
the same product, material, additional spec and size. The match relies on
MariaDB's case-insensitive collation. A blank or omitted `additionalSpec`
matches only lines with a null or empty spec. Product, material and size are
required (400 otherwise). The same gates apply to the past Client PO lookup.
`excludeQuotationId` keeps a quotation being edited from matching itself.
The rule is shared with the form via `src/lib/quotations/past-quote-match.ts`.

## How it works

- Gated by `checkAccess("quotation", "read")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- The "last quoted" lookup skips soft-deleted quotations (`deletedAt: null`,
  added 6 Oct 2026). Otherwise a deleted draft's rate would still show as the
  last price. Quotation deletes are soft deletes for every user from 8 Oct
  2026.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`, `src/lib/quotations/past-quote-match.ts`
- [Module overview](../README.md)
