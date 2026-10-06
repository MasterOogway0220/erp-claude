# src/components/order-wizard/ReviewStep.tsx

> Step 1 of the order wizard: check the client's PO against the quotation.

See [README.md](./README.md) for the wizard as a whole — this doc covers only
what is specific to this step.

## What it does

Loads the sales order (`GET /api/sales-orders/[id]`) and shows the client PO
(number, date, the signed PO copy under "View PO Document") next to the
reference quotation, then a **PO vs Quotation Comparison**: quantity, rate and
amount per line, quotation against PO, with the difference. Any difference
raises "Variances Detected" so it is looked at before the order is processed.

- **Edit Order** (order still OPEN): header fields and lines, saved with
  `PUT /api/sales-orders/[id]`.
- **Accept PO / Reject PO** (PO review still PENDING): `PATCH` of
  `poAcceptanceStatus`. Accepted — or already accepted on load — completes the
  step. Orders started from a client PO arrive already accepted.

## How lines are compared

`poVsQuotation` (`src/lib/calc/po-vs-quotation.ts`) compares each order line
with the quoted line it came from (`SalesOrderItem.quotationItemId`, written
when the order is made from a client PO or straight from the quotation). A
quoted line the client split into several PO lines (100 + 20 of a quoted 120)
is one row with its parts summed, labelled with their S.Nos ("1, 2"), and still
flagged when a part is at a rate other than the quoted one; a line
added by hand is its own row with nothing quoted; a quoted line the client did
not order is not listed. Orders with no links — made before 6 Oct 2026, or on
the legacy Create Order screen, which does not send them — are paired by
S.No, as before; on those, a split or part order still shows variances that
are not real.

Until 6 Oct 2026 every order paired by S.No, so a split line was compared with
the next quoted line and the real one appeared as an extra.

## Units

The comparison header reads "Quantity (Nos)" etc. when every line has the
same unit, else "Quantity"; the Edit Order form labels each line "Qty (unit)".
Lines with no unit (older orders) read Mtr, as the screen always did.

## Gotchas

- Decimals arrive from the API as strings; convert before comparing.
- The edit form does not save a line's unit, non-standard description, client
  PO refs or quoted line (it holds the unit only to label the quantity); the
  PUT keeps them from the line being replaced, matched by its id. A line added
  in the edit has none of them.
- Shares wizard state with the other steps through `OrderWizard`.

## Sandbox preview (temporary, from 6 Oct 2026)

`ReviewStep.tsx` is a gate: the sandbox login gets `ReviewStep.sandbox.tsx` —
the behaviour this doc describes — and every other user gets
`ReviewStep.legacy.tsx`, the file as it was before (pairing by S.No, every
quantity labelled Mtr). See `src/lib/sandbox/preview.ts.md`. Going live:
replace this file with the `.sandbox` copy and delete both copies; then delete
this section.

## Related

- [Wizard overview](./README.md)
- `src/lib/calc/po-vs-quotation.ts` — the comparison
- `src/app/api/sales-orders/[id]/route.ts` — GET, PUT (keeps the quoted line), PATCH
- Migration `20261006130000_sales_order_item_quotation_link`
