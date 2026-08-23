# src/lib/pdf/mtc-certificate-pdf.tsx

> The Mill Test Certificate as a react-pdf document: one A4 landscape page
> carrying the chemistry and mechanical results that prove a batch of steel is
> what the customer ordered.

See [README.md](./README.md) for the shared PDF pattern and
[primitives.tsx.md](./primitives.tsx.md) for the react-pdf constraints that
apply to every document here.

## Why this exists

An **MTC** (Mill Test Certificate) is the document a customer's QA department
uses to accept or reject delivered material. They match the certificate to the
physical goods by **heat number** — the identifier of the steel melt, stamped on
the pipe — and then read the two result tables to check the melt actually meets
the specification. Nothing on the page is decorative. If this file is deleted,
the entire MTC module becomes data entry with no output: the certificate is
still in the database, but nobody can hand a customer the piece of paper that
releases the shipment, and QA falls back to retyping the numbers into Excel with
no link to the record they came from.

It exists in *this* form because of commit `c96e8d0`, which removed Puppeteer
and `@sparticuz/chromium` (roughly 50 MB of lambda bundle) and moved all 13
PDF routes to in-process rendering with `@react-pdf/renderer`. The motive was
not tidiness: cold-starting a browser per PDF was part of the same
slow-app/dropped-connection problem as the uncached screen queries fixed in the
same commit. There is no HTML fallback for this document — unlike the issue
slip, the Chromium version is gone, so this file is the only implementation.

Two pieces of history worth keeping:

- The old renderer lived **inside the route** — `route.ts`, 624 lines of inline
  HTML string concatenation. It is now `route.tsx`, 88 lines, and the layout
  lives here where it can be tested.
- **The old mechanical table was built twice and the first copy thrown away.**
  The HTML builder assembled the section, then reassembled it, and only the
  second pass reached the output. It also carried comments describing a rowspan
  problem it never actually solved. This file is a transcription of the pass
  that rendered, not of the dead one — so if you are comparing against
  pre-`c96e8d0` source, half of what you read there never printed.

## What it does

Exports one component and its input types:

| Export | Purpose |
|---|---|
| `MtcCertificateDocument` | The `<Document>`. Caller passes it to `renderToBuffer`. |
| `MtcCertificate` | Header fields plus `items[]` (loosely typed as `Record<string, unknown>`). |
| `MtcCompany` | Letterhead and footer address. |
| `MechProp` | **Dead.** Nothing imports it; safe to delete. |

Props:

```tsx
<MtcCertificateDocument
  certificate={cert}          // required
  company={company}           // optional; falls back to a text letterhead
  chemElements={["C","Mn",…]} // the chemistry column list — see below
  companyLogoUrl=""           // absolute URL or "" — never a relative path
  isoLogoUrl=""
/>
```

Three things the caller owns, all of them visible in
`src/app/api/mtc/certificates/[id]/pdf/route.tsx`:

1. **The query.** Items must arrive with `chemicalResults`, `mechanicalResults`
   and `impactResults` included and ordered by `sortOrder`. The component does
   no sorting; a missing `orderBy` reorders the printed rows.
2. **Absolute logo URLs.** react-pdf fetches `<Image src>` over the network at
   render time and *throws* on an unreachable URL. Logos are stored as
   site-relative paths, so the route prefixes `request.nextUrl.origin`. Pass
   `""` rather than a guess — the document then prints a text letterhead
   instead, which is why the tests can run offline.
3. **`chemElements`.** The route takes it from `items[0].chemicalResults`.

## How it works

### The rowspan workaround

This is the single thing to understand before editing anything below.

**react-pdf has no `rowspan`, no `colspan` and no `border-collapse`.** A table
is nested `<View>`s and nothing more. Every "spanning" cell here is therefore a
fixed-height box sitting *beside* a stack of fixed-height rows:

```
┌────────┬────────┬───────┬─────┬─────┐   ROW_H
│        │        │ min.  │ ... │ ... │   ROW_H
│ ITEM 1 │ HEAT   │ max.  │ ... │ ... │   ROW_H   ← spanning cells are
│ (4×11) │ (4×11) │ H     │ ... │ ... │   ROW_H     height: ROW_H * n
│        │        │ P     │ ... │ ... │
└────────┴────────┴───────┴─────┴─────┘
```

Alignment is arithmetic, not layout: the spanning cell's `height` must equal
`ROW_H × (number of sub-rows)`. That is why `ROW_H = 11` is a single module
constant rather than per-table padding, and why no cell in the two result
tables uses padding to set its height. Chemistry spans 4 sub-rows
(`min. / max. / H / P`), mechanical spans 3 (`min. / max. / P`).

The mechanical table is harder: its two *varying* column groups are not
adjacent — the orientation (`O`) and specimen (`S`) columns sit between the
label stack and the measurement stack. So it renders as **two independent
stacks of three rows**, which line up only because both use `ROW_H`. Change one
and the certificate silently prints misaligned — with the min./max. limits
sitting against the wrong measurement. That failure is not a cosmetic bug; the
document is evidence.

`wrap={false}` on each item row keeps a stack from being split across a page
break, which would break the alignment in a different way.

### Why every cell paints four borders

Ordinarily (see `primitives.tsx`) a cell draws only its right and bottom edge,
because with no `border-collapse` adjacent borders double up. This file does the
opposite: `s.cell` sets `borderWidth: 0.5` on all four sides and accepts the
doubling. At 0.5 pt the doubled rule still reads as one hairline on paper, and
the win is that **every cell is independently positioned** — which is exactly
what the stacked-span layout needs, since cells in different stacks are not
siblings and cannot rely on a neighbour to draw their shared edge.

This is also why the file does not import from `primitives.tsx` and carries its
own `fmtDate` and value formatter. That divergence is deliberate; do not
"unify" it without re-rendering both tables.

### Two column layouts, chosen by the data

`hasImpact` is computed once from whether *any* item has impact results, and it
swaps the entire `W` width table for the mechanical section. Impact testing
(Charpy) is only specified on some material grades, and when it is absent the
five impact columns collapse to `0%` and the remaining columns widen to take
the space. Both variants must total 100%.

The group-header rows do percentage arithmetic on those strings —
`parseFloat(W.meas) * ((M.ys + M.ts + M.el + M.ra) / 56)` — to make a header
span exactly the sub-columns beneath it. The `56` is the sum of the `M`
proportions and is hardcoded in two places; changing any `M` value means
changing it there too.

### Value formatting

`v(val, minDec, maxDec)` renders to `maxDec` places then strips trailing zeros
back down to `minDec`. `0.170` prints as `0.17`, but `0.00` stays `0.00` — an
analyst reads the number of decimals as a statement about the measurement's
precision, so collapsing it to `0` changes the claim. Different call sites pass
different precisions on purpose: chemistry limits use `(0,3)`, chemistry results
`(2,3)`, tensile results `(2,2)`, and hardness/impact `(0,0)` because those are
whole-number readings.

Absent **limits** print `--` (meaning "the specification sets none"); absent
**results** print empty. Those are different statements and should stay
different.

### Result lookup is by keyword, not by key

Mechanical properties are found with a substring match on `propertyName` —
`"yield"`, `"tensile"`, `"elongation"`, `"reduction"`, `"hardness"` — because
the property names entered vary by specification. Hardness is special: three
Brinell readings are stored as three separate rows all matching `"hardness"`,
so `hbAll` filters rather than finds, and `hbAll[0..2]` fill the `(1) (2) (3)`
columns.

Chemistry is looked up the other way, by building a `Map` from `element` name to
result and reading it once per column.

## Domain notes

- **MTC** — Mill Test Certificate. Issued here under **EN 10204:2004 3.1**,
  which specifically means the manufacturer's own QA department certifies the
  results and signs for them (as opposed to 3.2, where an independent inspector
  countersigns). The standard is printed in the title block because it tells the
  reader what the signature is worth.
- **Heat number** — identifies the melt of steel. The traceability key that ties
  this certificate to physical pipe, and to every other document that moves the
  material. Never reformat it.
- **H vs P** — in the chemistry table, `H` is the result measured on the *heat*
  (a sample of the molten batch) and `P` the result measured on the *finished
  product*. They can legitimately differ, which is why both are printed.
- **YS / TS / EL / RA / HB** — yield strength, tensile strength, elongation,
  reduction of area, Brinell hardness. `O` is specimen orientation, `S` its
  form; the Legends block spells these out **on the certificate** because the
  reader is often an inspector holding only the paper.
- **F1 and CEQ** — derived weldability figures (`F1 = Cu+Ni+Cr+Mo`, `CEQ` the
  carbon-equivalent formula printed under the table). They arrive as ordinary
  rows in `chemicalResults`, so they are columns like any element.
- **Witnessed by** — a **TPI** (third-party inspection) agency representative
  who watched the tests. Blank when the order carried no TPI requirement.
- **Format: NPFI/QC/001-Rev.N** — the controlled-document reference in the
  footer. `revision` is the certificate's own revision number; a re-issued
  certificate must show it.

## Gotchas and constraints

- **`borderWidth: 0` throws at render time.** react-pdf resolves `borderWidth`
  through its shorthand parser, `0` is falsy, and it ends up throwing
  `Invalid border width: undefined` — killing the whole PDF, not just the cell.
  To remove one edge, override the side after the shorthand, the way `s.formula`
  does with `borderTopWidth: 0` (side-specific widths take a different code
  path and accept `0` fine).
- **Column widths must total 100% and nothing checks it.** They are strings
  (`"4%"`), summed with `parseFloat`, in two separate variants. TypeScript is
  blind to all of it. An over-wide row does not error — it silently overflows
  the page edge, and only a real render shows it.
- **`chemElements` comes from item 1 only.** The route reads
  `items[0].chemicalResults`, on the assumption that every item on a certificate
  is reported against the same specification. An element recorded on item 2 but
  not item 1 gets **no column at all** and vanishes from the certificate without
  warning. If mixed-spec certificates ever become a thing, this is the first
  place that breaks.
- **The tables assume the heights agree.** `ROW_H` is load-bearing in three
  places (chemistry `× 4`, mechanical `× 3`, and every `height={ROW_H}` sub-row).
  Never set a height on one of these cells by hand.
- **`items` is `Record<string, unknown>[]`.** Field access goes through the `g()`
  helper, so a renamed Prisma field does not fail to compile — it prints an
  empty cell. The route casts the Prisma result with `as never` to get past
  this, which means the query and the document are only connected by
  convention. Grep both when renaming a field.
- **A wide certificate spills to page 2 and nobody warns you.** The page is A4
  landscape (842 × 595 pt at 72 dpi, matching the `@page` rule the old Chromium
  version used) and the layout is tuned to fill it. Adding a chemistry element
  or a column narrows everything; check a real render with a many-element grade.
- **The "✓ on Finished Material" tick is hardcoded**, as is the certification
  statement. Neither is driven by data. If a certificate ever needs to be issued
  on raw material, that is a code change.
- **`revision ?? 0`** — a null revision prints `Rev.0`, not a blank.

## Related

- `src/app/api/mtc/certificates/[id]/pdf/route.tsx` — the only caller: queries,
  absolutises the logo URLs, computes `chemElements`, and calls `renderToBuffer`.
  Sends `Cache-Control: no-store` (a certificate must never be served stale).
- `src/lib/pdf/mtc-certificate-pdf.test.ts` — renders with and without impact
  results (both column variants), with no chemistry, with no items, and with
  notes/remarks absent. It asserts only the `%PDF` magic bytes, so it catches a
  render *crash*, not a misalignment — the alignment guarantee is `ROW_H`, not
  the test.
- `src/lib/pdf/primitives.tsx` — the shared helpers this file deliberately does
  not use, and why.
- `prisma/schema.prisma` — `MTCCertificate`, `MTCItem`, and the three result
  tables.
