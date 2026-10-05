# src/lib/quotations/terms.ts

> Reads one of a quotation's offer-term rows ("Payment", "Delivery") by name.

## Why this exists

Every quotation carries its commercial terms as a list of offer-term rows —
Price, Delivery, Payment, Offer validity, Freight, and so on — and those rows
are what its PDF prints. The structured `Quotation.paymentTermsId` /
`deliveryTermsId` / `deliveryPeriod` fields exist but the quotation forms never
fill them, so every screen that tried to inherit terms from a quotation through
those fields got nothing (checked on live data 5 Oct 2026: rows filled, fields
null). Screens that create an order from a quotation read the rows instead.

## What it does

`orderTermRows(terms)` — an edited terms list (a quotation's terms copied onto
a client PO) as rows to store: `{ termNo, termName, termValue, isIncluded }`,
numbered 1..n, trimmed, rows with neither name nor value dropped, `isIncluded`
defaulting to true.

`termValue(terms, name)` — the trimmed `termValue` of the first row whose
`termName`, lower-cased and trimmed, starts with `name` lower-cased; `""` when
there is none or `terms` is missing.

## How it works

"Starts with" so that "Payment" also finds a row named "Payment Terms". First
match wins.

## Domain notes

The offer-term templates name these rows "Payment" and "Delivery" for both
domestic and export quotations. "Delivery" usually reads like "As above,
ex-works, after receipt of PO" — the period itself is per line ("6-8 Weeks").

## Gotchas and constraints

A renamed template row ("Terms of payment") would no longer match.

## Related

- `src/app/(dashboard)/sales/create/page.tsx` — pre-fills Payment Terms and Delivery Schedule.
- `src/app/(dashboard)/client-purchase-orders/create/page.tsx` — pre-fills Payment / Delivery Terms.
- `src/app/api/client-purchase-orders/route.ts` — stores the order's terms via `orderTermRows`.
- Test: `src/lib/quotations/terms.test.ts`.
