# src/lib/quality/witness-percent.ts

> Normalises a VDI / hydro-test witness percentage for an Int column.

## Why this exists

`OrderProcessingItem.vdiWitnessPercent` and `hydroWitnessPercent` are Int.
The order-processing form sends whatever was typed, and the live MySQL runs in
non-strict SQL mode, so a decimal is not rejected: 12.5 was stored as 12
without any error (observed 5 Oct 2026). Rounding on the way in makes the
stored number the nearest one to what the user meant.

## What it does

`wholePercent(value: unknown): number | null`

- Numbers and numeric strings → `Math.round` (12.5 → 13, "25" → 25, 0 → 0).
- `null`, `undefined`, `""`, non-numeric text → `null`.

## How it works

One `Number()` conversion and a finiteness check. Blank is tested before
conversion because `Number("")` is 0, which would turn "not answered" into
"0 % witnessed".

## Domain notes

- **VDI** — visual and dimensional inspection of pipe before dispatch.
- **Hydro test** — hydrostatic pressure test.
- **Witness %** — the share of pieces the client or their TPI inspector wants to
  watch being inspected or tested, rather than accept on our report.

## Gotchas and constraints

Does not clamp to 0–100; the form's `min`/`max` handle that for normal input.

## Related

- `src/app/api/sales-orders/[id]/processing/route.ts` — the only caller.
- Test: `src/lib/quality/witness-percent.test.ts`.
