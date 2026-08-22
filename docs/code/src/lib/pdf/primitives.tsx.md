# src/lib/pdf/primitives.tsx

> The shared building blocks every react-pdf document uses: formatters, table
> cell borders, and the base StyleSheet.

See [README.md](./README.md) for the shared PDF pattern.

## Why this exists

Two PDF pipelines run in this codebase: HTML strings rendered by Chromium
(`render-pdf.ts`, 13 routes) and react-pdf documents (`quotation-pdf.tsx`).
react-pdf is the direction of travel — no browser binary, no 300 MB–1 GB of
memory per render, no Chromium in the Docker image — but it takes no HTML and no
CSS, so each document is a re-authoring job rather than a switch.

These helpers were written for the quotation PDF and proved out there. They are
lifted here so each document migrating off the HTML pipeline reuses them instead
of rediscovering the same react-pdf quirks. `quotation-pdf.tsx` imports from
here too, so there is one copy rather than a drifting duplicate.

## What it does

**Formatters** — all three return `""` rather than `"NaN"` or `"Invalid Date"`,
because a malformed value must not print as garbage on a document that goes to a
client:

| Export | Output |
|---|---|
| `fmtDate(d)` | `dd/mm/yyyy` |
| `fmt(v, dec = 2)` | plain fixed-decimal |
| `fmtIN(v, dec = 2)` | Indian digit grouping — `12,34,567.89`, not `1,234,567.89` |

**Table cell styles** — `CELL`, `CELL_END`, `CELL_TOP`, `CELL_BOLD`,
`CELL_BOLD_END`, `CELL_BOLD_TOP`, plus `GREY` for header fills.

**Layout** — `PAGE_PADDING` and the `base` StyleSheet.

## How it works

react-pdf has no `<table>`. A table is nested `<View>`s, and a border drawn on
every cell doubles up where cells meet — a 0.5pt rule renders as 1pt down the
middle of the grid. The `CELL` family solves that the way print layout always
does: each cell draws only its right and bottom edge, and the `_TOP` / `_END`
variants add the missing outer edges on the first row and last column.

`fmtIN` exists because `toFixed()` and the default `toLocaleString()` both group
in thousands. Indian invoices group as lakhs and crores, and a total that reads
`1,234,567.89` on an Indian tax invoice looks wrong to the person paying it.

## Domain notes

Money on these documents is INR unless the customer is international. The Indian
grouping is not cosmetic — it is what the accounts department reconciles
against.

## Gotchas and constraints

- **Not CSS.** react-pdf supports a flexbox subset: no `position: sticky`, no
  grid, no `table`, a reduced property set. Styles that look like CSS are not.
- Borders are in points, and react-pdf renders hairlines inconsistently below
  ~0.5pt.
- Changing `GREY` or the `CELL` borders changes **every** react-pdf document at
  once. That is the point, but check the others before adjusting one.

## Related

- `src/lib/pdf/quotation-pdf.tsx` — the first consumer.
- `src/lib/pdf/issue-slip-pdf.tsx` — the first document migrated off the HTML
  pipeline using these.
- `src/lib/pdf/render-pdf.ts` — the Chromium pipeline these are moving away from.
