# src/lib/pdf/quotation-standard-template.ts

> The standard quotation, landscape — the company's primary client-facing
> document, matching their QTN-Rev.2 paper format.

See [README.md](./README.md) for the pattern all templates share.

## Why this exists

This is the document the business runs on. The client supplied their existing
format and the output has to match it, because their customers have been
receiving that layout for years and their own purchasing teams read it by
position.

## What it does

Exports a function taking quotation data plus `CompanyInfo`, returning
landscape HTML.

Column order, fixed by the client's format:

```
S/N | Product | Specification | Dim. | Add. Spec. | Size | Length | Ends |
Qty | Unit | Unit Rate | Amount | Delivery | Remark/Material Code
```

## How it works

Renders letterhead, the client and inquiry block, the item table in the order
above, then totals, amount in words and terms.

**Dim.** is the dimensional standard (`ASME B36.10`, `ASME B16.5`). It prints
`-` when the material is explicitly dimensionless — IS-standard ERW pipe and
the API 5L PSL grades — which is the client's own convention, not missing data.

**Size** goes through `displaySizeLabel`, so a line with no stored label still
prints a size reconstructed from NPS and schedule.

**Inquiry No.** prints exactly as entered. It used to go through
`displayInquiryNo`'s digit filter, but that hid legitimate entries the sales
team expected on the document; the filter now guards only the PDF filename.

There are deliberately **no OD or WT columns** — the client's format identifies
pipe by nominal bore and schedule, not by measured dimensions.

### `REGRET` and `QUOTED` in the price columns

Two different words replace a number in the Unit Rate and Amount columns, and
they are not alternatives to each other:

- **`QUOTED`** is document-wide. The `"UNQUOTED"` variant is the *technical*
  copy of the offer — the same items, with every price replaced by the word
  `QUOTED`, sent to a client's engineering department while the commercial
  copy goes to purchasing.
- **`REGRET`** is per line. It marks an item the company declines to quote:
  the enquiry listed twelve items, we can supply nine, and the quotation still
  lists all twelve so it matches the client's enquiry line for line.

The per-item check runs **first**, so a regretted line reads `REGRET` on both
the commercial and the technical copy — on the technical copy `QUOTED` would
otherwise imply a price exists, which is the opposite of what is being said.
A regretted line stores amount `0`, so it drops out of the total arithmetic
with no special case in the sum.

That precedence is not written here: it comes from `priceCellWord` in
`src/lib/quotations/display.ts`, shared with the other two renderers so the
downloaded and emailed copies cannot disagree. This template only decides the
markup — the word is bolded in the rate cell and plain in the amount cell.
`src/lib/pdf/quotation-rate-column.test.ts` renders this template and asserts
what lands in those two columns.

## Domain notes

- **Add. Spec.** — additional specification, e.g. `NACE MR0175`, `IBR`,
  `CHARPY`. Requirements beyond the base material grade, drawn from
  `AdditionalSpecOption`.
- **Ends** — how the item terminates: `BE` bevelled, `PE` plain, `BW`, `SW`,
  `NPT`, or for flanges `RF` / `RTJ`.
- **Rev.** — quotations are revised rather than edited once issued; the header
  carries the revision number.

## Gotchas and constraints

- **Landscape, 297 × 230 mm** — taller than A4 landscape so the table and terms
  fit one page. Adding a column risks overflow.
- **The column order is the client's**, not a preference. Changing it changes
  their document.
- Unpriced lines (`unitRate` `NULL`) print blank rather than `0` — the
  formatters return `""` for a non-number — and the price gate stops those
  reaching approval anyway. A line deliberately quoted at zero prints `0.00`,
  which is the point of storing it as a real `0`.

## Related

- `src/lib/quotations/display.ts` — the two display helpers.
- `src/lib/pdf/quotation-pdf.tsx` — the parallel react-pdf implementation.
- `src/app/api/quotations/[id]/pdf/route.tsx`, `email/route.tsx`.
