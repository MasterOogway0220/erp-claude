# src/lib/business-logic/technical-requirements.ts

> Renders an order-processing configuration as text, so the requirements a
> client imposed on the material reach the people who buy it.

## Why this exists

Order Processing records, per sales-order line, everything the client wants done
to the material beyond product / material / size: third-party inspection and its
witness percentages, lab tests, NDT, PMI, coating, hot-dip galvanising, screwed
ends, colour coding, the specification stencilled on the pipe, and the
specification the product has to comply with.

All of that reached the **warehouse** through the Warehouse Intimation. None of
it reached **purchase**. A `PRItem` carried only `sNo, product, material,
additionalSpec, sizeLabel, quantity, uom, remarks`, and auto-PR generation put
nothing in `remarks` beyond `"For SO <soNo>"`. So an enquiry could go out, and a
vendor purchase order could be placed, for material that cannot meet the
client's inspection, testing, coating or marking requirements — and the
non-compliance surfaced at GRN or at inspection, after the money was committed.

This was ranked **P1** in `ORDER_PROCESSING_GAP_ANALYSIS.txt` ("technical
requirements do not reach procurement").

## What it does

- `formatTechnicalRequirements(source)` → one line per requirement, joined by
  `\n`, or `null` when nothing is required. `null` rather than `""` is
  deliberate: an empty string in the column reads as "requirements were
  considered and there are none", which is a different claim from "not filled
  in".
- `parseStringArray(raw)` → the `ndtTests` / `requiredLabTests` columns as a
  `string[]`. They are `LongText` holding JSON; some early rows hold a bare
  comma-separated list, which is also accepted.
- `TECHNICAL_REQUIREMENT_SELECT` → the field set for a Prisma `select` on
  `orderProcessing`, so a caller cannot fetch half the requirements and render a
  silently incomplete list.

Sample output:

```
TPI: Inspection under TPI/Client QA
VDI inspection: witness 10%
Hydro test: witness 100%
Lab tests: Chemical Test, Impact Test, Other: Corrosion resistance per client spec
NDT: DP Test, Radiography
PMI: Under Witness
Coating: Epoxy (Both)
Hot Dip Galvanising: required
Colour coding: Blue band
Additional spec to comply with: ASTM A312 + client addendum
Stencil on pipe: NACE MR0175
```

## How it works

Codes are mapped to their human labels through the same constants the order
wizard renders (`LAB_TESTS`, `NDT_TESTS`, `TPI_TYPES`, `PMI_TYPES`,
`COATING_SIDES`), so the vendor reads exactly the wording the processor saw. An
unknown code falls back to the raw value rather than being dropped — a code the
constants no longer carry is still a requirement somebody entered.

A flag that is set with no detail still produces a line
("NDT: required (tests not yet specified)"). Saying nothing there would let a
half-filled configuration look like no requirement at all.

## Domain notes

- **TPI** — third-party inspection: an independent agency (or the client's own
  QA) witnesses manufacture and testing. "Inhouse QA" means NPIPE's own QA does
  it instead.
- **VDI / hydro witness %** — what proportion of the lot the inspector attends
  in person. 10% and 100% are different commercial propositions for a vendor.
- **NDT** — non-destructive testing: DP (dye penetrant), MP (magnetic particle),
  UT (ultrasonic), radiography.
- **PMI** — positive material identification, proving the alloy is what the
  certificate says.
- **Stencil spec vs compliance spec** — `additionalPipeSpec` is what is painted
  on the pipe; `additionalSpec` is what the product must actually meet. They are
  routinely different and are stored separately for that reason.

## Gotchas and constraints

- The text is a **snapshot taken when the PR was created**. Reopening the item
  and changing its processing does not rewrite PRs already raised — deliberate,
  because a PR that has been sent to vendors must not change under them, but it
  does mean a late change needs the PR reissued.
- `formatTechnicalRequirements` is presentation, not a contract: do not parse it
  back. Read `OrderProcessingItem` if you need the values.

## Related

- Written to `PRItem.technicalRequirements` by
  `src/app/api/sales-orders/[id]/allotment/route.ts` and
  `src/lib/business-logic/auto-pr-generation.ts`.
- Displayed by `src/app/(dashboard)/purchase/requisitions/[id]/page.tsx` and
  `src/app/(dashboard)/purchase/rfq/[id]/page.tsx`; pre-fills
  `PurchaseOrder.specialRequirements` in
  `src/app/(dashboard)/purchase/orders/create/page.tsx`.
- Source model: `OrderProcessingItem` in `prisma/schema.prisma`.
- Test: `src/lib/business-logic/technical-requirements.test.ts`.
- `parseStringArray` is also the reader for `LabLetter.testIds` / `testNames`,
  which are stored the same way.
- Migration: `prisma/migrations/20260822090000_order_processing_gaps`.
