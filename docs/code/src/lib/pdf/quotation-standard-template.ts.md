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
- Unpriced lines print blank rather than `0`; the price gate stops those
  reaching approval.

## Related

- `src/lib/quotations/display.ts` — the two display helpers.
- `src/lib/pdf/quotation-pdf.tsx` — the parallel react-pdf implementation.
- `src/app/api/quotations/[id]/pdf/route.tsx`, `email/route.tsx`.
