# src/lib/location-tag.ts

> Joins warehouse location parts into a single readable tag.

## Why this exists

Stock is stored at a physical address inside a warehouse — zone, rack, bay,
shelf — and every level below the warehouse is optional. A small yard has a
warehouse code and nothing else; a racked warehouse uses all five.

Building the string by hand produces `WH01--R1--S3` when the middle levels are
absent, which is unreadable on a pick list and unsearchable.

## What it does

`generateLocationTag(warehouseCode, zone?, rack?, bay?, shelf?)` → parts joined
with `-`, empty ones omitted.

```
("WH01", "A", "R1", "B2", "S3")   → "WH01-A-R1-B2-S3"
("WH01", null, null, null, null)  → "WH01"
("WH01", "A", "", null, "S3")     → "WH01-A-S3"
```

## How it works

`.filter(part => part && part.trim() !== "")` then `.join("-")`. The trim
matters because a form submits a whitespace-only field as `" "`, which is truthy
and would otherwise produce `WH01- -R1`.

Note the third example: a gap in the middle collapses rather than being
preserved positionally. The tag is a human label, not a fixed-width coordinate
— if position ever needs to be recoverable from the string, this is the wrong
function.

## Domain notes

The hierarchy is **Warehouse → Zone → Rack → Bay → Shelf**, coarse to fine, and
sites use as much of it as they need. The tag is what appears on pick lists and
in the stock view, so a storeman can walk to the material.

## Gotchas and constraints

- **Not guaranteed unique.** The name says "unique location tag" but nothing
  enforces it; two warehouses with the same code and layout collide.
- **No escaping.** A part containing `-` produces an ambiguous tag. Location
  codes do not contain hyphens in practice.
- Purely derived — nothing stores it as the source of truth.

## Related

- `prisma/schema.prisma` → `WarehouseLocation`, `InventoryStock`.
- `src/app/(dashboard)/inventory/page.tsx` — displays it.
