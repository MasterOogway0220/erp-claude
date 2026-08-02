# scripts/migrate-warehouse-details-to-heats.ts

> One-off data migration: `WarehouseItemDetail` rows carrying a heat number
> become proper `HeatEntry` records.

## Why this exists

Heat numbers were first captured as a free-text field on warehouse item
details. Once heat-level traceability became a first-class requirement — MTCs
attached per heat, inspection offers listing heats, the dispatch dossier
compiling them — that flat field was not enough.

This backfills the structured records from what was already typed.

## What it does

```bash
source .env && export DATABASE_URL && npx tsx scripts/migrate-warehouse-details-to-heats.ts
```

Reads `WarehouseItemDetail` rows with a `heatNo` and creates `HeatEntry` plus
`HeatMTCDocument` records.

## Domain notes

A **heat** is one batch of molten steel. Every pipe from it carries the same
stamped heat number and shares one Mill Test Certificate. Traceability in this
trade runs through that number: a length of pipe on site can be traced back to
its MTC, and from there to the mill's chemistry and mechanical results.

Promoting it from a text field to a related record is what allows several
documents to reference the same heat, and one MTC to cover many items.

## Gotchas and constraints

- **One-off.** Already run. Re-running would duplicate unless the data has
  since been cleared.
- Needs `DATABASE_URL` exported explicitly — it does not load `.env` itself,
  unlike `seed-new-masters.ts` which imports `dotenv/config`.
- No dry-run mode.

## Related

- `prisma/schema.prisma` → `HeatEntry`, `HeatMTCDocument`,
  `WarehouseItemDetail`, `InspectionOfferItemHeat`.
