# src/lib/masters/spec-import.ts

> Parsers for the client's product-master Excel files. Two completely different
> layouts hide behind similar-looking spreadsheets, and reading one as the
> other silently corrupts the master.

## Why this exists

The client maintains their catalogue in Excel and hands over revised files
periodically. Those files must be turned into `ProductSpecMaster` rows.

**The trap this file exists to prevent:** the fitting and flange files look
like ordinary tables but are not. They are *sectioned column pools*. Within a
section, the Product, Specification, Size and Ends columns are four independent
lists that merely happen to share rows. Row alignment carries no meaning.

Read row-wise, this spreadsheet:

| Product | Specification | Size |
|---|---|---|
| C.S. CONC. REDUCER | ASTM A234 GR. WPB | 1"NB X SCH STD - 0.5"NB X SCH STD |
| C.S. ECCN. REDUCER | ASTM A234 GR. WPC | 1"NB X SCH STD - 0.5"NB X SCH 40 |
| | ASME SA234 GR. WPB | 1"NB X SCH STD - 0.5"NB X SCH XS |

...appears to say a concentric reducer comes only in WPB at one size. It
actually says **any** of those products is available in **any** of those
specifications at **any** of those sizes — a cross product, not three tuples.

The legacy `prisma/seed.ts` read them row-wise and produced a master full of
mis-paired product/material combinations that looked plausible and were wrong.
That is the failure mode: it does not crash, it quietly populates dropdowns
with products the company cannot supply, and quotations get issued against
them.

Only the PIPES file and the pipe-size files are genuinely row-wise.

## What it does

| Export | For | Returns |
|---|---|---|
| `parsePipeSizes(path)` | `PIPES SIZE MASTER *.xlsx` | `PipeSizeRow[]` — label, OD, WT, weight, NPS, schedule |
| `parseNps(label)` | — | Numeric NPS from `6"NB X SCH 40`, handling `1/2"` fractions |
| `parsePipeSpecs(path)` | `PRODUCT SPEC MASTER - PIPES 2.xlsx` | `PipeSpecRow[]` — row-wise product/material/dim |
| `parseSectioned(path)` | fitting + flange files | `SectionedFile` — sections of pooled columns |
| `sectionDim(section)` | — | The section's single dimensional standard, or throws |
| `toProductSpecPairs(file)` | fittings, B16.5 flanges | Every product × spec, deduped |
| `toFlangeSpecRows(file)` | B16.47 flanges | Every product × spec × end, carrying its standard |

## How it works

### Section detection

`parseSectioned` starts a new section on any row whose Product cell is
non-empty *after* an empty one. Sections are separated by a blank row in the
source. Within a section each non-empty cell is appended to its own list —
products, specs, sizes, ends grow independently.

### `toProductSpecPairs` vs `toFlangeSpecRows`

`toProductSpecPairs` emits the product × spec cross product, deduped across
sections. The dedup matters for the threaded-fitting file, which repeats the
same products under both a 2000# and a 3000/6000# section.

`toFlangeSpecRows` additionally carries the dimensional standard and the end
finish, because for B16.47 those vary **per section** rather than per file. It
emits one row per product × spec × **end**.

### Why `ends` became a pool

Originally `ends` was a single file-level constant — correct for fittings,
where a whole file is butt-weld (`BW`), socket-weld (`SW`) or threaded (`NPT`).

ASME B16.47 broke that. In that file the Ends column is a pool like every
other: **Series A sections list `RF` and `RTJ`; Series B sections list `RF`
alone.** So `PoolSection` gained its own `ends: string[]`, and the flange rows
encode the rule in data — Series A yields two rows per pair, Series B one.
The `SectionedFile.ends` file-level constant is still there for the fitting
files, which genuinely have one.

### `sectionDim` throws on purpose

If a section's sizes disagree about their dimensional standard, that means the
file layout has changed in a way this parser does not understand. It raises
rather than silently stamping the first standard onto every row — a mis-stamped
standard prints on the quotation and is a commercial error.

## Domain notes

- **NB / SCH** — Nominal Bore and Schedule. A pipe is identified by bore and
  wall thickness class, not outside diameter: `6"NB X SCH 40`.
- **MTC / TPI** — Mill Test Certificate; Third Party Inspection. Not parsed
  here but pervasive elsewhere.
- **Dimensional standard** — the geometry spec. `ASME B36.10` (carbon/alloy
  pipe), `B36.19` (stainless), `B16.9` (butt-weld fittings), `B16.11`
  (socket-weld/threaded), `B16.5` (flanges ≤ 24"), `B16.47` (flanges 26"–60").
- **B16.47 Series A vs B** — two incompatible large-flange standards covering
  the same nominal sizes with different bolt circles and thicknesses. They
  share identical size labels, so **a size can never tell you which series it
  is**. That is why `flangeDimForSize` returns `null` for 26"+ sizes rather
  than guessing.
- **RF / RTJ** — Raised Face and Ring Type Joint, two flange sealing faces.
  Series A offers both; Series B is RF only. Client-stated, and confirmed in
  the file.
- **Reducing fittings take two sizes** — a reducer or unequal tee is quoted
  large-end to small-end: `6"NB X SCH 40 - 4"NB X SCH 40`. The BW-2 file's
  size pool is 5,626 such pairs, and the left NPS always exceeds the right.
- **`-` in the Dimension column is meaningful**, not missing data. It means the
  material is explicitly dimensionless — IS-standard ERW pipes and the API 5L
  PSL grades. It prints as `-` on the quotation, which is the client's own
  convention. `parsePipeSpecs` maps it to `null`.

## Gotchas and constraints

- **Never read a sectioned file row-wise.** This is the whole point of the
  file.
- **The tests are count-locked** and will fail when the client ships a revised
  file. That is the alarm working, not a broken test — re-verify the layout
  assumptions, then update the counts. Current: PIPES 277 rows, BW 668 pairs,
  BW-2 296 pairs over a 5,626-size pool, SW 660, THRD 858, B16.5 396 pairs,
  B16.47 396 rows (264 Series A + 132 Series B).
- **`sheetRows` reads only the first worksheet** and skips row 0 as a header.
- **The B16.47 file's single sheet is named `FLANGE ASME B16.47-A`** but holds
  both series. Do not trust the sheet name.
- **Only 14 of the pipe rows changed** between `PIPES.xlsx` and `PIPES 2.xlsx`
  (API 5L PSL-1/PSL-2 grades on C.S. LSAW PIPE). The old file is kept on disk
  for reference; the seeder reads `PIPES 2`.

## Related

- `src/lib/masters/spec-import.test.ts` — count locks and the layout assertions.
- `scripts/seed-new-masters.ts` — the only production consumer; wipes and
  reloads `ProductSpecMaster`.
- `scripts/gen-size-constants.ts` → `src/lib/fitting-flange-sizes.ts` — turns
  the same files into the size pools the quotation form offers.
- `new master/` — the source spreadsheets.
