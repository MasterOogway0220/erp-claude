# src/components/inventory/add-stock-dialog.tsx

> The "Add Stock" dialog on the inventory Stock View. One form, one row per stock line.

## Why this exists

Stock entry needs to work for a single pipe lot and for a whole delivery that
was never receipted through a GRN. One dialog covers both: a single item is just
one row, and "Add another item" makes it many. The same API call handles both.

## What it does

Exports `AddStockDialog({ open, onOpenChange })`. It keeps a list of line objects
in state, shows each as a card, and on save POSTs `{ items }` to `/api/inventory/stock`.

Required fields are Product, Heat No. and Quantity (Mtr.). The rest are optional.
MTC Type is a select: "Not set", 3.1 MTC, 3.2 MTC.

## How it works

- Each line is a flat object of strings. Empty strings are sent as they are; the
  server treats blank text as null and rejects a blank quantity.
- `mtcDate` and `mtcType` are sent as `null` when blank, because an empty string
  is not a valid date or enum.
- On success it shows a toast with the count, invalidates the `inventory-stock`
  query so the table refreshes, clears the form and closes.
- Server errors: `issues` (400) and `duplicates` (409) are mapped to the line
  they belong to, and the message shows under that line's card. A 409 without
  `issues` gets a generic "Already in stock" message on each duplicate line.
- Closing the dialog while saving is ignored, so an in-flight save cannot be
  orphaned.

## Gotchas

- The line index shown to the user ("Item 3") is the same as the server's `line`
  (1-based). Removing a line re-numbers the rest, so an error from a previous save
  is cleared on the next save.
- The form does not send `form` or `status`. The server sets `form` to the product
  and status to `UNDER_INSPECTION`.
- Rack is free text, for example `7` or `8 & 11`. There is no link to `WarehouseLocation`.

## Related

- `src/app/api/inventory/stock/route.ts` — POST handler.
- `src/app/(dashboard)/inventory/page.tsx` — opens this dialog from the Stock View tab.
- `src/lib/inventory/stock-rows.ts` — the validation the server applies.
