# src/lib/pdf/dossier-pdf.tsx

> One react-pdf document that draws all twelve dossier pages, and backs both the
> full dispatch dossier and the shorter dispatch-note bundle.

See [README.md](./README.md) for the shared PDF pattern and
[primitives.tsx.md](./primitives.tsx.md) for the formatters this imports.

## Why this exists

A **dispatch dossier** is the bound pack of evidence that travels with a
consignment of pipe. The customer's QA department opens it to satisfy themselves
that what arrived is what was ordered, and that it was tested, inspected and
released before it left. It is not one form — it is a compilation, one page per
kind of evidence, each drawn from a different point in the order chain.

Two things collapsed into this file:

1. **The dossier route's ~700 lines of inline HTML string**, handed to headless
   Chromium. Chromium is gone from this application — no browser binary, no
   300 MB–1 GB per render, no Chromium layer in the image — and every PDF is now
   rendered in-process by `@react-pdf/renderer`. That is a re-authoring job, not
   a switch: react-pdf takes no HTML and no CSS.
2. **The dispatch-note bundle's own ~450 lines of HTML.** Four of its pages were
   near-duplicates of pages the dossier already drew, and the two copies had
   drifted. The bundle is now this same document rendered with a narrower
   section list, so a layout fix lands in both at once.

Delete this file and two routes plus the dossier preview screen stop compiling:
`/api/dispatch/dispatch-notes/[id]/dossier`, `.../bundle-pdf`, and the email
route that attaches the dossier. There is no HTML fallback left to fall back to.

## What it does

**`DossierDocument({ data, company, sections? })`** — a react-pdf `<Document>`.
Render it with `renderToBuffer()` (both routes do). `sections` defaults to
`DOSSIER_SECTIONS`.

**Section lists** — all three are `readonly` arrays of `DossierSection`:

| Export | Contents |
|---|---|
| `ALL_SECTIONS` | Every page the file can draw, 12 of them. |
| `DOSSIER_SECTIONS` | `ALL_SECTIONS` minus `dispatchNote` — the full evidence pack. |
| `BUNDLE_SECTIONS` | `dispatchNote`, `packingList`, `mtc`, `inspection`. |

`dispatchNote` is deliberately excluded from the dossier default. The dossier is
the evidence pack that *accompanies* a dispatch note rather than reproducing it,
and quietly adding the page would change every dossier already going to
customers. `dossier-pdf.test.ts` pins that asymmetry so nobody "tidies" it.

**Types** — `DossierSection`, `DossierCompany` (letterhead, passed in because
three companies share this database), and `DossierData`, the per-section payload.

`DossierData` is only strongly typed where the route can guarantee a shape
(`dispatchNote`, `customer`, `salesOrder`). Everything else is
`Row = Record<string, unknown>`, because the Prisma joins differ per section and
pinning them here would mean re-declaring a dozen relation shapes that the route
already owns. This file decides only *how a row is drawn*; the route owns the
queries (`src/lib/pdf/dossier-data.ts`).

## How it works

### Nothing is omitted, ever

Every section a caller asks for produces a page. When there is no data, the page
prints a dashed-border "No MTC certificates available for dispatched items"
placeholder instead of disappearing. This is the whole point of the document: a
dossier that silently drops a section reads to an auditor as though the section
was never required, which is the opposite of the truth. The same reasoning
drives `t()` — every field access renders `---` rather than `undefined`, because
a visible dash reads as "not applicable" and `undefined` reads as a bug.

`cover`, `mtc`, `inspection`, `tpi`, `labReports`, `lengthTally`,
`colourCoding`, `packingList` and `invoice` all draw a placeholder page.
`clientPO` and `poAcceptance` are the two exceptions — `DossierDocument` skips
them entirely when the record is absent, since they are genuinely optional
attachments rather than expected evidence.

### `DTable` — a table, without any of the table features

react-pdf has **no `<table>`, no `rowspan`, no `colspan` and no
`border-collapse`.** A table is nested `<View>`s with `flexDirection: "row"`, and
every layout idiom has to be rebuilt:

- **Columns** are percentage widths on each cell, declared once in a `Col<T>[]`
  and applied to header, body and totals. `Col.render` returns a node, so a cell
  can hold a `<Badge>` rather than only text.
- **colspan** is emulated by the `totals` prop: a second, independent array of
  widths that must sum to 100% *and land on the same boundaries as the columns
  above*. The packing-list totals row opens with a single `55%` cell because the
  first five columns are `4 + 13 + 11 + 14 + 13 = 55`. Change a column width and
  the totals row silently slides out of alignment — nothing connects the two.
- **rowspan** is emulated by splitting the table. The length tally would
  naturally want a Heat No. column spanning every pipe in that heat; instead the
  rows are grouped into a `Map` by heat and each group gets its own `h3` heading
  and its own `DTable` with its own subtotal row.
- **Double borders** are avoided the way `primitives.tsx` describes: `s.tr`
  draws only a bottom rule, so adjacent cells never stack two 0.5pt lines into
  one 1pt line.
- **Node cells need a `View`.** A `<Badge>` placed inside a width-bearing
  `<Text>` is laid out inline and the width is ignored, so `DTable` branches on
  `typeof body` and wraps non-string cells in a `<View>` instead.

`wrap={false}` on each row stops a row splitting across a page break;
`fixed` on the header row repeats it when a table overflows.

### Grouping and de-duplication

- **Length tally** groups pipe-by-pipe measured lengths by **heat number** — the
  identifier of one steel melt, and the key the whole traceability chain hangs
  off (MTC → heat → individual pipe). Grouping by heat is not cosmetic: the heat
  is the unit the customer's QA reconciles against the mill certificate.
- **Inspections vs TPI.** `InspectionPage` filters `data.inspections` down to
  rows with no `tpiAgencyId`, so a third-party certificate is never counted twice
  — it belongs on the TPI page. `dossier-data.ts` builds `tpiInspections` as
  exactly the complement (`allInspections.filter(i => i.tpiAgencyId)`), so the
  two partitions cover everything. That symmetry is the caller's job, not this
  file's; see the gotcha below.
- **Colour coding** cross-references two lists: packing-list items on one side, a
  `Set` of `inventoryStockId`s that have a QC release on the other, to print
  "QC Released" or "Pending" per item.

### Badges

`TONES` maps four semantic tones to background/foreground pairs.
`ResultBadge` recognises only `PASS`, `FAIL` and `HOLD` — the inspection
vocabulary — and renders anything else, including a missing result, as plain
neutral text. A badge implies an outcome, and inventing one for an unrecognised
status is worse than showing the raw string.

TPI sign-off gets its own column rather than being inferred from the result,
because an unsigned TPI certificate normally blocks payment even when every
parameter passed.

## Domain notes

- **MTC** — mill test certificate: the steel mill's own record of a heat's
  chemistry and mechanical properties.
- **Heat number** — identifies one melt of steel. The traceability key.
- **TPI** — third-party inspection: an independent agency the *customer*
  appoints. Their sign-off is usually a precondition of payment.
- **Length tally** — pipe-by-pipe measured lengths. Pipe is sold by the metre and
  delivered in random lengths, so the tally is what the quantity is checked
  against on arrival.
- **Colour coding** — painted bands identifying material grade, so the right pipe
  is used on site.
- **QC release** — the internal sign-off that a stock item may be dispatched.
- **LR number** — the transporter's consignment note. **E-way bill** — the tax
  document that must accompany goods in transit in India. Both print as `---`
  when absent rather than being omitted; their absence is itself information.
- **CGST/SGST vs IGST** — intra-state sales carry the first pair, inter-state
  carries the third. `InvoicePage` lists only the non-zero ones, so an invoice
  never shows an inapplicable tax at 0.00.

## Gotchas and constraints

- **`sections` is a membership set, not an ordering.** Page order is hardcoded in
  `DossierDocument`'s JSX. Passing `["invoice", "cover"]` still renders cover
  first.
- **The dossier route filters against `DOSSIER_SECTIONS`, not `ALL_SECTIONS`.**
  So `?sections=dispatchNote` is silently dropped and produces a dossier with
  that page missing rather than an error. Use the bundle route for that page.
- **Column widths must total 100% and nothing checks it.** `Col.width` is a bare
  `string`; TypeScript sees `"11%"` and `"110%"` identically. Every table in this
  file currently sums to exactly 100 — keep it that way, and remember the
  `totals` array must sum to 100 *independently*.
- **`borderWidth: 0` throws at render time.** react-pdf rejects a zero border
  width rather than treating it as "no border". To remove a border, delete the
  property; do not set it to `0`.
- **Totals rows are not Indian-grouped, body cells are.** Body quantities go
  through `num()` → `fmtIN` (`1,20,500.500`), while the totals rows use plain
  `toFixed(3)` (`120500.500`). Same for the length-tally caption. Deliberate or
  not, it is visible on any consignment above ₹1 lakh worth of pipe — decide
  before "fixing" one of them.
- **`ClientPOPage` and `POAcceptancePage` use `!` on their record.** They are
  safe only because `DossierDocument` guards with `&& data.clientPO`. Rendering
  either component directly, or dropping that guard, is a null dereference.
- **The `inspections` / `tpiInspections` split must be a true partition.** This
  file trusts the caller: a TPI record present in `inspections` but missing from
  `tpiInspections` is filtered off the internal page *and* absent from the TPI
  page — it renders nowhere at all, with no warning. `dossier-data.ts` derives
  both from one list, which is why it works; any other caller must do the same.
- **A missing `inventoryStockId` can fake a QC release.** The released `Set`
  stores `String(g(q, "inventoryStockId"))`, so a QC-release row without the id
  inserts the literal `"undefined"`, and any packing-list item also missing it
  then matches and prints "QC Released".
- **Colour coding drops rows.** Items with neither `markingDetails` nor
  `inventoryStock` are filtered out; if every item is filtered the page shows the
  empty placeholder, which is indistinguishable from having no data at all.
- **`fixed` on stacked tables.** `InspectionPage` and `TpiPage` put many
  `DTable`s inside one `<Page>`, and every one of those headers is `fixed`.
  `fixed` in react-pdf means "repeat on each page", not "repeat when *this* table
  overflows" — check a real render before adding another table to a long page.
- **Fonts are the built-in PDF cores** (`Helvetica`, `Helvetica-Bold`,
  `Courier`), so no font registration is needed and nothing is fetched at render
  time — but they are Latin-1 only. A customer name in Devanagari will not draw.

## Related

- `src/lib/pdf/dossier-data.ts` — builds every `DossierData` field; owns the
  Prisma queries and the readiness check.
- `src/lib/pdf/primitives.tsx` — `fmtDate` and `fmtIN`.
- `src/app/api/dispatch/dispatch-notes/[id]/dossier/route.tsx` — full dossier,
  `?sections=`, `?validate=true`, and the readiness gate that refuses an
  incomplete pack unless `?force=true`. Also exports `DOSSIER_COMPANY`.
- `src/app/api/dispatch/dispatch-notes/[id]/bundle-pdf/route.tsx` — the bundle;
  no readiness gate, because it travels with the goods.
- `src/app/api/dispatch/dispatch-notes/[id]/dossier/email/route.tsx` — attaches
  the same buffer to an email.
- `src/app/(dashboard)/dispatch/dispatch-notes/[id]/dossier/page.tsx` — the
  section-picker UI.
- `src/lib/pdf/dossier-pdf.test.ts` — renders all 12 sections populated, all 12
  empty, and each one alone, asserting a `%PDF` header. Running one section at a
  time is what isolates a layout fault to its own page.
