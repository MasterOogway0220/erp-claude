# src/hooks/use-units.ts

> Unit-of-measure options for item dropdowns, read from Unit Master instead of
> a hardcoded array.

## Why this exists

Unit Master (UOM) is a real master: `UomMaster` in the schema, edited at
**Product Master → Units (UOM)**, served by `/api/masters/units`. The
quotation forms did not use it. Both the standard and non-standard quotation
pages each declared their own module-level array:

```ts
const UOM_OPTIONS = ["Mtr", "Nos", "Kg", "MT", "Feet", "Set", "Lot"];
```

So adding, renaming or deactivating a unit in the master changed nothing in
the only screens where units are actually picked, and the two arrays had
already drifted from the master: the master holds 12 active units (adds `Pcs`,
`MM`, `In`, `Bundle`, `TST`), and its code for feet is `Ft`, not the `Feet`
the arrays offered. Delete this hook without replacing it and the master
becomes decorative again.

## What it does

`useUnits(): string[]` — the `code` of every active unit in Unit Master, in the
order the API returns them (sorted by name). Returns the legacy seven-item list
if the fetch has not resolved or has failed, so the dropdown is never empty.

## How it works

A `useQuery` on key `["uom-master"]` hitting `GET /api/masters/units`, which
already filters `isActive: true` and orders by name — no client-side filtering
is needed. `staleTime` is 5 minutes: unit lists change perhaps twice a year,
and every quotation line re-reads them.

The fallback is deliberate and is not a cache. It is the same seven strings the
pages used to hardcode, kept only so a failed masters call cannot block
quotation entry — a blank Unit dropdown makes the form unsubmittable. When the
query succeeds the fallback is never consulted.

## Domain notes

**UOM** (unit of measure) is how a quoted line is priced and counted. Pipe is
normally sold by the metre (`Mtr`), fittings and flanges by the piece (`Nos`),
plate by weight (`Kg`); heavier bulk trades in metric tons (`MT`). The default
per item category is business logic in the quotation forms, not in this hook —
this hook only supplies the list of legal choices.

## Gotchas and constraints

- **Returns codes, not names.** `QuotationItem.uom` stores the code string
  (`"Mtr"`), not a foreign key to `UomMaster`. There is no referential
  integrity: deactivating a unit in the master does not touch quotations
  already saved with it. Both quotation forms therefore prepend the stored
  value as an extra `<SelectItem>` when it is no longer in the list, or editing
  an old quotation would show a blank Unit.
- **Case matters.** The master's codes are mixed case (`Mtr`, `Nos`, `Kg`).
  Other screens hardcode upper case (`MTR`, `NOS`, `KG` — see
  `masters/material-codes` and `quality/lab-letters/create`). Those are not
  wired to this hook, so a value copied between the two families will not
  match. Live quotation data uses only `Mtr` (162 rows), `Nos` (23) and `Kg`
  (3), all of which exist in the master.
- **Client components only** — it calls `fetch` and `useQuery`.

## Related

- `src/app/api/masters/units/route.ts` — the endpoint.
- `prisma/schema.prisma` → `UomMaster`; seeded in `prisma/seed.ts`.
- `src/app/(dashboard)/masters/products/page.tsx` — the Units (UOM) tab that
  edits the master.
- `src/app/(dashboard)/quotations/create/standard/page.tsx` and
  `.../nonstandard/page.tsx` — the two consumers.
