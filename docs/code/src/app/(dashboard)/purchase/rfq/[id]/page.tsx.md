# src/app/(dashboard)/purchase/rfq/[id]/page.tsx

> Client page at `/purchase/rfq/[id]`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/purchase/rfq/[id]` screen. 755 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/purchase/comparative-statement`, `/api/purchase/rfq/${id}`, `/api/purchase/rfq/${id}/quotations`.

## Notes

PR lines are read through `prItemFields` (`src/lib/purchase/pr-item-fields.ts`).
An RFQ has no items of its own — it renders the requisition's — and a `PRItem`
carries `product / material / additionalSpec / sizeLabel / uom`, while this
screen used to read `itemName / name / specification / description / unit`, none
of which exist on it. Every item displayed blank.

**Entering a quotation is a page, not a dialog.** The per-vendor button routes to
`/purchase/rfq/[id]/quote/[rfqVendorId]`. The old modal put a five-column
commercial-terms row and an eight-column item table in a box, so it scrolled in
both directions and clipped fields; and it sent `vendorId` where the route wants
`rfqVendorId`, so no save ever succeeded. The vendor-less top-level "Enter
Quotation" button is gone — quoting is always against one vendor.

The PR Items table shows each line's **Technical Requirements**, taken straight
from `PRItem` — an RFQ has no items of its own, it renders the requisition's.
The vendor is being asked to quote against those requirements, not just the
size.

## Gotchas

- Large file (755 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
