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

- **Terms & Conditions.** When a quotation is picked, its offer terms (from
  `/api/quotations/[id]/balance`) are copied into an editable list below the
  items: each row can be re-worded, renamed, unticked (kept but not printed) or
  removed, and rows can be added. The list is sent as `terms` and stored as
  the order's own `ClientPOTerm` rows; the PO acceptance letter prints the
  ticked ones. Payment Terms and Delivery Terms are also pre-filled from the
  quotation's "Payment" / "Delivery" rows (`termValue`), because the
  quotation's structured payment/delivery-terms fields are never filled.
- **Typed addresses.** Billing and Dispatch Address each have "— Enter
  manually —": the saved-site FK is cleared and a textarea takes a one-off
  address (`billingAddressText` / `dispatchAddressText`), so a domestic
  customer's new site no longer has to be created in the master first.
  Changing the customer clears them, and the terms.
- **What "Others" is.** The Others charge row has a description input, sent as
  `otherChargesDescription`.
- **Copy line.** Each line has a Copy button that inserts a copy under it, so
  one quoted line can become two or more PO lines when the client's PO splits
  it (own PO Sl. No., item code, qty, CDD). The copy starts with qty 0 and blank
  PO refs and can be removed again. It keeps `id` (the quotation item id, sent
  as `quotationItemId`) and gets its own `rowKey` for React keys; lookups by
  row use the object, not `id`. Copies of one line must together fit its
  balance (`firstOverBalance`, checked here and again by the API). The qty
  remark is required per quoted line, judged on the copies' total: lines that
  together order the full balance need no remark.
- **Additional charges.** Six fixed charges (freight, TPI, testing, packing &
  forwarding, insurance, others), each with a "Tax Applicable" switch that
  decides whether it joins the GST base. The list and the POST field names
  come from `src/lib/calc/cpo-charges.ts`; all six switches start **on**. The
  page used to build each flag's name as `key + "TaxApplicable"`, which is
  wrong for three of them (`tpiCharges` → `tpiTaxApplicable`, not
  `tpiChargesTaxApplicable`), so TPI, testing and P&F were always saved as
  not taxable while the on-screen total included their GST. Fixed 5 Oct 2026.

`deliveryDate` is sent equal to the committed date: it is the column the detail
screen renders as the CDD and the floor for per-item CDDs, and carrying two
dates that can disagree is worse than one.

## Gotchas

- Large file (1,922 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.
- `quotations` is wrapped in `useMemo`. Without it, `quotationData?.quotations ?? []` is a new array on every render while the query loads; the customer-filter effect depends on it and sets state, so the page re-renders forever and React aborts with error #185 ("Maximum update depth exceeded"). This crashed the page on every open from 23 Aug to 5 Oct 2026.

## Sandbox preview (temporary, from 5 Oct 2026)

`page.tsx` is currently a gate: the sandbox login gets `page.sandbox.tsx`
— the behaviour this doc describes — and every other user gets
`page.legacy`, the version from before the 03/10/26 meeting fixes. See
`src/lib/sandbox/preview.ts.md`. Going live: replace this file with the
`.sandbox` copy and delete both copies; then delete this section.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
- `src/lib/dates.ts` — `deliveryScheduleToDate`
- `src/lib/calc/cpo-charges.ts` — `DEFAULT_CHARGES`, `chargePayload`
- `src/app/api/masters/customer-contacts/route.ts`,
  `src/app/api/upload/route.ts`
