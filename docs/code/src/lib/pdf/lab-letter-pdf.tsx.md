# src/lib/pdf/lab-letter-pdf.tsx

> The covering letter that goes to an external testing laboratory with a batch
> of material, as a react-pdf document.

See [README.md](./README.md) for the shared PDF pattern and
[primitives.tsx.md](./primitives.tsx.md) for the react-pdf constraints that
apply to every document here.

## Why this exists

A **lab letter** is the paperwork that accompanies a physical sample to an
outside metallurgical laboratory. It says which melt of steel the sample came
from, what specification it is supposed to meet, which tests to run, and whether
an independent inspector must watch them happen. Without it the lab has a piece
of pipe and no instructions, and the results cannot be tied back to a purchase
order.

Until commit `c96e8d0` this document did not exist as a file. The route
`src/app/api/quality/lab-letters/[id]/pdf/route.tsx` was 193 lines, most of them
an HTML string with an inline `<style>` block, handed to headless Chromium. That
commit removed Puppeteer and `@sparticuz/chromium` from the deployment entirely
— roughly 50 MB of lambda bundle and a browser process spawned per render — and
re-authored all thirteen HTML documents as react-pdf components. The route is
now 66 lines: query, parse, render, respond.

Delete this file and the lab-letter PDF route stops compiling. There is no HTML
fallback left to fall back to; the templates were deleted in the same commit.
The quality team would be typing letters by hand in Word, and the heat number
would be typed by hand with it.

## What it does

Exports:

| Export | Purpose |
|---|---|
| `LabLetterDocument({ data, testNames })` | The react-pdf `<Document>`, one A4 page |
| `LabLetterData` | The shape of `data` — every field but `letterNo` and `letterDate` optional |
| `LabLetterCompany` | The letterhead block, passed in rather than imported |

The single caller renders it with `renderToBuffer` and streams the result as an
attachment. The page is: letterhead, title, letter-no/date/PO/client meta row,
an addressed-to box for the lab, a two-column material table, the list of tests
as inline badges, an optional TPI witness panel, optional remarks, two signature
blocks, footer.

**`testNames` is a separate prop, not a field on `data`.** That is not a style
choice. `LabLetter.testNames` is a `String? @db.LongText` holding a JSON array,
and reading it needs `parseStringArray` from
`src/lib/business-logic/technical-requirements.ts`. Commit `e3d61f9` fixed the
matching write-side defect: the creation routes passed Prisma a bare JS array
with an `as any`, and under Prisma 7 with the MariaDB adapter every lab letter
creation died with *"Argument `testIds`: Invalid value provided. Expected String
or Null"*. The readers were equally wrong — they used `Array.isArray()`, which is
`false` for a JSON string, so a letter that saved would have printed no tests at
all. Keeping the parse at the route boundary means this component only ever sees
a real `string[]`.

`LabLetterCompany` is a prop because three companies share one database; the
letterhead belongs to whichever company owns the record. It falls back to
`"NPS Piping Solutions"` when the company row is missing or incomplete.

## How it works

### The material table, and the missing border-collapse

react-pdf has no `<table>`, no `rowspan`, no `colspan` and **no
`border-collapse`**. A table is nested `<View>`s with `flexDirection: "row"`, and
if every cell drew all four of its edges, each internal rule would render at
double width because two adjacent cells both paint it.

The fix here is ownership: every edge is drawn by exactly one element.

- The wrapper `<View style={s.tableTop}>` draws the **top** rule for the whole
  table.
- `th` (the label cell) draws left, right and bottom.
- `td` (the value cell) draws right and bottom only — no left, because the `th`
  next to it already drew that line.

Every row therefore contributes its own bottom edge, and the grid comes out at a
uniform 1pt. This is the same principle as the `CELL` family in
`primitives.tsx`, spelled out inline because this table has two fixed columns
rather than a variable item grid.

The columns are `35%` / `65%`. **They must total 100% and nothing type-checks
that** — react-pdf will happily lay out a row that adds to 90% and leave a ragged
right edge, or one that adds to 110% and overflow the page. If you add a third
column, do the arithmetic yourself.

### Rows that disappear

`Row` returns `null` when its value is falsy, so an absent optional field leaves
no blank row rather than an empty cell with a stray label. The HTML version did
the same with a conditional template expression, and the layout depends on it:
with nine possible rows and most of them optional, printed blanks would dominate
a typical letter.

`wrap={false}` on each row keeps a label and its value on the same page. A lab
letter is one page today, but a long product description plus remarks can push
it, and a row split across the fold is how a heat number gets misread.

### The heat number, in Courier

**Heat number** identifies the melt of steel a piece came from. It is the
traceability key: every test result, every mill test certificate (**MTC**) and
every dispatched pipe is tied back to it. A transposed digit means the lab
reports against the wrong batch, so the value is printed verbatim in
`Courier-Bold` — a monospaced face where `1`/`l` and `0`/`O` are distinguishable
— and is never reformatted, trimmed or upper-cased on the way in.

### The witness panel

**TPI** (third-party inspection) means an independent agency must physically
witness the tests for the results to be accepted by the client. Scheduling that
inspector has to happen *before* the lab starts, which is why the block is an
amber-bordered panel above the closing paragraph rather than one more row in the
material table — and why a second sentence is appended to the closing paragraph
when `witnessRequired` is set.

`witnessLine` is assembled defensively: `witnessRequired` is a non-null
`Boolean @default(false)` on the model, but `tpiAgencyName` and the whole
`tpiAgency` relation are nullable, and in practice a letter is often raised
before the agency is nominated. That case prints
`"Yes — TPI Agency to be confirmed"` instead of `"Yes — Agency: undefined"`, and
`lab-letter-pdf.test.ts` guards it.

### Fonts

Only `Helvetica`, `Helvetica-Bold` and `Courier-Bold` are used. Those are PDF
standard-14 built-ins, so no font file ships and no `Font.register` call runs.
Any other family requires registering a TTF that must then be resolvable at
runtime in a serverless bundle — worth avoiding for a document nobody asked to
be branded.

## Domain notes

- **Heat number** — the melt identifier; the traceability key for the whole
  material chain. See above.
- **MTC** — Mill Test Certificate, the mill's own proof of a heat's chemistry
  and mechanical properties. The lab report produced from this letter either
  corroborates it or triggers an NCR.
- **TPI** — third-party inspection; an independent agency witnessing tests.
- **Specification / grade** — e.g. `ASTM A106 Gr.B`. Printed as free text
  because the standard names vary by client and by country.
- **Size** — arrives pre-formatted as `sizeLabel` (`6" SCH 40`, i.e. 6 inch
  nominal bore, schedule 40 wall). This component never composes it.

## Gotchas and constraints

- **`borderWidth: 0` throws at render time.** `@react-pdf/stylesheet` routes the
  shorthand through `resolveBorderShorthand`, which treats a falsy width as
  absent and raises `Invalid border width: undefined`. The per-side properties
  are safe — `borderBottomWidth: 0` goes through a different handler and works.
  To remove a border here, drop the key; do not zero it.
- **A react-pdf layout error is a runtime error, not a compile error.** A bad
  style key, a width that does not resolve, a `<Text>` where a `<View>` is
  required — all of it type-checks and then throws when a user clicks download.
  That is the entire reason `lab-letter-pdf.test.ts` renders three real buffers
  rather than asserting on props.
- **`quantity` is `String?` in the database, not a number.** A stored `"0"` is
  falsy, so `Row` drops the Quantity line entirely rather than printing zero. In
  practice nobody sends zero material to a lab, but the same trap applies to any
  new numeric-looking field routed through `Row`.
- **An all-empty material table leaves an orphan rule.** The wrapper draws the
  top border unconditionally, so a letter with no optional fields at all prints a
  1pt line across the page with nothing under it. The "every optional field
  missing" test proves it does not *crash*; it does not prove it looks right.
- **The route casts with `as never`.** `<LabLetterDocument data={labLetter as
  never} …>` — so adding a required field to `LabLetterData` will not produce an
  error at the call site. Keep every new field optional, or fix the cast.
- **Letter numbers contain slashes** (`LAB/26/0031`). The route replaces them
  with `-` before putting the number in `Content-Disposition`; the number is
  printed unmodified on the page itself.
- **`Cache-Control: no-store`** on the response is deliberate (commit `ab05abd`):
  a regenerated letter must not be served from a stale cache.
- Rendering is in-process and synchronous with the request. This document is one
  page and cheap; the dossier is not. Watch total memory if several PDF routes
  are hit at once on one lambda instance.

## Related

- `src/app/api/quality/lab-letters/[id]/pdf/route.tsx` — the only caller;
  queries, parses `testNames`, renders, sets the filename.
- `src/lib/pdf/primitives.tsx` — `base.page`, `base.bold`, `base.right`,
  `fmtDate`.
- `src/lib/business-logic/technical-requirements.ts` — `parseStringArray`,
  which turns the stored JSON column into the `testNames` prop.
- `prisma/schema.prisma` — the `LabLetter` model; note `testIds` and `testNames`
  are `String? @db.LongText`, not JSON columns.
- `src/lib/pdf/lab-letter-pdf.test.ts` — full letter, empty letter, and a
  witness-without-agency regression.
- `src/lib/pdf/inspection-offer-pdf.tsx` — the sibling document sent to the TPI
  agency rather than the lab.
