# src/lib/pdf/quotation-nonstandard-template.ts

> The non-standard quotation, portrait — for items that do not fit the
> structured pipe/fitting/flange model.

See [README.md](./README.md) for the shared pattern.

## Why this exists

Standard quotations describe catalogue items: a product, a material, a size
from a known pool. Plenty of what the company quotes does not fit — fabricated
assemblies, bought-in specials, valves, anything described in prose.

Those need a free-text description rather than structured columns, and a
portrait layout because the description is the widest thing on the page.

## What it does

Portrait HTML with a description-led item table instead of the standard
format's fixed columns.

## How it works

Same letterhead, totals and terms as the standard template. The item table is
the difference: a free-text item description carrying whatever the salesperson
typed, with structured fields alongside where they exist.

Portrait at **210 × 320 mm** — taller than A4 so the footer lands on the same
page rather than orphaning onto a second sheet.

## Domain notes

`quotationCategory` is `STANDARD` or `NON_STANDARD`, chosen at creation, and it
determines which create page, which PDF template and which edit route apply
throughout. It is not a cosmetic flag.

## Gotchas and constraints

- **Two create pages exist in parallel** — `create/standard` and
  `create/nonstandard`. A change to shared quotation behaviour usually needs
  making in both; several past defects came from fixing only one.
- Free text means no validation. A description can be any length and will
  reflow the table.
- The custom page height was tuned to this document's footer. Adding content
  above it can push it over.

## Related

- `src/app/(dashboard)/quotations/create/nonstandard/page.tsx`
- `src/lib/pdf/quotation-standard-template.ts` — the sibling.
