# src/lib/pdf/client-status-report-pdf.tsx

> The react-pdf document behind the customer-facing order status report: one
> wide sheet showing every line of a sales order and how far it has progressed.

See [README.md](./README.md) for the shared PDF pattern, and
[primitives.tsx.md](./primitives.tsx.md) for the react-pdf helpers.

## Why this exists

The report used to be an HTML string (`client-status-report-template.ts`)
rendered by headless Chromium. Commit `c96e8d0` removed Chromium from the
deployment entirely — no `puppeteer`, no browser binary, no 300 MB–1 GB of
memory per render, no cold start spent launching a process. Every PDF is now
drawn in-process by `@react-pdf/renderer`, and each document had to be
re-authored, because react-pdf accepts no HTML and no CSS.

This file is that re-authoring for the status report. Delete it and both
`/api/reports/client-status/[salesOrderId]/pdf` and `.../email` stop compiling:
there is no fallback path, because the Chromium renderer they would fall back
to (`render-pdf.ts`) no longer exists in the repo.

Two smaller reasons it is worth its own file rather than inline JSX in the
routes: the download route and the email route render exactly the same
document, and `client-status-report-pdf.test.ts` renders it for real (see
[Gotchas](#gotchas-and-constraints)).

## What it does

Exports:

- `ClientStatusReportDocument({ report, company })` — a react-pdf `<Document>`.
  Callers pass it to `renderToBuffer()` from `@react-pdf/renderer`; it is not a
  DOM component and will not render in a browser tree.
- `StatusReportCompany` — the letterhead fields it reads. A narrower shape than
  the `CompanyMaster` row, so a route may pass the Prisma record directly.

`report` is a `ClientStatusReportData`, whose type is still owned by
`client-status-report-template.ts`. That file also still exports
`generateClientStatusReportHtml`, but **nothing calls it any more** — only its
two interfaces are live. The file header's claim that it "remains the source for
the HTML preview route" is out of date; there is no such route.

The PDF's internal metadata title is set to `Order Status Report - <SO no.>`,
which is what a viewer shows in its title bar. The download filename is chosen
by the route, not here.

Everything is presentational. No fetching, no calculation beyond four
percentages; the status wording, heat numbers and quantities all arrive
pre-derived from `/api/reports/client-status/[salesOrderId]`.

## How it works

### The sheet is not A4, on purpose

`PAGE_SIZE = [842, 652]` is 297 × 230 mm at 72 dpi. The HTML version asked
Chromium for `landscape: true`, which in the old `render-pdf.ts` meant that
custom wider-and-shorter sheet — chosen so thirteen columns plus the footer land
on one page. Customers have been receiving that shape for a while, so it is
preserved rather than reflowed to A4 landscape (which is 595 pt tall and would
push the footer over). react-pdf takes **points** and silently treats a bare
number as points, so the millimetre conversion happens once, in that constant.
Page padding follows the same rule: 17 / 23 pt is the 6 mm / 8 mm margin the old
pipeline passed Chromium.

### The table, without a table

react-pdf has no `<table>`, no `rowspan`, no `colspan` and no
`border-collapse`. Each row is a flex `<View>` and each cell is a `<Text>` with
an explicit percentage width taken from the `COL` map. Those thirteen
percentages **must total 100** (they do: 3+12+11+8+9+7+8+7+8+8+7+6+6). Nothing
type-checks that; over 100 and columns wrap or clip, under it and the row is
short and ragged.

The double-border problem that `primitives.tsx` solves with its `CELL` family
does not arise here, because this design has no vertical rules at all — `tr`
paints a single 0.5 pt bottom edge and nothing else. That is why the file
imports only `fmtDate` from `primitives.tsx` and none of the cell styles.

Two consequences of having no `<thead>`:

- The header row carries `fixed`, react-pdf's equivalent of a repeating table
  head. Without it a long order's second page arrives with thirteen unlabelled
  columns.
- Zebra striping is computed in JS (`even={i % 2 === 1}`), because there is no
  `:nth-child`.

Each `ItemRow` sets `wrap={false}` so a line never splits across a page break —
half a heat number at the bottom of a page is worse than a slightly short page.

### Status colours are keyed off vocabulary, not an enum

`statusColor()` matches on uppercased strings rather than a single enum,
because the words come from different tables: a dispatch row says `ISSUED`, an
inspection row says `PASS`, a material-preparation row says `READY`. Anything
unrecognised falls through to neutral grey rather than inventing a signal — a
wrong colour on a customer document is worse than no colour. See the gotcha
below about `FAILED`, which currently lands in that fallback.

`Badge` re-implements the HTML badge, which used an 8-digit hex fill
(`#RRGGBB15`) for an 8 % tint of the status colour. react-pdf does not parse
8-digit hex, so the tint became a fixed light neutral with the status colour on
the text and the 0.5 pt border. That also survives greyscale, which is how most
clients print this.

### `qty()` rather than `fmtIN()`

`primitives.fmtIN(v, 3)` would produce the same digits, but returns `""` for an
unparseable value. On a quantity column an empty cell reads as "not applicable";
the HTML template printed `0.000`, and a customer comparing an old report with a
new one should not see a column change meaning. Hence the local copy returning
`"0.000"`. Quantities on this report are in metres, and Indian grouping
(`12,34,567`) applies for the same reason it does on invoices.

## Domain notes

- **Heat number** — the identifier of the steel melt a pipe was rolled from. It
  is the traceability key the customer's own QA checks against the mill test
  certificate, so it is rendered in Courier and never abbreviated. The data route
  may join several with commas when one order line was filled from several stock
  lots.
- **MTC** (mill test certificate) — the mill's chemical and mechanical test
  report for a heat. The data route treats "every reserved lot has an MTC" as
  testing complete, which is what the `TESTING` column shows.
- **TPI** (third-party inspection) — an independent inspection agency acting for
  the customer. The `INSPECTION` column covers both TPI and the customer's own
  sign-off; a line can be materially ready and still blocked on it, which is
  exactly what this report exists to show.
- **SO / MPR** — sales order, and the warehouse material preparation request
  raised against its lines. `MATERIAL` reflects the MPR's item status.

## Gotchas and constraints

- **`"Failed"` prints grey, not red.** The data route emits Title Case words
  (`"Completed"`, `"In Progress"`, `"Pending"`, `"Ready"`, `"N/A"`, `"Failed"`).
  `statusColor` uppercases before matching, so all of those hit a case *except*
  `FAILED` — the switch lists `FAIL` and `REJECTED`. A failed inspection or test
  therefore renders in the neutral default. Fix it in `statusColor`, not in the
  route, since the route's wording is also shown on screen and in the Excel
  export.
- **`borderWidth: 0` is rejected by react-pdf at render time.** That is why the
  optional styles in `SummaryCard` spread `{}` rather than a zeroed border. Any
  "turn this border off" edit must omit the property, not zero it.
- **Percentage widths must be finite.** `Math.max(pct, 0)` guards the progress
  fill against a negative, but `Math.max(NaN, 0)` is `NaN`, and a `"NaN%"` width
  throws inside the layout engine. `pct()` already returns 0 on a zero
  denominator; the remaining exposure is a non-numeric quantity reaching
  `summary`, which is the data route's job to prevent.
- **A react-pdf layout error is a runtime error.** Nothing here fails at compile
  time — the failure surfaces as a 500 the moment a customer asks for the report.
  `client-status-report-pdf.test.ts` therefore calls `renderToBuffer` for real
  and asserts a `%PDF` magic number, covering three cases: a populated report, an
  empty order with an all-zero summary (every percentage divides by a summary
  total), and 60 items so pagination and the `fixed` header actually run. Run it
  after any layout change: `npx vitest run src/lib/pdf/client-status-report-pdf.test.ts`.
- **The watermark position is hardcoded to this sheet.** `top: 280, left: 180`
  centres "ORDER STATUS" on 842 × 652 only. Change `PAGE_SIZE` and it drifts off
  centre; there is no auto-centring for an absolutely positioned `fixed` element.
- **Bold is a font family, not a weight.** `Helvetica`, `Helvetica-Bold` and
  `Courier` are PDF base-14 fonts, so no font files ship and no `Font.register`
  call is needed — but `fontWeight: "bold"` has no registered face to resolve to.
  Use `fontFamily: "Helvetica-Bold"`.
- **Both callers cast the company to `never`.** `company={companyInfo as never}`
  in the two routes defeats the `StatusReportCompany` check, because
  `companyInfo` may be a `DEFAULT_COMPANY` literal or a Prisma row. A missing
  `companyName` reaches render as `undefined` and prints nothing rather than
  failing a type check.
- **The `report` payload is `await res.json()` — typed `any`.** Both routes
  fetch the sibling data route over HTTP (forwarding the session cookie) rather
  than importing it, so a field renamed in the data route shows up as a blank
  column on a customer's PDF, not as a build error.
- **The PDF route sends `Cache-Control: no-store`.** The caching work in the
  same commit as the Chromium removal deliberately does not extend here — a
  status report is only useful if it is current.

## Related

- `src/lib/pdf/client-status-report-template.ts` — owns `ClientStatusReportData`
  and `StatusReportItem`; its HTML generator is now dead code.
- `src/lib/pdf/primitives.tsx` — `fmtDate`.
- `src/lib/pdf/client-status-report-pdf.test.ts` — the render tests.
- `src/app/api/reports/client-status/[salesOrderId]/route.ts` — builds the data,
  including all the status wording.
- `src/app/api/reports/client-status/[salesOrderId]/pdf/route.ts` — download.
- `src/app/api/reports/client-status/[salesOrderId]/email/route.tsx` — same
  document as a mail attachment.
- `src/app/(dashboard)/reports/client-status/page.tsx` — the screen that calls
  all three.
- `docs/code/src/lib/pdf/README.md` predates the Chromium removal and still
  describes the HTML pipeline as live; read it for the shared conventions, not
  for the current rendering path.
