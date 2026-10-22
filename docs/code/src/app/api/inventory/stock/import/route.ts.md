# src/app/api/inventory/stock/import/route.ts

> `/api/inventory/stock/import` — POST. Upload the inventory sheet; preview it, then write it.

See [../../../README.md](../../../README.md) for this module's shared behaviour.

## Why this exists

The company's inventory lives in an Excel sheet (`INVENTORY MASTER`, about 72
lines on the first load). Re-keying it by hand is what this route replaces. It is
the bulk counterpart to the manual add in `stock/route.ts`.

## What it does

Multipart POST with:

- `file` — `.xlsx`, `.xls` or `.csv`, at most 5 MB and 2000 data rows.
- `dryRun` — `"false"` writes; anything else (including absent) only previews.

Responses:

- Dry run: `{ dryRun: true, total, willCreate, duplicates, issues, warnings, preview }`.
  `preview` is the first 10 lines that would be written.
- Write: `{ dryRun: false, total, created, duplicates, issues, warnings }`.

Rejected lines (`issues`) are skipped; the valid lines are still written. This is
deliberate: one bad row in a 72-row sheet must not block the other 71. The
dry run shows the rejects first, so the user decides before anything is written.

## How it works

1. Auth and active company, as in the manual add.
2. `readStockSheet` reads the first sheet. An empty sheet is a 400.
3. The heat numbers from the file are looked up for duplicates (`existingStockKeys`).
4. `planStockImport` decides every line: write, duplicate, or reject.
5. Dry run returns the plan. A write run inserts `plan.toCreate` through `createStockRows`.
6. A write run also writes one audit row: `action: CREATE`, `tableName: InventoryStock`,
   `recordId` = the file name, `newValue` holds the counts and `import: true`.
   The audit enum has no IMPORT value, so `CREATE` with the marker in `newValue`
   is how an import is told apart from a single create.

## Gotchas

- **Dry run is the default.** A caller that forgets the field gets a preview, not
  a write. The UI always sends it explicitly.
- Rows are written in one `createMany`. A database failure fails the whole write;
  a rejected row never causes a partial failure.
- The duplicate check and the insert are two statements, not a locked
  transaction. A double-submit of the same file in parallel can write twice. Two
  sequential runs are safe. See `stock-write.ts`.
- The response lists every duplicate and issue. On a large file that can be long;
  the UI shows the first 20.
- Stock is written as `UNDER_INSPECTION`. The sheet holds no QC status, so every
  imported line must be released through QC before it is reservable.
- Excel reads the file on the server (`xlsx`). Nothing from the file is executed.

## Related

- `src/lib/inventory/stock-rows.ts` — what counts as valid and as a duplicate.
- `src/lib/inventory/stock-write.ts` — the lookup and insert.
- `src/components/inventory/import-stock-dialog.tsx` — the caller, which always previews first.
- `src/lib/audit.ts` — the audit call.
