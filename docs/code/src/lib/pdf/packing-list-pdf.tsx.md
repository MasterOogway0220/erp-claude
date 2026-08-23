# src/lib/pdf/packing-list-pdf.tsx

> The packing list as a react-pdf document: eleven columns of bundles, heat
> numbers, pieces and weights on a landscape A4 sheet.

See [README.md](./README.md) for the shared PDF pattern and
[bordered-doc.tsx](../../../../src/lib/pdf/bordered-doc.tsx) for the chrome this
document is built from.

## Why this exists

A **packing list** (PL) is the sheet that physically travels with a consignment.
The storekeeper ticks it off bundle by bundle at loading, and the customer's
receiving QA ticks it off again at the gate. Without it a lorry does not leave,
so this is not a nice-to-have report — deleting this file breaks
`GET /api/dispatch/packing-lists/[id]/pdf` with a 500 and there is no fallback
route, no HTML version and no manual export. Dispatch stops.

It exists in this shape because the app **removed Puppeteer and Chromium
entirely**. There used to be a `packing-list-template.ts` that assembled an HTML
string for a headless browser to print; the browser binary cost 300 MB–1 GB of
memory per render and a process spawn on every cold start. Every PDF is now
rendered in-process by `@react-pdf/renderer`, which takes no HTML and no CSS —
so this was a re-authoring job, not a swap, and the layout decisions below are
all consequences of what react-pdf cannot do.

## What it does

Exports one component and three types:

| Export | What it is |
|---|---|
| `PackingListDocument({ data, company })` | A react-pdf `<Document>`, ready for `renderToBuffer` |
| `PackingListData` | Header fields, optional sales order + customer, `items[]` |
| `PackingListItem` | One line: heat no., size, material, product, qty, pieces, bundle, gross/net weight, marking |
| `PackingListCompany` | Letterhead — name plus the registered-address parts |

The caller supplies the company block rather than the file importing it: three
companies share this database, so the letterhead is a parameter. The one caller
(`src/app/api/dispatch/packing-lists/[id]/pdf/route.tsx`) falls back to a
`DEFAULT_COMPANY` literal when `companyMaster` is empty.

Everything except `plNo`, `plDate`, `quantityMtr`, `pieces` and `items` is
nullable, and the component is written to survive all of it: no sales order, no
customer, no weights, no remarks, zero items. Those four shapes are exactly what
`packing-list-pdf.test.ts` renders.

## How it works

### The table, and why the widths are hand-arithmetic

react-pdf has **no `<table>`, no rowspan, no colspan and no `border-collapse`**.
A table is flexbox rows of `<Text>`, each with an explicit percentage width, and
`ItemsTable` in `bordered-doc.tsx` does that part. This file supplies only the
`COLUMNS` array — header, width, alignment, and a `render` for the cell body.

Two consequences live in this file:

- **The eleven widths must total exactly 100%** (`4+11+10+12+10+9+5+8+10+10+11`).
  Nothing type-checks that. Under 100% leaves a ragged right edge; over 100%
  wraps the last column onto its own line and the grid visibly breaks.
- **The totals row cannot span columns.** In HTML the "Total" label was one
  `colspan=5` cell. Here it is a single cell whose width is the sum of those five
  percentages, stated by hand as `SPAN_FIRST_FIVE = "47%"` with the arithmetic
  written out in the comment above `COLUMNS`. Change a column width and you must
  re-add that sum yourself.

The sheet is `A4_LANDSCAPE` because eleven columns do not fit portrait. Long
consignments page naturally: `ItemsTable` marks the header row `fixed` so it
repeats, and each body row `wrap={false}` so a bundle never splits across a page
break.

### Numbers arrive as strings, and are parsed as such

`num()` does `parseFloat(String(val))` rather than trusting the declared `number`
type, and `sum()` does the same. That is deliberate. The route passes the Prisma
result through `as never`, so **the interfaces in this file are documentation,
not enforcement** — at runtime a decimal column can arrive as a `Decimal` object
or a string, and `Number(decimalObject)` would give `NaN` where
`parseFloat(String(...))` gives the value. Three decimals throughout, because
quantities are metres and weights kilograms and the trade quotes both to grams.

### The one-off borders

Two edges are drawn by hand instead of by `bordered-doc`. `TotalsRow` closes with
`borderBottomWidth: 0`, and the remarks band re-opens with a 1pt top border —
otherwise the band's own bottom rule sits directly against the footer's 2pt top
rule and prints as a smudged double line. With no remarks the totals row simply
runs into the footer, which is why the band is conditional rather than always
rendered with empty text.

### What disappears on its own

`InfoRow` returns `null` for an empty value, so a packing list raised against
loose stock (no sales order) silently drops the "SO Ref." line and the customer
block rather than printing labels with nothing after them.

## Domain notes

- **Heat number** — identifies the melt of steel a pipe was cast from. It is the
  traceability key: the receiving QA matches it against the **MTC** (mill test
  certificate, the mill's proof of that heat's chemistry and mechanical
  properties). It is rendered `mono: true` (Courier) so `H-88214` and `H-8B214`
  cannot be confused, and it is never abbreviated or reformatted.
- **Gross vs net weight** — gross includes packing (strapping, caps, the pallet);
  net is the material alone. The footer disclaimer quotes **net**, because net is
  what the customer is invoiced against.
- **Bundle no.** — the physical unit being counted at the gate. One row is one
  bundle, which is why S/N, pieces and bundle number all appear separately.
- **Size / material** — e.g. `6" SCH 40`, `ASTM A106 Gr.B`. NB is nominal bore
  (the nominal inside diameter) and SCH is schedule (wall thickness); together
  they identify a pipe. Note the inch mark: it is plain text here, unlike in the
  old HTML pipeline where it had to be escaped out of attributes.

## Gotchas and constraints

- **`borderWidth: 0` throws at render time.** react-pdf's shorthand resolver
  treats `0` as falsy, computes `width = undefined`, and then raises
  `Invalid border width: undefined`. The longhands do not go through that path,
  so the `borderBottomWidth: 0` used here is safe. If you ever need to clear all
  four edges, clear them one at a time.
- **A wrong `SPAN_FIRST_FIVE` renders happily.** The tests assert only that a
  `%PDF` buffer comes out; a mis-stated span produces a valid PDF whose totals
  row no longer lines up with the columns above it. The header comment in the
  test overstates this — the render guards *invalid* style values, not *wrong*
  arithmetic. Check a real render after touching widths.
- **Zero weight prints `-`, not `0.000`.** The gross and net cells test
  truthiness (`i.grossWeightKg ? … : "-"`), so a genuine zero reads as "not
  weighed". Quantity does not share this: `num()` turns a null quantity into
  `0.000`.
- **An empty consignment still prints a totals row** of `0.000` / `0`. Covered by
  a test, and accepted — a PL with no lines is a data problem to see, not to
  hide.
- No logo is rendered; the letterhead is text only. That is why this document
  needs no network access at render time, which was one of the points of leaving
  Chromium.
- react-pdf is not CSS — flexbox subset only, no grid, no sticky. See
  `primitives.tsx.md`.

## Related

- `src/lib/pdf/bordered-doc.tsx` — `BorderedDocument`, `ItemsTable`, `TotalsRow`,
  `InfoGrid` and the `s` stylesheet. Changing it changes every document in this
  family.
- `src/lib/pdf/primitives.tsx` — `fmtDate`, and the shared react-pdf constraints.
- `src/lib/pdf/inspection-offer-pdf.tsx` — closest sibling; uses the same
  remarks-band border trick.
- `src/app/api/dispatch/packing-lists/[id]/pdf/route.tsx` — the only caller;
  owns the Prisma `include` that must keep supplying `salesOrder.customer` and
  `items.inventoryStock`.
- `src/lib/pdf/packing-list-pdf.test.ts` — populated, no-sales-order/no-weights,
  empty, and 60-row paginating renders.
