# src/lib/pdf/invoice-pdf.tsx

> The GST tax invoice as a react-pdf document: the legal bill sent to the
> customer, and the file their finance team keeps against their own tax return.

See [README.md](./README.md) for the shared PDF pattern and
[primitives.tsx.md](./primitives.tsx.md) for the formatters used here.

## Why this exists

Two reasons, and the second is the one that put this file on disk.

**It is the billing document.** Delete it and the two invoice routes stop
returning a PDF — the customer gets no bill, and the office falls back to
retyping the figures into Tally or Excel by hand. Everything else in the
dispatch chain (packing list, dispatch note) is internal paperwork; this is the
one a third party files with a tax authority, so its wording, its tax split and
its per-line HSN code are prescribed rather than cosmetic.

**It replaced `invoice-template.ts`.** That file built the same document as an
HTML string and handed it to headless Chromium to print. Commit `c96e8d0`
("drop Chromium from the bundle") removed Puppeteer and every `*-template.ts`
that depended on it: a browser binary cost 300 MB–1 GB of memory per render and
a cold start measured in seconds, on a deployment that has neither to spare.
Every PDF in the app is now rendered in-process by `@react-pdf/renderer`.
react-pdf accepts no HTML and no CSS, so this was a re-authoring job, not a
swap — which is why the layout code below looks nothing like the document it
reproduces.

## What it does

Exports one component and two types:

| Export | Purpose |
|---|---|
| `InvoiceDocument({ invoice, company })` | The whole `<Document>`, ready for `renderToBuffer` |
| `InvoiceData` | Invoice header, totals, customer, and `items` |
| `InvoiceCompany` | Letterhead: name, registered address, GSTIN, PAN |

It renders and formats only — it never calculates. `subtotal`, `cgst`, `sgst`,
`igst`, `tcsAmount`, `roundOff` and `totalAmount` arrive already computed and
already `Number()`-converted by the caller (Prisma hands these back as
`Decimal`, and a `Decimal` reaching `fmtIN` prints as an object). The one
derived value is the amount in words, and only as a fallback.

Callers:

- `src/app/api/dispatch/invoices/[id]/pdf/route.tsx` — download.
- `src/app/api/dispatch/invoices/[id]/email/route.tsx` — the same buffer as a
  mail attachment.

Both build a plain object from the Prisma row and cast `as never` at the call
site, so **TypeScript is not actually checking the shape you pass**. A field
renamed here fails silently at runtime, not at compile time; `invoice-pdf.test.ts`
is what catches it, because it constructs a real typed `InvoiceData`.

## How it works

The page chrome — the 2pt box, the centred letterhead, the title bar, the
two-column reference grid, the item table — all comes from `bordered-doc.tsx`.
This file supplies three things: the column list, the tax-line branch, and the
footer.

### The tax branch

Indian GST is one treatment or the other, never both. `hasIgst` is
`Number(invoice.igst) > 0`, and that single boolean decides whether the summary
prints one IGST line or a CGST + SGST pair. Note it branches on the **stored
amount**, not on comparing the seller's state to `placeOfSupply` — the
classification was already made when the invoice was saved, and the document
must reproduce the invoice as issued rather than re-deciding it at print time.
TCS and round-off print only when non-zero, and round-off uses `!== 0` because a
legitimate round-off is often negative.

### Columns and the missing colspan

react-pdf has no `<table>`, no `rowspan`, no `colspan` and no `border-collapse`.
A table is flexbox rows of percentage-width cells, and every consequence of that
is visible here:

- The nine column widths must total exactly **100%**. Nothing type-checks this.
  A tenth column added without shrinking the others silently overflows the box.
- A summary row that would have been `<td colspan="7">` in HTML is instead one
  cell whose width is the **sum** of those seven percentages, hard-coded as
  `SPAN_FIRST_SEVEN = "73%"` (5 + 22 + 10 + 10 + 10 + 6 + 10). Change any of
  those seven column widths and this constant must change with it, or the
  "Subtotal" / "TOTAL" labels stop lining up with the grid above them. The sum
  is stated rather than derived because deriving it means parsing percentage
  strings, and a wrong sum is immediately obvious on a real render.
- The Rate column in a summary row is an explicit cell containing a single
  space, not an omitted cell. An empty `<Text>` collapses and the Amount column
  shifts left.
- The Subtotal row is written out inline rather than through `SummaryRow`
  because it alone carries a 1pt top rule closing the item list. `SummaryRow`
  covers the other three.

### Amount in words

`invoice.amountInWords` is stored on the record at save time so a historical
invoice does not change if the formatting code does. It is nullable in the
schema, so the document falls back to `numberToWords(totalAmount, currency)`
from `src/lib/amount-in-words.ts` — that helper groups in the Indian system
(lakh, crore) for `INR` and the western system otherwise. An empty amount-in-
words box on a tax invoice is a compliance defect, hence the fallback rather
than a blank.

### The `t()` helper

`t(v)` maps `null`/`undefined` to `""`. Passing `null` as a react-pdf `<Text>`
child is not an error, but `String(undefined)` reaching the page prints the
literal word `undefined` on a customer-facing bill. Every optional cell goes
through it. `uom` additionally defaults to `"Mtr"`, because pipe is sold by the
metre and blank-UOM rows were the common case in the imported data.

## Domain notes

- **GST** — India's goods and services tax. A sale *within* the seller's state
  is charged as **CGST + SGST** (a central half and a state half); a sale
  *across* state lines is charged as a single **IGST**. `placeOfSupply` is the
  field that decides which.
- **GSTIN** — the party's GST registration number. Both sides' numbers must
  appear for the customer to claim input credit.
- **HSN code** — the tariff classification of the goods, required per line.
- **TCS** — tax collected at source, an extra levy on large sales.
- **Heat number** — identifies the steel melt the material came from. It is
  carried onto the invoice so the billed goods stay traceable back to their MTC
  (mill test certificate). It prints in a monospaced column because it is a
  code that gets read character by character.
- **Size** (`sizeLabel`) — e.g. `6" SCH 40`: nominal bore and wall schedule.
  Pre-formatted upstream; this file does not build it.

## Gotchas and constraints

- **`borderWidth: 0` is rejected by react-pdf at render time** — it throws
  rather than drawing nothing. To remove an edge, zero the specific side
  (`borderBottomWidth: 0`, as the amount-in-words band does). This bites when
  overriding a style from `bordered-doc.tsx` that already sets a border.
- **Column widths total 100% by convention only.** No test asserts the sum; the
  test suite asserts that a render *succeeds*, which an overflowing table still
  does.
- **`SPAN_FIRST_SEVEN` duplicates knowledge held in `columns()`.** They are ten
  lines apart on purpose. Keep them that way.
- **Bank details are hard-coded** — "HDFC Bank", "Mumbai", account and IFSC as
  "As per Company Records". They are not on `InvoiceCompany`. If a real account
  number ever has to print, it needs a field on the company master first; do
  not inline it here, because three companies share this database and the
  letterhead is already passed in for that reason.
- **"Subject to Mumbai Jurisdiction" is hard-coded** in the disclaimer. It is a
  legal statement, not a label — check before reusing this document for another
  entity.
- **Long invoices paginate, and only the item table header repeats.** The
  `fixed` prop lives on `ItemsTable`'s header row in `bordered-doc.tsx`. Summary
  rows use `wrap={false}` so a row cannot be split across a page break, but
  nothing keeps the totals block together with the signature block.
- **`invoiceType` and `customerGstin` are on `InvoiceData` but never rendered.**
  `customerGstin` is duplicated by `customer.gstNo`, which is the one that
  prints. Do not assume a field in the interface reaches the page.

## Related

- `src/lib/pdf/bordered-doc.tsx` — the page chrome, `ItemsTable`, `TotalsRow`,
  and the `s` StyleSheet. Changing it changes every document in this family.
- `src/lib/pdf/primitives.tsx` — `fmtDate`, `fmtIN` (Indian digit grouping).
- `src/lib/amount-in-words.ts` — the `numberToWords` fallback.
- `src/lib/pdf/invoice-pdf.test.ts` — pins both tax branches, the optional TCS
  and round-off lines, the words fallback, an empty item list, and a 50-line
  invoice that paginates.
- `src/app/api/dispatch/invoices/[id]/pdf/route.tsx` and `.../email/route.tsx`
  — the only callers.
- `src/lib/pdf/packing-list-pdf.tsx` — the sibling dispatch document, same
  family.
- Commit `c96e8d0` — the Chromium removal that created this file; commit
  `24c1e76` — the HTML original it replaced.
