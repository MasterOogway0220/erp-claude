# src/lib/pdf/invoice-template.ts

> The tax invoice — a statutory document, not just a bill.

See [README.md](./README.md) for the shared pattern.

## Why this exists

An Indian tax invoice has legally mandated content: both parties' GSTIN, HSN
codes per line, the tax split shown separately, the amount in words, and place
of supply. Getting it wrong is a compliance problem for the customer as much as
the company — they cannot claim input credit against a defective invoice.

## What it does

HTML for a domestic or export invoice: seller and buyer with GSTINs, items with
HSN codes, the CGST/SGST or IGST split, totals, and the amount in words.

## How it works

Amounts and the tax split are **pre-computed** and passed in — this template
formats, it does not calculate. `amountInWords` is likewise stored on the
document at save time, so a historical invoice does not change if the
conversion code later does.

Which tax lines appear depends on the supply: intra-state shows CGST and SGST,
inter-state shows IGST. Never both.

Domestic and export invoices draw from different number series (`INV` and
`EXP`).

## Domain notes

- **HSN code** — Harmonised System of Nomenclature, the tariff classification.
  Mandatory per line; carried from `ClientPOItem.hsnCode`.
- **Place of supply** decides whether the supply is intra- or inter-state, and
  therefore which tax applies. It follows the dispatch address, not the billing
  address — which is why picking the dispatch address early in the flow has a
  tax consequence, not just a logistics one.
- **Reverse charge** — where the recipient pays the tax; flagged on the
  document.
- **Amount in words** with a trailing "Only" is conventional and acts as a
  tamper guard.

## Gotchas and constraints

- **This is the human-readable invoice.** The GST portal's e-invoice payload is
  a separate JSON schema in `business-logic/e-invoice-generator.ts`, and
  nothing currently submits it — no IRN or QR is obtained or printed.
- Tax figures must reconcile exactly; the rounding order in
  `calc/po-totals.ts` exists so the printed components sum to the printed
  total.
- No credit/debit note variant here — those are separate documents.

## Related

- `src/lib/calc/po-totals.ts` — the arithmetic.
- `src/lib/amount-in-words.ts`
- `src/lib/business-logic/e-invoice-generator.ts`
- `src/app/api/dispatch/invoices/[id]/pdf/route.tsx`, `email/route.tsx`
