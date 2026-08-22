# src/app/(dashboard)/purchase/rfq/[id]/quote/[rfqVendorId]/page.tsx

> Client page at `/purchase/rfq/[id]/quote/[rfqVendorId]` — transcribe a
> vendor's quotation against an RFQ.

See [../../../README.md](../../../README.md) for this module's shared behaviour.

## Why this exists

This was a modal on the RFQ detail screen and it never fitted. The commercial
terms are a five-column row and the item table is eight columns wide, so the
dialog scrolled in **both** directions and clipped "Valid Until" and "TPI
Charges" out of view entirely. A quotation is a document being copied field by
field out of a vendor's email — that is page work, not dialog work.

Moving it also fixed a defect that made the old dialog useless: it sent
`vendorId` (a `VendorMaster` id) while `POST /api/purchase/rfq/[id]/quotations`
requires `rfqVendorId` (the `RFQVendor` join row). **Every save failed** with
"RFQ Vendor ID is required", from both the per-vendor and the top-level button.
Here the vendor comes from the URL, which is the join-row id the route wants.

## What it does

Renders the requisition's line items with the technical requirements the client
imposed, and takes a unit rate, delivery days and remarks per line, plus the
header terms (reference, dates, price basis, delivery, payment) and the
commercial charges (freight, testing, TPI, packing, GST).

Saving POSTs one `VendorQuotation` with its items and returns to the RFQ.

## How it works

- The vendor is **fixed by the route**, not selected. Quoting is always against
  one vendor; the old top-level "Enter Quotation" button had no vendor context,
  which is why it could not work. That button is gone — the entry point is the
  per-vendor row on the RFQ.
- Items come from `rfq.purchaseRequisition.items` (an RFQ holds none of its own)
  and are read through `prItemFields` / `prItemLabel`, so the product identity is
  the same wording the buyer saw on the PR.
- Each line carries `sNo / product / material / additionalSpec / sizeLabel` in
  the payload, because that is what `VendorQuotationItem` stores. The old dialog
  sent only a display name and `parseInt(undefined)` for `sNo`.
- The **Technical Requirements** column is shown while pricing, on purpose: the
  witness percentages, tests and coating are what a rate means. A vendor quoting
  without them is quoting for different material.
- `Material Value` is summed in the browser as rates are typed. Charges and GST
  are **not** — the route computes `totalMaterialCost` and `totalLandedCost`, and
  a second copy of that arithmetic here would be a second thing to get wrong.

## Domain notes

- **RFQ** — request for quotation: the enquiry sent to several vendors for the
  same requisition. `RFQVendor` is one vendor's place in that enquiry, and a
  `VendorQuotation` hangs off it.
- **Price basis** — Ex-Works, FOR, CIF, FOB, Delivered: who pays to move the
  material, and therefore whether two quotes are comparable at all.
- **TPI** — third-party inspection; the charge for an independent agency to
  witness manufacture and testing.
- **Landed cost** — material plus freight, testing, TPI, packing and GST. It is
  the only number worth comparing between vendors.

## Gotchas and constraints

- `rfqVendorId` is the **`RFQVendor` id**, not the vendor master id. Passing the
  wrong one gives "Vendor not found on this RFQ".
- The RFQ must not be `DRAFT` — the button that reaches this page is disabled
  until the enquiry has been sent.
- Re-quoting is not handled here: the route creates a quotation for the
  `RFQVendor`, and one already recorded needs the existing entry dealt with.

## Related

- `src/app/(dashboard)/purchase/rfq/[id]/page.tsx` — the entry point.
- `src/app/api/purchase/rfq/[id]/quotations/route.ts` — the POST contract.
- `src/lib/purchase/pr-item-fields.ts` — how a PR line is read.
- `prisma/schema.prisma` → `RFQVendor`, `VendorQuotation`, `VendorQuotationItem`.
