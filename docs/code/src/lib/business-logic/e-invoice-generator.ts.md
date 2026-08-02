# src/lib/business-logic/e-invoice-generator.ts

> Builds the GST e-invoice JSON payload for submission to the government
> portal.

## Why this exists

Indian GST requires B2B invoices above a turnover threshold to be registered
with the Invoice Registration Portal **before** being issued to the customer.
The portal returns an IRN and a signed QR code, and an invoice without them is
not legally valid.

The payload is a rigid, government-defined schema with abbreviated field names
(`TranDtls`, `SellerDtls`, `ValDtls`) and strict formats. This file maps the
ERP's invoice into that shape.

## What it does

Builds an `EInvoiceJSON` (schema version 1.1) from an invoice: transaction
details, document details, seller, buyer, optional dispatch and shipping
blocks, item list, value totals and references.

## How it works

The interfaces mirror the portal's schema exactly, including its abbreviations
— deliberately, because the field names *are* the contract. Renaming them to
something readable would mean a mapping layer and a new place for a typo to
hide. The comments carry the expansions.

Key encodings:

- **`SupTyp`** — supply type: `B2B`, `SEZWP`/`SEZWOP` (SEZ with/without
  payment), `EXPWP`/`EXPWOP` (export with/without payment), `DEXP` (deemed
  export). Determined by the customer and the delivery, and it decides how the
  portal treats the tax.
- **`Typ`** — `INV`, `CRN` (credit note), `DBN` (debit note).
- **Dates as `DD/MM/YYYY` strings**, not ISO.
- **`RegRev`** — reverse charge, `"Y"`/`"N"` rather than a boolean. The schema
  uses Y/N strings throughout.

Separate `DispDtls` and `ShipDtls` blocks exist because the dispatch address
can differ from both the seller and the buyer — which is exactly why the
dispatch address had to be selectable earlier in the flow.

## Domain notes

- **IRN** — Invoice Reference Number, returned by the portal.
- **GSTIN** — the 15-character GST identifier. Seller and buyer both need one
  for a B2B invoice.
- **HSN code** — the tariff classification per line, mandatory. Carried on
  `ClientPOItem.hsnCode` and through to the invoice.
- **SEZ / deemed export** — special zones and categories with different tax
  treatment; common in oil and gas supply, hence the distinct supply types.
- **Reverse charge** — the recipient pays the tax rather than the supplier.
  The quotation and CPO both carry an `rcmEnabled` flag that flows here.

## Gotchas and constraints

- **Generates the payload only.** Nothing in this codebase submits it, and no
  IRN or QR is stored. Integration with the portal (directly or via a GSP) is
  not built — treat this as the mapping half of an unfinished feature.
- **Schema version 1.1 is pinned in the payload.** The portal versions its
  schema; a mismatch is rejected wholesale.
- **The portal validates strictly** — a wrong date format or a missing
  conditional field fails the whole invoice, not one line.
- Rounding and totals must reconcile to the paise or the portal rejects them.

## Related

- `prisma/schema.prisma` → `Invoice`, `InvoiceItem`.
- `src/lib/pdf/invoice-template.ts` — the human-readable invoice.
- `src/lib/calc/po-totals.ts` — the GST arithmetic these values come from.
