# src/lib/weight-calculation.ts

> Pipe weight per metre from outside diameter and wall thickness.

## Why this exists

Pipe is quoted and shipped by weight as often as by length. The client's
existing spreadsheets use a specific constant and a specific stainless
correction factor, and quotations produced by this ERP have to agree with the
figures the sales team have always used — a quotation that disagrees with the
customer's own calculation by even a fraction invites a query.

So this is not a general engineering formula, it is *the company's* formula,
transcribed.

## What it does

`calculateWeightPerMeter(od, wt, pipeType)` → kg/metre to 4 dp, or `null` when
the inputs cannot describe a real pipe.

```
CS_AS:  (OD − WT) × WT × 0.0246615
SS_DS:  (OD − WT) × WT × 0.0246615 × 1.014
```

OD and WT in millimetres.

## How it works

`(OD − WT)` is the mean diameter — the centreline of the wall, since the wall
sits WT/2 inside the outer surface on both sides. Multiplying by WT gives the
cross-sectional area of the annulus divided by π, and `0.0246615` folds
together π, the density of steel and the mm→m unit conversion.

The `1.014` factor for stainless and duplex reflects their higher density
(~7,930 vs ~7,850 kg/m³).

### Why `null` rather than a number

Three rejections, all returning `null`:

- `od` or `wt` falsy or ≤ 0 — not a pipe.
- `wt >= od` — the wall is thicker than the pipe is wide. This is the one worth
  guarding: the formula does not error, it returns a **negative weight**, which
  would flow into a quotation total and reduce it. A caller that forgets to
  check `null` gets an obvious blank; one that received `-12.4` might not
  notice.

Rounding is to 4 dp via `Math.round(x * 10000) / 10000`, matching the
precision of the client's size master.

## Domain notes

- **OD / WT** — Outside Diameter and Wall Thickness, both mm. A pipe is
  specified by nominal bore and schedule (`6"NB X SCH 40`), and those map to
  actual OD and WT via `SizeMaster`.
- **CS_AS / SS_DS** — Carbon & Alloy Steel, Stainless & Duplex Steel. The
  `PipeType` enum. The split exists for density here, and elsewhere because the
  two families use different schedule designations (`SCH 40` vs `SCH 40S`).

## Gotchas and constraints

- Straight pipe only. Fittings and flanges are sold by piece, not weight.
- Per **metre**, not per length. Callers multiply by length themselves.
- Nominal, not actual. Mill tolerance means delivered weight differs; this is
  the quoting figure.
- The constant and the factor are the client's. Do not "correct" them to
  textbook values — they are what the customer's own numbers are based on.

## Related

- `src/lib/masters/spec-import.ts` — parses the size master this feeds from.
- `src/app/(dashboard)/quotations/create/standard/page.tsx` — per-line weight.
