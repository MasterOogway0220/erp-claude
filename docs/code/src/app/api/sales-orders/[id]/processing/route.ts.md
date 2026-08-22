# src/app/api/sales-orders/[id]/processing/route.ts

> `/api/sales-orders/[id]/processing` — GET, POST

See [../../README.md](../../README.md) for this module's shared behaviour, and
[the API pattern](../../../README.md) for the conventions every route follows.

## What it does

Operates on `salesOrder`, `salesOrderItem`, `orderProcessingItem`.

- **GET** — Read
- **POST** — Create

## How it works

- **GET** returns each sales-order line with `poSlNo` / `poItemCode` — the
  client's own line number and item code, registered on the client PO and copied
  onto the SO. The form pre-fills from them; they used to be typed a second time
  here, and the two copies could silently disagree.
- **POST** accepts `salesOrderItemIds` alongside `salesOrderItemId`: one save
  can write the same requirement set to several lines. On a 30-line order where
  every line shares an inspection regime, filling the form 30 times was the
  single biggest source of data-entry error in this step. The writes go through
  one `$transaction`, and one bad id fails the whole save rather than quietly
  writing the good lines.
- The PO references are **not** copied to the other targets — they are that
  line's own client references. Everything else is.
- Gated by `checkAccess("salesOrder", "read")`, `checkAccess("salesOrder", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- **Not company-scoped.** Either catalogue data (deliberately global) or scoped via a parent record — verify which before changing.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Confirm the company-scoping story before reusing this as a template.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/components/order-wizard/ProcessStep.tsx` — the only caller.
- `src/lib/business-logic/technical-requirements.ts` — supplies the array
  parser this route reads `ndtTests` / `requiredLabTests` with.
- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../README.md)
