# scripts/gen-size-constants.ts

> Generates `src/lib/fitting-flange-sizes.ts` from the Excel masters.

## Why this exists

Fitting and flange sizes are strings on a document, not rows in a table, and
there are ~7,500 of them. Baking them into a constant at build time makes the
dropdowns instant and removes a query per keystroke.

## What it does

```bash
npx tsx scripts/gen-size-constants.ts
```

Reads the fitting and flange spreadsheets and writes
`src/lib/fitting-flange-sizes.ts` — data blocks and helper functions together.

## How it works

### The helpers live here, not in the output

`HELPERS` is a template string containing `getFittingEnds`,
`getFittingSizeOptions`, `getFlangeSizeOptions`, `flangeDimForSize` and
`inferItemCategory`. They are written into the generated file verbatim.

**Editing them in the generated file is lost on the next run.** Edit them here.
Note they are inside a template literal, so regexes need doubled backslashes —
`/^(S\\.S\\.|D\\.S\\.)/`.

### Pool derivation

Flange pools split by *type*, not just material class: bored types (weld neck,
socket weld, slip on) carry a schedule in their size, plain types (blind, lap
joint) do not, threaded are separate. Material class splits the bored pool
because stainless uses `S`-suffixed schedules.

B16.47 forms one pool of 66 sizes, appended to weld neck and blind only —
the two product types that standard covers.

Reducing butt-weld fittings form `BW_REDUCING`, 5,626 two-size pairs.

### It fails loudly rather than unioning

Two guards, both deliberate:

- **Mixed types in one section** — a section's products must all be the same
  flange type, since sizes are a section-level pool and a mixed section cannot
  be split.
- **Pools that should be identical but are not** — `PLAIN` and `THREADED`
  collapse four material-class sections into one list, valid only while those
  sections agree. A silent union would offer a product sizes it cannot take.

Same for BW-2: all four sections must share one size pool, and every entry must
be a `large - small` pair.

## Gotchas and constraints

- **The output is 286 KB / ~7,970 lines** and ships to the browser. Most of it
  is `BW_REDUCING`.
- **Run after `seed-new-masters.ts`**, and update the count locks in
  `spec-import.test.ts`.
- Reads the spreadsheets directly, so it needs `new master/` present. No
  database.

## Related

- `src/lib/fitting-flange-sizes.ts` — the generated output.
- `src/lib/masters/spec-import.ts` — the parsers.
- `scripts/seed-new-masters.ts`
