# src/app/api/tenders/[id]/order-quotation/route.ts

> `/api/tenders/[id]/order-quotation` — POST `{ customerId, items? }` → `{ quotationId, created }`

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

This route returns the quotation that a client PO on this tender is
registered against. The client PO screen calls it when a tender is picked,
then continues exactly as if that quotation had been picked. Why a tender PO
goes through a quotation at all is explained in
[`order-quotation.ts`](../../../../../lib/tenders/order-quotation.ts.md).

1. It checks that the tender exists, is in the caller's company and is for
   this client (client field, or a matching organisation name). It refuses
   `NO_BID` / `LOST` tenders.
2. If a quotation raised from the tender was already given to the client, it
   reuses the newest one (`created: false`). If that quotation belongs to a
   different same-name client row, it returns 409.
3. If only a draft or a pending quotation exists, it returns 409 asking for
   it to be approved. It does not build a second quotation.
4. Otherwise it creates one from the tender:
   - The tender's number, version 0, status `APPROVED`, category `STANDARD`.
   - EXPORT if the client is international, DOMESTIC otherwise.
   - The tender's currency, date, reference (as inquiry no.), project (as
     kind attention) and terms.
   - One line per BOQ line at the tender's estimated rate.
   - Subtotal = grand total = the sum of line amounts. No tax is applied,
     because the tender holds no tax rate.

   The creation is audit-logged.
5. **A tender with no lines.** Its lines come from `items`, which are the
   lines typed on the PO screen in the standard quotation item editor.
   - Each line is validated with `normalizeItemPricing`. If none are sent,
     the route returns 400.
   - The lines are mapped with
     [`quotationItemRows`](../../../../../lib/quotations/item-rows.ts.md),
     the same mapping quotation create uses, so every field the editor has
     is kept.
   - The same lines are written to the tender as `TenderItem` rows, so the
     tender shows what was quoted. Those rows keep product, material, spec,
     size, qty, unit, rate and remarks; `TenderItem` has no other columns.
   - Both writes happen in one interactive transaction.

   `items` is ignored when the tender already has lines.

## Failure modes

- Two users at once: the second create hits the `(quotationNo, version)`
  unique key (P2002) and returns the first one's id.
- A deactivated client or a tender with no lines gets a 400 with a
  readable message. The screen shows `error` in a toast.

## How it works

- Gated by `checkAccess("clientPO", "write")`. It writes a quotation because
  it is part of registering a PO.

## Related

- [`/api/tenders/for-client`](../../for-client/route.ts.md)
- [Client PO create page](../../../../(dashboard)/client-purchase-orders/create/page.tsx.md)
