# src/app/api/masters/client-items/route.ts

> `/api/masters/client-items` — GET, POST — the customer's own item IDs used on non-standard quotations.

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `clientItemMaster` (`ClientItemMaster`: one row per customer +
item ID, with an optional description and unit).

- **GET** `?customerId=&search=` — list, newest customer name first then item
  ID. `customerId` narrows to one customer — the non-standard quotation form
  uses this to populate its Item ID suggestions. `search` matches item ID or
  description. Capped at 2,000 rows; includes `customer.name`.
- **POST** `{ customerId, itemNo, description?, unit? }` — create. `400` when
  customer or item ID is missing, or when that customer already has that ID
  (`P2002` on the `(customerId, itemNo)` unique).

## How it works

- Gated by `checkAccess("masters", "read" | "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Writes an audit row on create.
- No cache layer (unlike material codes): the list is per customer and small,
  and it changes on every non-standard quotation save.

## Gotchas

- Most rows are **not** created here — they arrive through
  `src/lib/quotations/client-items.ts` when a non-standard quotation is saved.
  This route is for adding an ID ahead of a quotation.

## Related

- `src/app/api/masters/client-items/[id]/route.ts` — PATCH / DELETE.
- `src/app/(dashboard)/masters/material-codes/client-items-tab.tsx` — the screen.
- `src/app/(dashboard)/quotations/create/nonstandard/page.tsx` — consumer.
