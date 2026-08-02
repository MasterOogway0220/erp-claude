# src/components/shared/size-select.tsx

> Pipe size picker backed by `SizeMaster`, returning the row not just the label.

## Why this exists

Pipe sizes differ from fitting and flange sizes: they are real database rows
with OD, wall thickness and weight, and `QuotationItem.sizeId` is a foreign key
to them. Picking one has to yield the record, because the derived fields
(OD, WT, weight per metre) come from it.

## What it does

A `SmartCombobox` over `SizeMaster` rows, calling back with the selected row.

## How it works

Selecting a size gives the caller the whole record, so the form can populate
OD, WT and NPS as read-only derived fields.

Free text is still allowed. When a user types a size instead of picking one,
the caller **clears the derived fields** — they no longer apply and would
otherwise print stale values on the quotation.

## Domain notes

Sizes are filtered by `PipeType` (`CS_AS` / `SS_DS`) because stainless and
duplex use `S`-suffixed schedules (`SCH 40S`) with different wall thicknesses.

## Gotchas and constraints

- **Pipes only.** Fittings and flanges use string pools from
  `fitting-flange-sizes.ts` and have no `sizeId`.
- `SizeMaster` rows are updated in place, never deleted, because of the FK.

## Related

- `src/lib/masters/spec-import.ts` — `parsePipeSizes`.
- `src/lib/weight-calculation.ts`
- `prisma/schema.prisma` → `SizeMaster`.
