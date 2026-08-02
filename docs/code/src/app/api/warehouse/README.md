# src/app/api/warehouse/ — warehouse intimation (MPR)

See [the API pattern](../README.md) for the conventions every route follows.

The Material Preparation Request telling stores to pick and prepare material against a sales order.

Per line it tracks required vs prepared quantity and two independent checks — inspection and testing — whose statuses come from `deriveWarehouseStatuses`: inspection is an order-level QAP decision, testing is per item.

Once material is ready, `generate-inspection-offer` turns the MPR into an offer to the TPI agency.

Status: `PENDING` → `IN_PROGRESS` → `MATERIAL_READY` → `DISPATCHED`.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [API overview](../README.md)
