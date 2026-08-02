# src/components/shared/dispatch-address-select.tsx

> Picks a customer's saved ship-to site, or captures a new one.

## Why this exists

A client PO routinely delivers to a project site rather than the billing
address. The address also decides **place of supply**, which decides whether
GST splits as CGST+SGST or lands as IGST — so this is a tax decision, not only
a logistics one.

## What it does

Lists the customer's `CustomerDispatchAddress` records, preselects their
default, and shows the resolved address so the user can see where material is
actually going.

## How it works

Fetches `/api/masters/customers/[id]/dispatch-addresses` when the customer
changes, and clears the selection when the customer does — a stale address from
a previous customer is worse than none.

"Same as billing address" is the null option.

## Domain notes

`CustomerDispatchAddress` carries company name, address, city, state, pincode,
contact person, contact number and GSTIN — a site can have its own GST
registration.

The intended flow is that the address is chosen **once at PO registration** and
inherited: CPO → sales order → dispatch note → invoice. Before that, the only
place to pick one was the dispatch note, at the very end, so the information
was re-keyed after material was already prepared.

## Gotchas and constraints

- **Needs a customer first.** Disabled until one is selected.
- Addresses are managed in Masters → Customer / Vendor, not created here.
- Soft-deleted addresses are excluded by the API, so an address in use on an
  old document may not appear.

## Related

- `src/app/api/masters/customers/[id]/dispatch-addresses/route.ts`
- `src/app/(dashboard)/client-purchase-orders/create/page.tsx`
- `src/lib/calc/po-totals.ts` — the tax consequence.
