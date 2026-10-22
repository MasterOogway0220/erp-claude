# src/components/inventory/import-stock-dialog.tsx

> The "Import Excel" dialog on the inventory Stock View. Pick a sheet, check it, then import.

## Why this exists

The company's inventory sheet has to load into the system without re-keying.
Importing a file blind is risky: a wrong sheet or a bad column writes wrong
stock. So the dialog always runs a check first and shows what would happen, and
only a second click writes.

## What it does

Exports `ImportStockDialog({ open, onOpenChange })`.

1. The user picks a `.xlsx`, `.xls` or `.csv` file.
2. "Check file" posts it with `dryRun=true`. The dialog shows counts (rows,
   will be added, already in stock, rejected), the rejected lines with reasons,
   the skipped duplicates, the warnings, and the first 10 rows that would be added.
3. "Import N lines" posts the same file with `dryRun=false`. On success it
   toasts, refreshes the stock query, and closes.

## How it works

- The file is sent as `FormData`, not JSON.
- Changing the file clears the previous preview, so a preview is never imported
  against a different file.
- The import button is disabled when nothing would be added.
- Lists are capped at 20 entries each in the display. The full data stays in the response.
- Closing while a request is in flight is ignored.

## Gotchas

- The dialog does not show the sheet's own rows before the check; the preview is
  the server's plan (`planStockImport`), so what you see is what the import writes.
- Warnings are informational: they describe values that were kept as text or
  adjusted (for example a length read as a time). They do not block the import.
- Duplicates show the heat and the rack from the normalised key, lower-cased.
- The company is the logged-in user's active company. The dialog has no company picker.

## Related

- `src/app/api/inventory/stock/import/route.ts` — the POST it calls.
- `src/lib/inventory/stock-rows.ts` — the plan it displays.
- `src/app/(dashboard)/inventory/page.tsx` — opens this dialog.
