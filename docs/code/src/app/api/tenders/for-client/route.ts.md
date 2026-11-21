# src/app/api/tenders/for-client/route.ts

> `/api/tenders/for-client?customerId=` — GET

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

This route lists the client's tender quotations that a client PO can be
registered against. The client PO create screen adds them to its "Reference
Quotation No." dropdown. Rules are in
[`order-quotation.ts`](../../../../lib/tenders/order-quotation.ts.md).

Each row returns `id`, `tenderNo`, `tenderDate`, `tenderRef`,
`organization`, `status`, `currency`, `itemCount` and `orderQuotationId`. The last one is
the quotation a PO on this tender already uses, or null. The screen hides a
tender whose order quotation it already lists.

## How it works

- Gated by `checkAccess("clientPO", "read")` and company-scoped.
- It leaves out soft-deleted tenders and `NO_BID` / `LOST` ones. A tender
  with no lines **is** listed (`itemCount: 0`): its items are typed in on the
  PO screen.
- SQL narrows to tenders whose client is this customer, or that have no
  client and an organisation containing the client name's first word. The
  exact match (`tenderMatchesCustomer`) then runs in code, because "HPCL -
  Mittal" vs "HPCL-Mittal" can't be compared in SQL.
- Capped at 200 rows.

## Related

- [`/api/tenders/[id]/order-quotation`](../[id]/order-quotation/route.ts.md)
