# prisma/seed-offer-terms.ts

> Loads the quotation terms and conditions from the client's Excel master.

## Why this exists

Quotations carry a block of standard terms — payment, delivery, validity,
material origin, inspection. They differ between domestic and export, and the
client maintains the wording in a spreadsheet.

## What it does

Reads `TERMS & CONDITION MASTER.xlsx` and upserts `OfferTermTemplate` rows.
`npx tsx prisma/seed-offer-terms.ts`.

## How it works

**Upserts on `(termName + quotationType)`**, so re-running after the client
revises the wording updates in place rather than duplicating. That key is why
the script is safe to run repeatedly, unlike `seed.ts`.

Terms load onto a quotation at creation, and the user can then edit them per
document — the template is a starting point, not a constraint.

## Domain notes

Term values are single-line and edited with an `Input`, not a `Textarea` — a
deliberate UI decision, since they print as single lines on the quotation.

Customer-specific overrides exist (`CustomerTermDefault`) and take precedence
over these templates.

## Gotchas and constraints

- **Changing a `termName` creates a new row** rather than renaming, because it
  is half the upsert key.
- Editing terms on an existing quotation does not affect the template, and
  vice versa — issued documents are frozen.

## Related

- `prisma/schema.prisma` → `OfferTermTemplate`, `QuotationTerm`,
  `CustomerTermDefault`.
- `src/app/api/offer-term-templates/route.ts`
