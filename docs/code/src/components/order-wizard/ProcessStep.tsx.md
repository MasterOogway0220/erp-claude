# src/components/order-wizard/ProcessStep.tsx

> Step 1 — per-item quality and processing requirements.

See [README.md](./README.md) for the wizard's purpose, the three-step flow and
the domain background — this doc covers only what is specific to this step.

## Notes

The largest file in the codebase at 1,456 lines. Every field maps to a column on `OrderProcessingItem`; the picklists come from `src/lib/constants/order-processing.ts`. What is ticked here decides which inspections, tests and certificates the order needs, and therefore what the client eventually receives in the dossier.

## Gotchas

- Large file; read before editing rather than pattern-matching from a sibling.
- Shares draft state with the other steps through `OrderWizard`.

## Related

- [Wizard overview](./README.md)
- `src/app/api/sales-orders/[id]/processing/route.ts`, `allotment/route.ts`
