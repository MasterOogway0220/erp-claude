# src/components/order-wizard/OrderWizard.tsx

> The wizard shell: holds step state, renders the active step, handles navigation and final submit.

See [README.md](./README.md) for the wizard's purpose, the three-step flow and
the domain background — this doc covers only what is specific to this step.

## Notes

Owns the shared draft state the three steps read and write, so a user can move back without losing entry.

## Gotchas

- Large file; read before editing rather than pattern-matching from a sibling.
- Shares draft state with the other steps through `OrderWizard`.

## Related

- [Wizard overview](./README.md)
- `src/app/api/sales-orders/[id]/processing/route.ts`, `allotment/route.ts`
