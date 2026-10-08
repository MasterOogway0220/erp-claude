# src/app/api/sales-orders/[id]/processing/route.ts

> `/api/sales-orders/[id]/processing` — GET, POST

See [../../README.md](../../README.md) for this module's shared behaviour, and
[the API pattern](../../../README.md) for the conventions every route follows.

## What it does

Operates on `salesOrder`, `salesOrderItem`, `orderProcessingItem`.

- **GET** — Read
- **POST** — Create

## How it works

- **GET** returns the order header with its context — `customerPoNo`, the
  reference `quotation` `{ id, quotationNo }` and the `clientPurchaseOrder`
  `{ id, cpoNo }` it came from (either may be null) — so the processing screen
  can say which order it is working on.
- **GET** returns each sales-order line with `poSlNo` / `poItemCode` — the
  client's own line number and item code, registered on the client PO and copied
  onto the SO. The form pre-fills from them; they used to be typed a second time
  here, and the two copies could silently disagree.
- **GET** returns each line's `itemDescription`: a non-standard line's own
  description, whose `product` reads only "Non-Standard Item".
- **POST** replies with the saved row in the GET's shape — `ndtTests` and
  `requiredLabTests` parsed to arrays — plus `appliedToCount`. The screen
  keeps the reply as the item's record. Until 6 Oct 2026 the reply carried
  the stored JSON text, the screen read that as no tests, and its next save
  wrote them as NULL.
- **POST** writes `labTestingBy` (`INHOUSE` / `TPI_AGENCY`: who carries out
  the lab testing, separate from `tpiType`, who inspects) and
  `labTestingAgencyId`, which is stored only with `TPI_AGENCY` so a line
  switched to in-house drops its agency.
- **POST** accepts `salesOrderItemIds` alongside `salesOrderItemId`: one save
  can write the same requirement set to several lines. On a 30-line order where
  every line shares an inspection regime, filling the form 30 times was the
  single biggest source of data-entry error in this step. The writes go through
  one `$transaction`, and one bad id fails the whole save rather than quietly
  writing the good lines.
- That transaction **must** use the callback form
  (`$transaction(async (tx) => ...)`), with upserts run one after another and a
  20 s timeout. The exported `prisma` is the sandbox router, which throws on
  the array form for every user; from the sandbox deploy (24 Sep 2026) to the
  fix (5 Oct 2026) every save here failed with "Failed to save processing
  data". `src/lib/sandbox/no-array-transactions.test.ts` now fails the build's
  tests if the array form comes back anywhere in `src/`.
- `vdiWitnessPercent` / `hydroWitnessPercent` go through `wholePercent`
  (`src/lib/quality/witness-percent.ts`): the columns are Int, and the live
  MySQL runs in non-strict mode, so 12.5 was silently stored as 12.
- The PO references are **not** copied to the other targets — they are that
  line's own client references. Everything else is, the lab-testing fields
  included.
- Gated by `checkAccess("salesOrder", "read")`, `checkAccess("salesOrder", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- **Not company-scoped.** Either catalogue data (deliberately global) or scoped via a parent record — verify which before changing.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Confirm the company-scoping story before reusing this as a template.
- A failed POST returns `{ error: "Failed to save processing data", detail }`
  with the Prisma message in `detail`; `ProcessStep.tsx` shows `detail` first.
- The live MySQL does not reject over-long text; it truncates. `otherLabTests`
  and `additionalSpec` are `TEXT` from migration
  `20261005091000_processing_text_columns`; the other free-text fields stay
  VARCHAR(191) and the form caps them with `maxLength`.

## Related

- `src/components/order-wizard/ProcessStep.tsx` — the only caller.
- `src/lib/business-logic/technical-requirements.ts` — supplies the array
  parser this route reads `ndtTests` / `requiredLabTests` with.
- Migration `20261006110000_processing_testing_and_line_descriptions` —
  `labTestingBy`, `labTestingAgencyId`, `SalesOrderItem.itemDescription`.
- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../README.md)
