# src/components/order-wizard/AllotmentStep.tsx

> Step 2 — assign physical stock to order lines.

See [README.md](./README.md) for the wizard's purpose, the three-step flow and
the domain background — this doc covers only what is specific to this step.

## Notes

Matches available `InventoryStock` to each line. Stock carries heat numbers, so this is where a client's order becomes tied to specific mill certificates. Anything unallottable is a shortfall, which feeds purchase requisition generation. Creates `StockReservation` rows and moves stock to `RESERVED` — stateful, so an abandoned run can leave reservations behind.

## Gotchas

- Large file; read before editing rather than pattern-matching from a sibling.
- Shares draft state with the other steps through `OrderWizard`.

## Related

- [Wizard overview](./README.md)
- `src/app/api/sales-orders/[id]/processing/route.ts`, `allotment/route.ts`
