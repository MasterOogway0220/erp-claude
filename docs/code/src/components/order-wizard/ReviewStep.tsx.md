# src/components/order-wizard/ReviewStep.tsx

> Step 3 — review and commit.

See [README.md](./README.md) for the wizard's purpose, the three-step flow and
the domain background — this doc covers only what is specific to this step.

## Notes

Presents everything captured in the first two steps for confirmation, then writes it: processing items, reservations and status transitions. The last point at which the whole thing can be abandoned cleanly.

## Gotchas

- Large file; read before editing rather than pattern-matching from a sibling.
- Shares draft state with the other steps through `OrderWizard`.

## Related

- [Wizard overview](./README.md)
- `src/app/api/sales-orders/[id]/processing/route.ts`, `allotment/route.ts`
