# src/app/(dashboard)/client-purchase-orders/create/page.tsx

> Client page at `/client-purchase-orders/create`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/client-purchase-orders/create` screen. 1,922 lines.

## How it works

- `"use client"` — runs in the browser.
- Reads `useSearchParams`, so it **must sit inside a `<Suspense>` boundary** — Next.js 16 fails the build otherwise.
- Calls: `/api/client-purchase-orders`, `/api/fx/rate`, `/api/masters/customers`, `/api/masters/customers/${formData.customerId}/dispatch-addresses`, `/api/masters/material-codes/${item.materialCodeId}/customer-history`, `/api/quotations`, `/api/quotations/${quotationId}/balance`.

## What registration captures beyond the obvious

- **Delivery schedule as text.** Clients state delivery as a period ("10 weeks",
  "8-10 weeks", "ready stock"), not a date. The field was previously an
  `<input type="date">` mislabelled "Delivery Schedule" bound to
  `deliveryDate`, so `ClientPurchaseOrder.deliverySchedule` — which the API and
  the detail screen already supported — was never written and the detail screen
  showed a permanently blank row. It is now free text, and
  `deliveryScheduleToDate` derives the **committed delivery date** from it
  (P.O. date + the period, upper bound of a range). Editing the CDD by hand sets
  `cddEdited` and stops the derivation overwriting it.
- **The order contact.** Picking one of the customer's saved `CustomerContact`
  rows fills name, email and phone; all three stay editable for a one-off. Only
  a name used to be captured, so the acceptance letter and every follow-up had
  no address to go to.
- **Billing address.** Chosen from the customer's saved addresses and stored on
  `billingAddressId`, separate from the ship-to `dispatchAddressId`. A client
  with more than one GST registration invoices from a different entity than the
  site it delivers to. Empty = the customer master address.
- **The signed client P.O. copy**, uploaded through `/api/upload` and carried on
  to `SalesOrder.customerPoDocument`.
- **Qty remark per line.** Mandatory whenever the ordered quantity differs from
  the quoted balance, mirroring the existing mandatory rate remark. Without it a
  part-order could not be explained once the quotation balance had moved on.

`deliveryDate` is sent equal to the committed date: it is the column the detail
screen renders as the CDD and the floor for per-item CDDs, and carrying two
dates that can disagree is worse than one.

## Gotchas

- Large file (1,922 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
- `src/lib/dates.ts` — `deliveryScheduleToDate`
- `src/app/api/masters/customer-contacts/route.ts`,
  `src/app/api/upload/route.ts`
