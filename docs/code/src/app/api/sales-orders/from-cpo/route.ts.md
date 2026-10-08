# src/app/api/sales-orders/from-cpo/route.ts

> `/api/sales-orders/from-cpo` — POST

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `clientPurchaseOrder`, `salesOrder`.

- **POST** — Create

## How it works

- Gated by `checkAccess("salesOrder", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- **Not company-scoped.** Either catalogue data (deliberately global) or scoped via a parent record — verify which before changing.
- Allocates a document number with `generateDocumentNumber()` (per company, per financial year).
- Writes inside `$transaction`. Item updates follow the delete-and-recreate pattern, so **a field the caller omits is lost**.
- Writes an audit row. Audit failures are swallowed and never block the operation.

## What is carried across

Beyond the commercial fields (the unit, `uom`, among them), the sales order
inherits five things that used to be lost at this boundary:

- `poSlNo` / `poItemCode` per line — the client's own line number and item
  code, so Order Processing does not ask for them a second time.
- `customerPoDocument` — the signed client P.O. copy attached at registration.
  The column existed but nothing ever wrote it.
- `dispatchAddressId` and `deliverySchedule` — the ship-to site and the written
  delivery period.
- `itemDescription` per line (from 6 Oct 2026) — a non-standard line's own
  text; its product reads only "Non-Standard Item". Copied from
  `ClientPOItem.itemDescription`, so it is null for a client PO line without
  one, including every line a non-sandbox user saved before 8 Oct 2026,
  when their client PO screen did not write it yet.
- `quotationItemId` per line (from 6 Oct 2026) — the quoted line the client PO
  line came from. The order Review step compares each line with
  it, so the parts of a quoted line split on the client PO are summed against
  it instead of being paired with other lines by S.No. Every client PO line has
  one, so every order made here after this change is linked; other screens
  ignore it.

## Gotchas

- Confirm the company-scoping story before reusing this as a template.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/document-numbering.ts`
- [Module overview](../README.md)
