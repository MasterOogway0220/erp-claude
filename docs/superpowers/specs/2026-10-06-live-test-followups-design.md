# Live-test follow-ups (6 Oct 2026) — design

The live end-to-end test of the 06/10 sandbox work (sandbox login, erp.n-pipe.com)
found five problems. The owner said: fix them, sandbox-only like the rest, commit,
push, and re-test on the sandbox login until clean. For #2 the owner chose
"unit labels only" over pieces-based allotment.

Everything new is served to the sandbox login only: gated files get an
`X.sandbox.*` change and an untouched `X.legacy.*`; ungated API routes only gain
an optional field that legacy screens never send.

## 1. Review step pairs PO and quotation lines by serial number

`ReviewStep` matches each order line to the quoted line with the same `sNo`, so a
split client PO line (100 + 20 of a quoted 120) or a part order shifts every
pairing: the split is compared with the next quoted line and the real line shows
as an extra.

- New column `SalesOrderItem.quotationItemId` (nullable, FK → `QuotationItem`,
  `ON DELETE SET NULL`, indexed). Migration
  `20261006130000_sales_order_item_quotation_link`, applied before the deploy
  with its `sbx_` twin.
- Written by `from-cpo` (the client PO line's `quotationItemId`), by
  `POST /api/sales-orders` (sent by the Create Order page for lines taken from a
  quotation) and kept by the sandbox `PUT /api/sales-orders/[id]` the way `uom`
  is (matched by line id).
- New pure helper `src/lib/calc/po-vs-quotation.ts` → `poVsQuotation(poLines,
  quotedLines)`. If any order line carries a link: one row per quoted line that
  was ordered, its order lines summed (qty, amount; rate = amount ÷ qty), labelled
  with their S.Nos ("1, 2"); an unlinked order line is its own row with nothing
  quoted. If no line carries a link (orders made before this change): the old
  pairing by `sNo`. Quoted lines that were not ordered are not listed (as before).
- `ReviewStep.tsx` becomes a gate: `ReviewStep.sandbox.tsx` uses the helper,
  `ReviewStep.legacy.tsx` is the current file unchanged. Existing orders are not
  backfilled; they keep the old comparison.

## 2. Unit labels on order lines

- `sales/[id]/page.sandbox.tsx`: Reserved and Shortfall print the line's unit
  (`uom || "Mtr"`), counted as now (Σ `reservedQtyMtr` against the line
  quantity — the reserve API's own rule).
- `ReviewStep.sandbox.tsx`: the comparison header reads "Quantity (unit)" when
  every line has the same unit, else "Quantity"; the Edit Order form reads
  "Qty (unit)" per line.
- Allotment and dispatch are unchanged (stock stays in metres).

## 3. Leading colon in saved term values

Some customers' saved terms start with ": ", so PDFs print "Price : : Ex-Godown".

- `cleanTermValue(v)` in `src/lib/quotations/terms.ts` (the regex `termValue`
  already uses); `termValue` uses it.
- Applied at print time only: the sandbox quotation PDF route maps the terms
  before rendering, and `letter.ts` (acceptance PDF and email, sandbox-only)
  maps the client PO's terms. Stored data is untouched.

## 4. Acceptance letter "To:" block

- `letterAddressee(customer, billingSite, billingText)` in `letter.ts`:
  typed billing text → printed as the address (it already carries any GSTIN);
  a picked billing site → its company name (else the customer's), address
  lines, city with PIN, state, and its GSTIN — else the customer's GSTIN only
  when the site is in the customer's state; neither → the customer master
  address, as today. `LETTER_INCLUDE` loads `billingAddress`.
- The attention / "Dear" line still uses the customer master contact.

## 5. Create Order straight from a quotation

- `sales/create/page.sandbox.tsx`: a line taken from a quotation gets its quoted
  period (`delivery`) counted from the Customer PO date, or today when that is
  blank (`deliveryScheduleToDate`); no period → today + 30 days, as before.
  Changing the Customer PO date moves lines whose date was not typed; typing a
  line date stops that. Lines carry `quotationItemId`.

## Testing

- Unit tests (vitest) first for `poVsQuotation`, `cleanTermValue` and
  `letterAddressee`.
- `tsc`, lint (no new problems), full vitest.
- Live re-test on the sandbox login after deploy: a new split / part-order
  client PO → acceptance → order shows no false variances; SO/2026-27/00011
  shows "Shortfall: … Nos"; quotation NPS/26/15287 and acceptance
  POA/2026-27/00012 PDFs print single colons; POA/2026-27/00011 is addressed
  to the PO's billing site; a direct order from an unlinked quotation dates
  each line from its quoted period.
