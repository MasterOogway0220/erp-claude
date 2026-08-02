# src/app/api/alerts/ — alerts

See [the API pattern](../README.md) for the conventions every route follows.

Role-addressed workflow notifications — material awaiting inspection, a PO overdue, stock short against an order.

Addressed to a **role**, not a person, so whoever is on duty picks them up. `relatedModule` + `relatedId` point back to the source document loosely, with no foreign key, so an alert survives what it refers to.

Several alert triggers live in this route rather than in the modules that cause them.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [API overview](../README.md)
