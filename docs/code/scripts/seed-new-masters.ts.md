# scripts/seed-new-masters.ts

> Reloads `ProductSpecMaster` and `SizeMaster` from the client's Excel files.
> **The correct way to load product masters.**

## Why this exists

The client revises their catalogue in Excel and hands over new files. This
turns them into database rows.

It replaced the master-loading half of `prisma/seed.ts`, which read the
pool-layout spreadsheets row-wise and produced mis-paired product/material
combinations — a catalogue full of items the company cannot supply. That is why
`ProductSpecMaster` is **wiped and reloaded** rather than merged: the legacy
rows were not worth keeping.

## What it does

```bash
npx tsx scripts/seed-new-masters.ts --dry-run   # report only
npx tsx scripts/seed-new-masters.ts             # apply
```

Loads pipes, fittings (butt-weld, reducing butt-weld, socket-weld, threaded)
and flanges (B16.5, B16.47 Series A and B) from `new master/`.

Current result: **PIPES 282, FITTINGS 2,482, FLANGES 792, PLATES 1**.

## How it works

### Sizes are updated in place, never deleted

`QuotationItem.sizeId` is a real foreign key. Deleting and reinserting size
rows would orphan every historical quotation line. So `updatePipeSizes` renames
labels in place (`1/2"` → `0.5"`) and creates only what is genuinely new.

### Products are wiped and reloaded — with two exceptions

`ProductSpecMaster` is safe to wipe because document items copy product and
material as **strings**, not FKs. Two things survive:

1. **Categories with no source file** — `PLATES`, `VALVES`. The wipe is scoped
   to `PIPES / FITTINGS / FLANGES`.
2. **Hand-entered rows.** The script only ever writes product, material,
   category, ends and dimensional standard, so a row carrying a `size`,
   `specification`, `grade` or `length` was typed by a user in Masters →
   Products. Those are preserved, and the file's own copy of that
   product/material pair is dropped to avoid creating a twin on every reload.
   Six such rows exist today and are listed in the output.

### Per-file handling

- **Pipes** — row-wise (`parsePipeSpecs`), from `PRODUCT SPEC MASTER - PIPES
  2.xlsx`.
- **Fittings** — sectioned pools (`parseSectioned` + `toProductSpecPairs`).
  `BW FITTING-2` extends rather than replaces `BW FITTING`; no product appears
  in both.
- **B16.5 flanges** — one standard for the whole file.
- **B16.47 flanges** — `toFlangeSpecRows`, because the standard *and* the end
  finish vary per section. Series A yields RF and RTJ rows; Series B is RF only.

### Dimensional standards are looked up by name, not code

The legacy seed wrote `ASME_B36_10` while the derivation here yields
`ASME_B36.10`. Keying on code created a duplicate row for the same standard.
Two orphaned duplicates from that era still exist.

## Gotchas and constraints

- **Always `--dry-run` first.** It reports what would be deleted and which
  hand-entered rows are preserved.
- **Regenerate the size constants afterwards** —
  `npx tsx scripts/gen-size-constants.ts` — or the quotation dropdowns will not
  offer new sizes.
- **Update the count locks** in `src/lib/masters/spec-import.test.ts`. They
  fail deliberately when the client ships a revised file.
- Runs against whatever `DATABASE_URL` points at, which is production.
- Not incremental: full wipe and reload every time.

## Related

- `src/lib/masters/spec-import.ts` — the parsers, and the row-wise trap.
- `scripts/gen-size-constants.ts` — run after.
- `new master/` — the source spreadsheets.
