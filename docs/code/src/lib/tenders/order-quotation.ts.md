# src/lib/tenders/order-quotation.ts

> The rules for registering a client PO against a tender quotation.

## Why this exists

The business sends three kinds of quotation: **standard**, **non-standard**
and **tender**. A tender is an offer made in reply to a client's formal tender
(a public or private bid invitation). It is stored as its own `Tender` record
with its own BOQ lines (`TenderItem`). BOQ is the bill of quantities: the item
lines and quantities the client asked us to bid on. Tenders share the
quotation number series.

The client PO module only knew about `Quotation`. A PO line points at a
`QuotationItem`, and the **balance** still open on a quotation (quoted qty
minus what earlier POs already ordered) is worked out from quotation lines.
The PO-acceptance, sales-order, dispatch and invoice paths all build on that.
So when a client sent a PO against a tender, the tender never appeared in the
PO screen's quotation list and the PO could not be registered.

Teaching every one of those paths a second source would have meant a schema
change: `ClientPurchaseOrder.quotationId` and `ClientPOItem.quotationItemId`
are required. Instead, a PO on a tender goes through an **order quotation**.
That is an ordinary `Quotation` built once from the tender:

- It carries the tender's own number. The number series is shared, so the
  number is free, and it is what the client calls the offer.
- `sourceTenderId` links it back to the tender.
- Every later PO on the tender reuses it, so part-orders draw down one
  balance.

## What it does

- `NOT_ORDERABLE_TENDER_STATUSES` / `isOrderableTender`: `NO_BID` and `LOST`
  tenders can never get a PO. Every other status is allowed, because in
  practice the status is rarely moved along (Nov 2026: 27 of 31 tenders still
  `IDENTIFIED`).
- `organisationKey` / `tenderMatchesCustomer`: is the tender for this client?
  The tender's client field decides when it is set. Most tenders (28 of 31)
  have only the organisation typed in, so otherwise the organisation must name
  the client. The comparison ignores case, punctuation and spacing, a leading
  "M/s.", and Ltd/Pvt/Co/Corp/& abbreviations. The live data really does hold
  "HPCL-Mittal Energy Limited", "HPCL - Mittal Energy Limited" and "HPCL Mittal
  Energy Limited" for one client.
- `organisationSearchWord` gives the first real word of the client name. The
  route uses it to narrow the SQL before the exact rule runs.
- `pickOrderQuotation` chooses among quotations already raised from the
  tender:
  - It uses the newest one the client was actually given (see
    [`past-quote-match.ts`](../quotations/past-quote-match.ts.md)).
  - If only a draft or a pending one exists, it returns that as `blockedBy`.
    The caller then asks for approval rather than building a second
    quotation beside it.
- `quotationItemsFromTender` turns BOQ lines into `QuotationItem` rows in
  `sNo` order. An unrated line stays **unpriced** (`unitRate` NULL, amount 0),
  not a quoted zero. The PO screen's negotiated rate is where its price goes.

## Gotchas

- The order quotation is a real `Quotation` row (status `APPROVED`, category
  `STANDARD`). It shows in the quotations list next to its tender, with the
  same number.
- One client can have several `CustomerMaster` rows with the same name. The
  order quotation belongs to whichever row first registered a PO on the
  tender. The route refuses a PO on that tender under another row instead of
  letting the PO save fail on the customer check.

## Related

- [`/api/tenders/for-client`](../../app/api/tenders/for-client/route.ts.md)
- [`/api/tenders/[id]/order-quotation`](../../app/api/tenders/[id]/order-quotation/route.ts.md)
- [Client PO create page](../../app/(dashboard)/client-purchase-orders/create/page.tsx.md)
- `order-quotation.test.ts`
