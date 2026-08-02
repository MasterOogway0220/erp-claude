# src/app/api/po-tracking/ — order tracking

See [the API pattern](../README.md) for the conventions every route follows.

The live status dashboard the order processing document specifies: seven stages (PO Received, PO Acceptance, Material Preparation, Inspection, Lab Testing, Documentation, Dispatch Clearance) with a completion percentage.

Stage statuses are computed by inspecting the actual downstream records. Some are derived approximations where no explicit field exists; the source comments mark which.

The same stage model backs the client status report.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [API overview](../README.md)
