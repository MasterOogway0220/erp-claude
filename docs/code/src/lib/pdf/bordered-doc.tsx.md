# src/lib/pdf/bordered-doc.tsx

> The shared chrome — page box, letterhead, title bar, reference grid, item
> table, totals row, signature blocks — that every "bordered form" PDF is
> assembled from.

See [README.md](./README.md) for the PDF pattern and
[primitives.tsx.md](./primitives.tsx.md) for the lower-level formatters.

## Why this exists

Commit `c96e8d0` removed Puppeteer and `@sparticuz/chromium` from the app
entirely (~50 MB of lambda bundle, plus a cold start that spent seconds booting
a browser to lay out a one-page form). All 13 routes that used to build an HTML
string and shoot it at headless Chromium now render in-process with
`@react-pdf/renderer`.

react-pdf accepts no HTML and no CSS, so that migration was a re-authoring job,
not a swap — and the documents being re-authored all descend from the same paper
form. `inspection-offer-template.ts` alone was 433 lines, most of it the same
`<style>` block repeated for four documents. This file is where that block went.
The four documents that came out the other side are now thin: a column list, a
title, a footer.

Delete this file and four PDFs stop compiling — inspection sheets, packing list,
tax invoice, purchase order — and whoever rebuilds them re-discovers the react-pdf
quirks below one document at a time, in four slightly different ways. That
divergence is exactly what the HTML templates had.

## What it does

Everything is a named export; there is no default.

| Export | Contract |
|---|---|
| `A4_PORTRAIT` / `A4_LANDSCAPE` | `[595, 842]` / `[842, 595]` — A4 in points at 72 dpi |
| `s` | The shared `StyleSheet`. Every consumer imports it and composes with array styles |
| `BorderedDocument({ title, size, children })` | The whole sheet: `<Document>`, one `<Page>`, the 2pt outer box |
| `CompanyHeader({ name, address?, contact? })` | Letterhead. Optional lines are omitted, not blanked |
| `TitleBar({ title, bg })` | The coloured band under the letterhead |
| `InfoGrid({ left, right })` / `InfoRow({ label, value, ... })` | Two-column reference grid. **`InfoRow` renders `null` when `value` is empty** |
| `Column<T>` | `{ header, width, align?, bold?, mono?, fontSize?, render }` |
| `ItemsTable({ columns, rows })` | The line table, with a repeating header |
| `TotalsRow({ cells })` | The bold summary row, with caller-supplied column spans |
| `SignSlot({ label })`, `SignFor({ company, role, gap? })` | Signature blocks |
| `YesNo({ value })` | Green **Yes** / grey No |

`title` on `BorderedDocument` is the PDF metadata title (what a viewer shows in
its tab), not anything printed on the page — the visible heading is `TitleBar`.

A caller supplies its own `<View style={s.footer}>` and
`<Text style={s.disclaimer}>`; those are styles here, not components, because
every document's footer content differs.

## How it works

### Why a table is a pile of `<View>`s

react-pdf has **no `<table>`, no `colspan`, no `rowspan` and no
`border-collapse`.** It implements a subset of flexbox and nothing else. Every
consequence below follows from that one fact, and it is the single most
surprising thing about this family of files.

- **A table** is a `<View>` per row with `flexDirection: "row"`, and a cell per
  column whose `width` is a percentage string. The percentages must total 100%.
  Nothing type-checks that, and nothing warns at render time — the row simply
  lays out wrong.
- **Rules are drawn once, not collapsed.** With no `border-collapse`, a border
  on all four sides of every cell paints 1pt where two 0.5pt cells meet and
  0.5pt at the edges. So `s.th` and `s.td` paint only their right and bottom
  edge, and `s.outer` supplies the box around the whole sheet. Same technique as
  the `CELL` family in `primitives.tsx`; this file is the standalone version for
  documents that do not use those.
- **`colspan` is arithmetic.** `TotalsRow` takes a list of `{ width, content }`
  and the caller states the span as a summed percentage. `invoice-pdf.tsx`
  declares `const SPAN_FIRST_SEVEN = "73%"` — the seven columns it replaces,
  added up by hand. Deriving it would mean parsing percentage strings for no
  gain, because a wrong sum is instantly visible: the totals row stops lining up
  with the columns above it.
- **A repeating header** is `fixed` on the header row. `<thead>` did this for
  free in HTML; react-pdf needs to be told.

### Cell body: `<Text>` or `<View>`

`Column.render` may return a string or a node. `ItemsTable` branches on
`typeof body`, and the branch matters: a node child (a coloured `<Text>` such as
`YesNo`) nested inside a `<Text>` that also sets `width` is laid out **inline**,
and the column width is silently ignored. Wrapping node bodies in a `<View>`
instead keeps the column geometry. Strings and numbers still go in a `<Text>`,
because a bare `<View>` cannot hold text.

### Row breaking

`ItemsTable` sets `wrap={false}` per data row, so a row never splits across a
page boundary — half a heat number at the foot of a page is unreadable on a
document used for physical verification. The header row is `fixed`, so it
reappears on every page the table spills onto.

### Layout details that look arbitrary

- `padding: 18` on the page replaces the HTML's `8mm` portrait / `5mm` landscape
  `@page` margins. Both collapse to one value because `s.outer`'s 2pt box is
  what actually reads as the inset.
- Landscape is the same sheet with the axes swapped — no separate stylesheet.
- Font sizes run 6–13pt. These forms are dense on purpose; a packing list with
  40 bundles has to fit.
- `TotalsRow` defaults `content` to `" "` rather than `""`, so a spacer cell
  still carries a text node and sits at the same height as its populated
  neighbours.

## Domain notes

The documents built on this chrome are the paperwork around a physical
consignment of pipe:

- **TPI** — third-party inspection. An independent agency the customer appoints
  to witness testing before material ships. The inspection offer letter is the
  invitation; the criteria checklist and colour-code list are what the inspector
  signs against.
- **Heat number** — identifies one steel melt, and is the traceability key that
  ties a pipe back to its mill test certificate. It appears in the packing list's
  item table.
- **Length tally** — the piece-by-piece measured-length record, taken in
  landscape because it is wide.

Every one of these is signed on paper by two or three people, which is why
`SignSlot` / `SignFor` are first-class here rather than a footer string. The 2pt
outer box is not decoration either: it is what the original paper form looked
like, and the people filing these expect it.

## Gotchas and constraints

- **`borderWidth: 0` throws at render time.** Verified in the installed
  `@react-pdf/stylesheet` 6.1.2 (`lib/index.js:157-201`, loaded by
  `@react-pdf/renderer` 4.3.2): the shorthand resolver does
  `width = widthMatch ? transformUnit(...) : undefined`, and `0` is falsy, so a
  zero produces `Invalid border width: undefined`. The same applies to `border`,
  `borderTop`/`Bottom`/`Left`/`Right`, `borderColor`, `borderStyle` and
  `borderRadius` — all shorthand keys. **Per-side widths are safe**:
  `borderBottomWidth` and friends route through `processUnitValue`, which
  accepts `0` happily. That is why `TotalsRow` writes `borderBottomWidth: 0` and
  never `borderWidth: 0`, and why consumers cancel a rule one side at a time
  (`inspection-offer-pdf.tsx:251`, `packing-list-pdf.tsx:186`).
- **`borderStyle` must be a string.** A numeric value hits an explicit
  `Invalid border style` throw. Every border in `s` carries
  `borderStyle: "solid"` for this reason.
- **Column widths must total 100%** and nothing checks it. Add a column and
  every other width has to be reduced.
- **`TotalsRow` spans are hand-summed constants** in the consumer. Change a
  column width and the matching span constant must change too, or the totals row
  drifts out of alignment with the table.
- **`InfoRow` returns `null` for an empty value.** Convenient — the grid closes
  up — but it means a field that should read `-` will vanish instead. Pass a
  dash explicitly if the absence has to be visible.
- **Editing `s` changes four documents at once.** That is the point of the file,
  but check the others before adjusting one. The tests exist precisely because a
  fault here breaks all of them: `inspection-offer-pdf.test.ts` renders all four
  inspection sheets to a real buffer, which is the only way a react-pdf layout
  fault surfaces before a user hits it.
- Only Helvetica, Helvetica-Bold and Courier are used — the PDF standard-14
  fonts, which need no font registration and no font file in the bundle. Using
  any other face means registering it and shipping the file, which reopens part
  of the bundle-size problem this migration solved.
- react-pdf is not CSS: no grid, no `position: sticky`, no percentage `height`
  in most places, a reduced property set. Styles that look like CSS are not.

## Related

- `src/lib/pdf/inspection-offer-pdf.tsx` — four documents on this chrome; the
  file this was extracted from.
- `src/lib/pdf/invoice-pdf.tsx`, `src/lib/pdf/packing-list-pdf.tsx`,
  `src/lib/pdf/purchase-order-pdf.tsx` — the other consumers.
- `src/lib/pdf/primitives.tsx` — formatters (`fmtDate`, `fmtIN`) and the
  `CELL` border family used by the non-bordered documents.
- `src/lib/pdf/inspection-offer-pdf.test.ts`, `invoice-pdf.test.ts`,
  `packing-list-pdf.test.ts`, `purchase-order-pdf.test.ts` — the render tests
  that guard this layer.
- Commit `c96e8d0` — the Chromium removal that created this file.
