# src/app/api/client-purchase-orders/ — client purchase orders

See [the API pattern](../README.md) for the conventions every route follows.

Registering the client's PO against the quotation it came from.

Supports **partial ordering**: the balance endpoint reports what is still open on the quotation, and the remainder stays available for a later order. That is why quantity variance between quotation and PO is normal while rate variance is not.

Carries the commercial calculation — six charge types each with a tax-applicable flag, and the GST split derived from client vs supplier state. Also the dispatch address, chosen here and inherited by the sales order.

Status: `REGISTERED` → `ACCEPTED` (when the PO acceptance is issued) → fulfilment.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [API overview](../README.md)
