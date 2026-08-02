# src/app/api/inventory/ — stock, GRN and issues

8 files.

See [the API pattern](../README.md) for shared conventions.

## Stock lifecycle

```
UNDER_INSPECTION → ACCEPTED / REJECTED / HOLD → RESERVED → DISPATCHED
```

Material arrives on a **GRN** and lands `UNDER_INSPECTION`. QC release moves it
to `ACCEPTED`, which is what makes it reservable. Allotment against a sales
order moves it to `RESERVED`. Dispatch moves it out.

Nothing skips a stage. A route that sets a status directly rather than through
the proper transition is a bug.

## Heat-level detail

`InventoryStock` carries a heat number, and `PipeMaterialDetail` records
individual pipes — length, heat, make, MTC number, bundle. That is what makes
a specific length of pipe on site traceable back to its mill certificate.

Pipe ships in **random lengths**, so a 100 m receipt is some number of pieces of
varying length. The per-pipe detail is not bureaucracy; it is how the length
tally on an inspection offer is produced.

## Gotchas

- **The GRN route sets PO status directly** (`PARTIALLY_RECEIVED` /
  `FULLY_RECEIVED`) rather than going through the PO transition validator. That
  is intentional — receipt is a counted fact and must not be blocked by the
  vendor-milestone sequence.
- **MTC is a mandatory attachment at GRN** — see
  `validators/business-rules.ts`.
- Stock is company-scoped; reservations link stock to sales order lines.

## Related

- `src/lib/validators/business-rules.ts`
- `src/app/(dashboard)/inventory/page.tsx` — the four-tab screen.
- `prisma/schema.prisma` → `InventoryStock`, `GRNItem`, `PipeMaterialDetail`
