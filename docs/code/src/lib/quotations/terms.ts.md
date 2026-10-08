# src/lib/quotations/terms.ts

> Reads one of a quotation's offer-term rows ("Payment", "Delivery") by name,
> and shapes edited term lists (client PO, tender) into rows to store.

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

`tenderTermRows(terms)` — the same for a tender's terms, plus `isCustom`
(defaulting to false). The tender form works like the quotation forms:
template rows can only be ticked and given a value, rows added with "Add Custom
Term" can also be renamed and removed. Without the flag a saved custom row
would come back as a fixed one, on the tender and on a quotation raised from
it. Kept separate from `orderTermRows` because `ClientPOTerm` has no such
column and Prisma rejects an unknown field.

`termValue(terms, name)` — the trimmed `termValue` of the first row whose
`termName`, lower-cased and trimmed, starts with `name` lower-cased, with any
leading colons and whitespace removed; `""` when there is none or `terms` is
missing.

`cleanTermValue(value)` — that clean-up on its own: leading colons and
whitespace removed, trimmed, `""` for a missing value. PDFs print a term as
"Name : value", so a stored ": Ex-Godown" came out as "Price : : Ex-Godown";
the quotation PDF route and the acceptance letter pass every term
value through it at print time (6 Oct 2026). Stored values are not changed.

## How it works

"Starts with" so that "Payment" also finds a row named "Payment Terms". First
match wins.

The leading colon is stripped because some stored values begin with one (live,
6 Oct 2026: ": 50% advance against Proforma Invoice & Balance prior to
dispatch"), and before that date an order's Payment Terms pre-filled with the
": " included. Only the start is touched — "Ex-works: Mumbai" keeps its colon —
and a value that is nothing but colons and spaces becomes `""`, so Create
Order's `termValue(...) || previous value` fallback still applies.

## Domain notes

The offer-term templates name these rows "Payment" and "Delivery" for both
domestic and export quotations. "Delivery" usually reads like "As above,
ex-works, after receipt of PO" — the period itself is per line ("6-8 Weeks").

## Gotchas and constraints

A renamed template row ("Terms of payment") would no longer match.

## Related

- `src/app/(dashboard)/sales/create/page.tsx` — pre-fills Payment Terms and Delivery Schedule (`termValue`).
- `src/app/(dashboard)/client-purchase-orders/create/page.tsx` — pre-fills Payment / Delivery Terms (`termValue`).
- `src/app/api/client-purchase-orders/route.ts` — stores the order's terms via `orderTermRows`.
- `src/app/api/tenders/route.ts`, `src/app/api/tenders/[id]/route.ts` — store a tender's terms via `tenderTermRows`.
- `src/app/api/quotations/[id]/pdf/route.tsx`, `src/lib/po-acceptance/letter.ts` — print through `cleanTermValue`.
- Test: `src/lib/quotations/terms.test.ts`.
