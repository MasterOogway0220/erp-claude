# src/app/api/sales-orders/ — sales orders

See [the API pattern](../README.md) for the conventions every route follows.

The order under execution. Created from an accepted client PO (`from-cpo`), then processed: quality requirements per line (`processing`), stock allotment (`allotment`), and reservation. Shortfall from allotment feeds automatic purchase requisition generation.

Status: `OPEN` through fulfilment. `processingStatus` tracks the wizard separately from the order's own status.

The order is the hub — the warehouse intimation, inspections and dispatch all hang off it.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [API overview](../README.md)
