# src/app/api/po-acceptance/ — PO acceptance

See [the API pattern](../README.md) for the conventions every route follows.

The company's formal acknowledgement of a client PO — committed delivery date, accepted items, and three named contacts (Follow-up, Quality, Accounts).

Issuing it advances the parent CPO to `ACCEPTED`, which is the gate the sales order depends on. That rule lives in `src/lib/po-acceptance/advance-cpo.ts` because it can be reached from three routes (`finalize`, PUT, PATCH) and had previously been implemented on only one.

The client's countersigned copy uploads back against the record.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [API overview](../README.md)
