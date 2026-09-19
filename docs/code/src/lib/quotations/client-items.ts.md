# src/lib/quotations/client-items.ts

> Remembers the customer's item IDs from a saved non-standard quotation so they are offered again next time.

## Why this exists

On a **non-standard quotation** — one whose lines the pipe/fitting/flange
masters cannot describe, entered as free text — the customer identifies each
line by their own item ID: an SAP material number, a tender line number, a
plain "10". There is no material code of ours on such work. The client wanted
those IDs to be reusable the way a material code is: pick a customer, and the
IDs they have quoted before come up with their description, unit and price
history.

A material code only becomes reusable after someone presses **Record** on the
form. That step was never going to happen reliably for item IDs, so this
helper makes the master self-filling: every save writes the IDs it carried.

## What it does

`rememberClientItems({ customerId, quotationCategory, items, companyId })`

- Does nothing unless `quotationCategory === "NON_STANDARD"`.
- For each distinct, non-blank `materialCodeLabel` on the items, upserts a
  `ClientItemMaster` row keyed `(customerId, itemNo)`.
- A **new** ID is created with the line's `itemDescription` and `uom`.
- An **existing** ID is left exactly as it is (`update: {}`), so a description
  curated on the master page is never overwritten by a later quotation.
- Never throws: each upsert is wrapped, failures go to `console.error`. A
  missed suggestion must not fail a quotation save.

## How it works

Called after the save in `POST /api/quotations` and `PUT /api/quotations/[id]`,
outside the save transaction, and awaited so the row exists before the form's
`invalidateQueries(["client-items"])` refetch. The ID text is read from
`materialCodeLabel` because that is the column the non-standard form stores it
in (see the schema comment on `QuotationItem.materialCodeLabel`).

## Domain notes

`materialCodeLabel` is "the customer's identifier for this line": on a
standard quotation their material code, on a non-standard one their item ID.
Same column, so revise/compare/PO paths carry it without knowing which.

## Gotchas and constraints

- Item IDs are compared exactly (after trim) — "10" and "010" are two rows.
- Runs one upsert per distinct ID, sequentially; a 40-line quotation is 40
  round trips after the save. Fine at the volumes here.

## Related

- `src/app/api/quotations/route.ts`, `src/app/api/quotations/[id]/route.ts` — callers.
- `src/app/api/masters/client-items/route.ts` — the master's own API.
- `src/app/(dashboard)/masters/material-codes/client-items-tab.tsx` — where rows are curated.
- `prisma/migrations/20260919130000_client_item_master` — the table.
