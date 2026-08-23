# src/lib/pdf/purchase-order-pdf.tsx

> The react-pdf purchase order: the sheet sent to a vendor to buy material, and
> the sheet the vendor signs back.

See [README.md](./README.md) for the shared PDF pattern and
[bordered-doc](../../../../../src/lib/pdf/bordered-doc.tsx) for the chrome this
sits inside.

## Why this exists

A **purchase order (PO)** is the buying-side mirror of a quotation: the company
commits to buy named material from a vendor at a stated rate, and the vendor
accepts by countersigning. It is a contractual document, so it has to be
printable, e-mailable and archivable — nobody retypes one into Word.

The file exists in this form because of commit `c96e8d0`, which removed
Puppeteer and `@sparticuz/chromium` from the deployment entirely (~50 MB of
lambda bundle) and re-authored all thirteen PDF routes to render in-process with
`@react-pdf/renderer`. It replaces `purchase-order-template.ts`, which built an
HTML string and shot it at a headless browser. Chromium cost a cold start and
300 MB–1 GB of memory on every PO download; react-pdf costs neither.

Delete this file and `GET /api/purchase/orders/[id]/pdf` fails to compile. There
is no second path to a PO document — no print-from-browser view, no stored copy
on disk. The purchasing team would have no way to send a vendor an order.

## What it does

Exports one component and three data interfaces:

| Export | Purpose |
|---|---|
| `PurchaseOrderDocument({ po, company })` | The whole sheet, A4 **landscape** |
| `POData` | The order: header fields, vendor, references, items, total |
| `POItem` | One line: product, material, additional spec, size, qty, rate, amount |
| `POCompany` | Letterhead — company name plus registered address and contacts |

It returns a react-pdf `<Document>`, **not a buffer**. The caller runs
`renderToBuffer()`. Every numeric field is typed `number | string` because
Prisma hands back `Decimal` objects, and the component coerces rather than
assuming.

The visible sheet, top to bottom: company name bar; a five-row vendor/PO header
grid; the title (which becomes `PURCHASE ORDER — Revision N` when
`version > 0`); the item table; a totals row; the amount in words; payment terms,
numbered terms and conditions, and special requirements when present; a
Prepared By / Approved By / Vendor Acceptance strip; and the footer disclaimer.

## How it works

### The header grid, and why the widths look arbitrary

The HTML original laid the header out as a nine-column table with cells spanning
2, 3, 2 and 2 columns. **react-pdf has no colspan, no rowspan and no
`border-collapse`** — there is no table model at all, only a flexbox subset. So
each header line is a flex row of four `<Text>` cells whose widths are those
column spans expressed as percentages: `22.22% / 33.34% / 22.22% / 22.22%`.
The 33.34 is 3/9 rounded *up* on purpose, so the four add to exactly 100.00 and
the row does not leave a sliver of unpainted page at the right edge.

`HeaderRow` takes `borderTop` / `borderBottom` flags rather than styling the
first and last rows at the call site, because a border drawn on every row doubles
up where two rows meet — a 1pt rule renders as 2pt. Only the outer edges of the
block are drawn.

### Column widths must total 100%, and nothing checks that

`columns()` returns nine columns summing to
`4 + 14 + 14 + 14 + 8 + 8 + 12 + 14 + 12 = 100`. Two of the headers interpolate
`po.currency`, so an order in USD prints `Unit Rate (USD)`.

The totals row is where the missing colspan bites hardest. In HTML the "Total"
cell spanned the first five columns; here it is a single cell whose width is the
sum of those five, hard-coded as `SPAN_FIRST_FIVE = "54%"`. **TypeScript cannot
check that sum** — the widths are strings. Change any of the first five column
widths without changing `SPAN_FIRST_FIVE` and the Total row silently stops
lining up with the columns above it. `purchase-order-pdf.test.ts` renders the
document specifically to keep that path exercised.

### Totals: one number is computed, the other is trusted

Total **quantity** is summed here from the item rows. Total **amount** is taken
from `po.totalAmount`, the value stored on the record — templates format, they
do not calculate, so a historical PO does not change if the pricing code does.
The consequence is that the printed rows and the printed total can disagree if
the stored total is stale, and the document will not notice.

`numberToWords(totalAmount, po.currency)` renders the amount in words. For `INR`
it groups in lakhs and crores ("Rupees Two Lakh Forty Thousand Only"), not
millions — the accounts department reconciles against that grouping.

### Formatting and fallbacks

`num()` parses and fixes decimals, returning `""` rather than `"NaN"`: a blank
cell reads as "not applicable", `NaN` reads as a bug on a document a vendor is
holding. Quantity prints to **3** decimals and money to **2**, matching
`POItem.quantity Decimal(10,3)` and `Decimal(12,2)` / `Decimal(14,2)` in the
schema — printing quantity to 2 would round a real ordered weight.

Vendor address, company footer address and the contact line are all assembled
with `.filter(Boolean).join(...)`, so a missing city or a missing website
collapses instead of leaving `, , ,` or a dangling `Web: `.

Each line may carry its own `deliveryDate`; when it does not, the PO-level date
prints in that cell. A vendor should never see an empty delivery column.

### The single reference line

A PO is raised either against a **PR** (purchase requisition — an internal
request to buy) or directly against a **SO** (sales order — the customer order
being fulfilled). The header shows one label and one value. `purchaseRequisition`
wins: the schema permits both `prId` and `salesOrderId` to be set on the same
row, and if they are, the SO reference is not printed anywhere. If neither is
set, the label is `""` and the row prints as an empty label/value pair rather
than disappearing — the grid keeps its shape.

### Terms and conditions

`termsAndConditions` is one text column with newlines. It is split on `\n`,
blank lines are dropped, and the survivors are auto-numbered 1..n so the numbers
stay contiguous. Anyone who types their own numbering into that field gets
`1  1. Material to be supplied with MTC`.

## Domain notes

- **PR** — purchase requisition, the internal "we need to buy this" request.
- **SO** — sales order, the customer's order this purchase serves.
- **GST No.** — the vendor's Indian tax registration; printed in a monospace
  face so the 15 characters can be checked against an invoice by eye.
- **Additional Spec.** — requirements beyond the base material grade: test
  certificates (an **MTC**, the mill test certificate proving the steel's
  composition and mechanical properties), **NACE** compliance for sour service,
  and similar. It is a separate column because it is what a vendor most often
  gets wrong.
- **Revision** — a PO can be re-issued. `version > 0` means this sheet
  supersedes an earlier one, which is why the revision number is in the title
  *and* the footer says so explicitly. A vendor holding two copies must be able
  to tell which one governs; the schema tracks the chain through `parentPoId`.

## Gotchas and constraints

- **`totalAmount` is nullable in the schema** (`Decimal?`). The route does
  `Number(purchaseOrder.totalAmount)`, `Number(null)` is `0`, and the component's
  `Number(po.totalAmount) || 0` keeps it at zero. A PO saved without a total
  prints item rows with real amounts, a Total of `0.00`, and
  "Rupees Zero Only" in words. Nothing warns.
- **The route casts `po` and `company` to `never`**
  (`src/app/api/purchase/orders/[id]/pdf/route.tsx`). `POData` and `POCompany`
  are therefore documentation at the only call site, not enforcement — adding a
  required field to these interfaces will not produce a compile error there.
- **The letterhead is not scoped to the order's company.** The route uses
  `prisma.companyMaster.findFirst()`. Three companies share this database; a PO
  belonging to the second or third will print the first one's registered address
  and phone number. Fix belongs in the route, not here.
- **Not CSS.** These styles are a flexbox subset. No grid, no `position:
  sticky`, no `table`. Every border is declared as a Width + Color +
  `borderStyle: "solid"` triple; keep the triple when adding one. react-pdf
  validates style values at **render** time inside `renderToBuffer`, so a bad
  border is a 500 from the route with no type error anywhere — which is the
  reason the render tests exist at all.
- **Fields on the record that this document does not print**:
  `deliveryAddress`, `approvalRemarks`, `followUpNotes`. If a vendor asks where
  to ship, the answer is not on the PO.
- **`p.logoBar` prints no logo** — only the company name, centred. The style
  name is a leftover from the HTML version; `companyLogoUrl` is fetched by the
  route and unused. Adding the image means embedding it, not linking it.
- Rows use `wrap={false}`, so a single very long "Additional Spec." pushes the
  whole row to the next page rather than splitting across the break. The table
  header repeats via `fixed` in `ItemsTable`.
- **`Cache-Control: no-store`** on the route. Every download re-renders and
  re-queries; that is deliberate, because a revised PO must never serve a cached
  earlier sheet.

## Related

- `src/app/api/purchase/orders/[id]/pdf/route.tsx` — the only caller.
- `src/lib/pdf/bordered-doc.tsx` — `BorderedDocument`, `ItemsTable`,
  `TotalsRow`, `Column`, `A4_LANDSCAPE`, and the shared `s` StyleSheet.
- `src/lib/pdf/primitives.tsx` — `fmtDate`.
- `src/lib/amount-in-words.ts` — `numberToWords`, and the Indian lakh/crore
  grouping.
- `src/lib/pdf/purchase-order-pdf.test.ts` — pins the revision banner, the
  PR-vs-SO branch, the empty-everything case and pagination.
- `prisma/schema.prisma` — `PurchaseOrder`, `POItem`, `VendorMaster`.
- `src/lib/pdf/po-acceptance-template.ts` — the other side of the trade, the
  acceptance sent to a *customer*.
