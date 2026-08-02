# src/lib/fitting-flange-sizes.ts

> **GENERATED — do not hand-edit.** The size pools offered in fitting and
> flange dropdowns, plus the helpers that route a product to the right pool.

## Why this exists

Pipe sizes live in `SizeMaster` (a real table, because quotation items hold a
foreign key to a size row). Fitting and flange sizes do not — they are plain
strings on the item, and there are far more of them.

Rather than a table and a query per keystroke, they are baked into a constant
at build time from the same Excel masters the product catalogue comes from.
The dropdown is then instant and works with no database round trip.

**This file is written by `scripts/gen-size-constants.ts`.** Editing it
directly is lost on the next run. Both the data blocks *and* the helper
functions at the bottom are overwritten — the helpers live in the generator's
`HELPERS` template string.

## What it does

| Export | Contents |
|---|---|
| `FITTING_SIZES` | `BW_CS_AS` 172, `BW_SS_DS` 153, `SW` 30, `THRD` 36, `BW_REDUCING` 5,626 |
| `FLANGE_SIZES` | `BORED_CS_AS` 855, `BORED_SS_DS` 754, `PLAIN` 120, `THREADED` 50, `B16_47` 66 |
| `getFittingEnds(product)` | `"BW"` / `"SW"` / `"NPT"` from the name suffix. |
| `getFittingSizeOptions(product, knownEnds?)` | The right fitting pool. |
| `getFittingDimStandard(product)` | `ASME B16.9` (butt-weld) or `B16.11`. |
| `getFlangeSizeOptions(product)` | The right flange pool. |
| `FLANGE_DIM_STANDARD` | `"ASME B16.5"`. |
| `flangeDimForSize(label)` | The standard a size implies, or `null`. |
| `inferItemCategory(product)` | Pipe / Fitting / Flange from a name. |

## How it works

### Fitting routing, and the order of the checks

`getFittingSizeOptions` resolves **ends first**, then everything else:

1. `SW` → socket-weld pool. `NPT` → threaded pool.
2. Only then, if the name looks like a reducing fitting →
   `BW_REDUCING`.
3. Otherwise the butt-weld pool for the material class.

**That order is load-bearing.** The socket-weld and threaded masters each
contain their own `REDUCING TEE`, but those are single-size items. A name-first
check would hand them the 5,626 two-size pairs, offering sizes they cannot be
ordered in. The ends split happens first precisely to keep them out.

`knownEnds` is preferred over the name convention when supplied, so a
custom master product that does not follow the `", SW"` / `", SCRD"` naming
still routes correctly.

### Flange routing

Threaded → `THREADED`. Lap joint → `PLAIN`. Blind → `PLAIN` **plus B16.47**.
Weld neck → the bored pool for its class **plus B16.47**. Socket weld and slip
on → bored only.

B16.47 covers 26"–60" and only exists as weld neck and blind, so those two
product types get the extra 66 sizes appended and the others must not. The
material-class test runs on the **same uppercased string** as the type tests,
so a free-typed `"s.s. flange, weld neck"` does not fall through to the carbon
pool.

### `flangeDimForSize` returns `null` on purpose

For a B16.5 size it returns `"ASME B16.5"`. For a B16.47 size it returns
**`null`**.

That is not a gap. B16.47 **Series A and Series B share identical size
labels** — `26"NB X 150#` exists in both — so a size genuinely cannot say which
series it is. Guessing would print the wrong dimensional standard on a
quotation, which is a commercial error. Returning `null` leaves the Dim column
blank for the user to choose.

Before this existed, the flange size picker stamped the hardcoded
`FLANGE_DIM_STANDARD` on selection, so every 26"+ flange claimed to be B16.5.

## Domain notes

- **Bored vs plain.** Weld neck, socket weld and slip-on flanges have a bore
  matching the pipe, so their size carries a schedule
  (`4"NB X SCH 40 X 150#`). Blind and lap-joint flanges have no bore, so
  theirs does not (`4"NB X 150#`). Threaded are NPT.
- **`#`** is the pressure class — 150#, 300#, 600#, 900#.
- **Reducing fittings take two sizes**, large end first:
  `6"NB X SCH 40 - 4"NB X SCH 40`.
- **B16.9 / B16.11** — butt-weld fitting dimensions vs socket-weld and
  threaded.

## Gotchas and constraints

- **286 KB, ~7,970 lines**, most of it `BW_REDUCING`. This is a client-side
  constant, so it is real bundle weight. It is the client's own list of valid
  pairs, chosen over deriving them from component sizes because only 5,626 of
  the 23,556 possible combinations are valid.
- **`SmartCombobox` renders every filtered option with no cap.** The worst case
  is now 5,626 rows on first focus. Typing filters immediately; the initial
  open is the one to watch if it ever measures slow.
- **Regenerate with `npx tsx scripts/gen-size-constants.ts`** after any master
  file changes, and update the count locks in `spec-import.test.ts`.
- The generator **fails loudly** if sections that share a pool stop being
  identical, rather than silently unioning them.

## Related

- `scripts/gen-size-constants.ts` — the generator. Edit helpers there.
- `src/lib/masters/spec-import.ts` — parses the Excel.
- `src/lib/masters/spec-import.test.ts` — count locks and routing tests.
- `src/components/shared/smart-combobox.tsx` — renders these.
- `src/app/(dashboard)/quotations/create/standard/page.tsx` — main consumer.
