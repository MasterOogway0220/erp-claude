# src/components/order-wizard/ — the order processing wizard

Four files, ~3,700 lines. The heaviest UI in the application.

## What it is

Once a sales order exists, it has to be *processed*: quality requirements
captured per line, stock allotted, and the result reviewed and committed. The
wizard walks that in three steps.

```
OrderWizard.tsx      the shell — step state, navigation, submit
  ├─ ProcessStep     per-item quality requirements (largest, 1,456 lines)
  ├─ AllotmentStep   assign physical stock to order lines (1,072 lines)
  └─ ReviewStep      confirm and commit (840 lines)
```

## Why a wizard

The three stages are genuinely sequential — you cannot allot stock against
requirements that have not been set, and you should not commit before
reviewing. A single form would be unusable at this field count.

## Domain notes

**ProcessStep** captures what `OrderProcessingItem` holds per line: colour
coding, hot-dip galvanising, screwed ends, coating (type and side), TPI, lab
testing, PMI, NDT, VDI and hydro witness percentages, and the required lab
tests. These drive the warehouse checklist, the inspection offer and
ultimately the dispatch dossier — so what is ticked here determines what
paperwork the client receives.

**AllotmentStep** assigns actual `InventoryStock` to order lines. Stock carries
a heat number, so allotment is what ties a client's order to specific mill
certificates. Whatever cannot be allotted is a shortfall, and that shortfall
feeds `auto-pr-generation.ts` to raise a purchase requisition.

**ReviewStep** commits — writing the processing items, reservations and status
changes.

## Gotchas that apply across the wizard

- **These files are large.** Read the step you are changing; do not assume the
  three share conventions.
- **Stock reservation is stateful.** Allotment creates `StockReservation` rows
  and moves stock to `RESERVED`. Re-running or abandoning mid-way can leave
  reservations behind.
- Picklists come from `src/lib/constants/order-processing.ts`; the values are
  persisted, so changing one orphans existing rows.
- `ProcessStep` uploads files through `/api/upload` — now database-backed.

## Related

- `src/lib/constants/order-processing.ts`
- `src/lib/quality/qap.ts`
- `src/lib/business-logic/auto-pr-generation.ts`
- `src/app/api/sales-orders/[id]/processing/route.ts`, `allotment/route.ts`
- `prisma/schema.prisma` → `OrderProcessingItem`, `StockReservation`
