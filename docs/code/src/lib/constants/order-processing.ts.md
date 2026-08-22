# src/lib/constants/order-processing.ts

> The picklists for the order-processing screen: lab tests, NDT methods, TPI
> and PMI types, coating sides, and processing statuses.

## Why this exists

When a sales order is processed, each line is annotated with what quality work
it needs. Those options are fixed vocabulary the client's QA team uses, and
they appear in the processing form, the warehouse intimation, the inspection
offer and the dispatch dossier.

They are constants rather than a master table deliberately: the list changes
when the *standards* change, not when a user wants it to, and a typo in a test
name propagates onto a certificate sent to a client.

## What it does

| Export | Contents |
|---|---|
| `LAB_TESTS` | 11 destructive/metallurgical tests. |
| `NDT_TESTS` | DP, MP, UT, Radiography. |
| `TPI_TYPES` | Third-party/client QA vs in-house QA — the **per-item** choice. |
| `ORDER_INSPECTION_TYPES` | The same two values as the **order-level** choice ("Option 1 — under TPI / Client QA", "Option 2 — under NPIPE in-house QA"). Stored on `SalesOrder.orderInspectionType` and used as the default for every item under it. |
| `PMI_TYPES` | Internal, under witness, both. |
| `COATING_SIDES` | Inside, outside, both. |
| `PROCESSING_STATUS` | `UNPROCESSED` → `PROCESSING` → `PROCESSED`. |
| `ITEM_PROCESSING_STATUS` | `PENDING` → `PROCESSED`. |

All `as const`, so values are literal types.

## How it works

Each list is `{ value, label }` — `value` stored, `label` displayed. The split
matters because the labels are long and specific (`"IGC Practice 'E' Test With
20X-250X Mag."`) and must not end up in the database, where they would be
compared against and eventually mistyped.

`OrderProcessingItem` stores multi-select choices (`ndtTests`,
`requiredLabTests`) as JSON in `LongText` columns rather than join tables —
consistent with `moduleAccess`, and the same caution applies: parse
defensively.

## Domain notes

The lab tests are what a mill or independent lab performs on a heat of steel:

- **Chemical** — composition, confirming the grade.
- **Tensile / Bend / Flattening / Flaring** — mechanical, per the product spec.
- **IGC Practice 'E'** — Intergranular Corrosion to ASTM A262 Practice E, for
  stainless in corrosive service. The "20X-250X Mag." variant requires
  microscopic examination.
- **Hardness**, **Impact** (Charpy, for low-temperature toughness),
  **Macro/Micro** — metallurgical structure.

NDT is **non-destructive**, done on the finished item:

- **DP** dye penetrant, surface cracks. **MP** magnetic particle, surface and
  near-surface. **UT** ultrasonic, wall thickness and internal flaws.
  **Radiography** X-ray of welds.

**PMI** — Positive Material Identification, a handheld alloy analyser
confirming the material matches its certificate. "Under witness" means the TPI
agency watches.

## Gotchas and constraints

- **These values are stored in the database.** Changing a `value` orphans
  existing rows; changing a `label` is safe.
- **`STANDARD_CHARGES`-style filtering does not exist here** — every entry is
  offered.
- The `IMPACT` lab test is the Charpy test the client asked about adding as an
  additional spec — related concept, different mechanism (`AdditionalSpecOption`
  is a free-form master; this is a fixed picklist).

## Related

- `prisma/schema.prisma` → `OrderProcessingItem`.
- `src/app/api/sales-orders/[id]/processing/route.ts`
- `src/components/order-wizard/ProcessStep.tsx`
- `src/lib/quality/qap.ts` — reads the per-item flags these populate.
