# src/lib/pdf/purchase-order-template.ts

> The purchase order sent to a vendor.

See [README.md](./README.md) for the shared pattern.

## Why this exists

The PO is the company's contractual instruction to a supplier. It has to state
what is being bought, at what price, on what commercial terms and where it is
to be delivered — precisely enough that a dispute can be settled by reading it.

## What it does

HTML for a PO: vendor block, item table, commercial terms, delivery details,
and the standard terms and conditions.

## How it works

Vendor name, address and GSTIN in the header; items with quantity, rate and
amount; then the commercial block — price basis, freight, testing, TPI, packing
and GST — and the delivery address and schedule.

The commercial terms carry through from the vendor's quotation via the
comparative statement, so the PO states the basis the vendor actually quoted.

## Domain notes

- **Price basis** decides who bears cost to where — Ex-Works, FOR, FOB, CIF,
  Delivered. It is why the comparative statement ranks on total landed cost
  rather than rate, and it belongs on the PO because it is contractual.
- **GSTIN** on both parties is required for input tax credit.
- **TPI charges** appear where the client requires third-party inspection of
  the vendor's material.
- **Amendment** — a PO can be revised, producing a new version linked to the
  parent (`parentPo` / `childPos`). The document carries its version.

## Gotchas and constraints

- **Approval is not value-gated.** The purchase document specifies bands
  (< ₹2L Purchase Head, ₹2–10L Director, above Management); that is not
  implemented, and there is no Director role. Any approver can approve any
  value.
- Delivery address is a text field on the PO, not a link to a dispatch
  address record.
- Terms are boilerplate on the template, not per-vendor.

## Related

- `src/app/api/purchase/orders/[id]/pdf/route.tsx`
- `src/lib/constants/supplier-quotations.ts` — price basis and charge types.
- `src/lib/business-logic/po-variance-detection.ts` — quotation vs PO.
