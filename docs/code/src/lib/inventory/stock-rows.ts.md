# src/lib/inventory/stock-rows.ts

> Turns one stock line, typed into the add form or read from an uploaded
> inventory sheet, into an `InventoryStock` row, and reports what it could not use.

## Why this exists

Stock was only ever created from a goods receipt (GRN). The stores team holds
an existing inventory as a spreadsheet, `INVENTORY MASTER`, with one line per
pipe lot: product, size, heat number, quantity in metres, rack, and the mill
test certificate (MTC) reference. Without this file that spreadsheet has to be
re-keyed line by line.

A **heat number** is the batch number the steel mill stamps on a melt. An
**MTC** (mill test certificate, 3.1 or 3.2 in this business) is the document that
proves the steel's chemistry and strength. Every stock line has to point back to
both, because traceability (heat -> MTC -> rack) is what a customer or inspector
asks for.

The same heat can sit on several racks, so a line is identified by heat, MTC,
size and rack together, not by heat alone. Section "How it works" explains the rule.

## What it does

Exports:

- `normalizeStockRow(raw)` - validates one line. Accepts the form's JSON (camel-case,
  numbers or numeric strings) and the sheet's values after `fromSheetRow`. Returns
  `{ ok: true, row, warnings }` or `{ ok: false, error }`. Errors are user-facing text.
- `fromSheetRow(sheetRow)` - maps sheet headers (for example `Heat No.`, `Size `,
  `Location`) to field names. Unknown headers are ignored.
- `planStockImport(sheetRows, existingKeys)` - the whole import decision, pure:
  which lines would be written, which are duplicates, which were rejected, and
  what to warn about. Line numbers are sheet line numbers (header = line 1).
- `readStockSheet(buf)` - reads the first sheet of an `.xlsx`/`.xls`/`.csv` file.
- `stockKey(row)` - the identity used for duplicate checks.
- `parseLooseDate(s)` - the date formats accepted from text cells.

Types: `StockRow`, `ImportPlan`, `ImportIssue`, `MtcType` (`"MTC_3_1" | "MTC_3_2"`).

## How it works

- **Rejects, never guesses.** A line without product, heat number, or a positive
  quantity is rejected with a reason. Everything else that is unusable is kept
  as text in `notes` with a warning, so no value is silently dropped.
- **Quantity** is rounded to 3 decimals. The sheet holds float noise such as
  `1575.8499999999995`.
- **Heat number** is always stored as text. Some heats are integers in the sheet
  (`3524685`); they must not be stored as numbers, and must not lose leading characters.
- **Dates.** A real Excel date is taken by its calendar day (local components
  into UTC). Text is accepted only as one date (`dd-mm-yy`, `dd/mm/yyyy`,
  `yyyy-mm-dd`). A range such as `20-03-26 & 11-03-26` is not a date: `mtcDate` stays
  null, the text goes to `notes`, and a warning is raised.
- **MTC type.** `3.1 MTC` maps to `MTC_3_1`, `3.2 MTC` to `MTC_3_2`. Anything else
  (`IBR - IIIA`, `III FORM D`, `3.2 & IBR`) becomes null, the original text goes
  to `notes`, and a warning is raised. The database enum has only the two values.
- **Length.** Excel sometimes stores `6.00` as a time. A fraction of a day
  (0 < x < 1) is converted to `h:mm` with a warning, because the true length
  must be checked by a person.
- **Dash.** A lone `-` in any text field means "no value" and becomes null.
- **Duplicate rule.** `stockKey` = heat | MTC no. | size | rack, lower-cased.
  - Same heat on **two racks** is two lines (not a duplicate). This is the case in
    the INVENTORY MASTER sheet: heat `1557P` on racks 7 and 9, heat `183236` on
    racks 11 and `8 & 11`.
  - Same heat **and** rack with a **different size** is also two lines
    (`1551P` rack 2, sizes 4" SCH 120 and 4" SCH 160).
  - A repeat of the exact key, either inside the file or already in the database,
    is a duplicate and is skipped. This makes a re-run of the import safe.
- **Rack** text is kept verbatim. `8 & 11` stays `8 & 11`: the sheet's compound racks
  are not split, because the split quantity is not in the sheet.

## Domain notes

- **Rack** here is the storage position number written in the sheet's
  `Location` column. It is text, not a foreign key to `WarehouseLocation`.
- **TPI** (third-party inspection) names the inspection body that witnessed the
  mill test (BVIS, DNV-GL, TUV). The sheet's `TPI` column maps to `tpiAgency`.
  It is not a rack, despite sitting next to `Location`.
- **Quantity (Mtr.)** is length in metres, not weight. Pieces are a separate
  count of pipe lengths.

## Gotchas and constraints

- The sheet has 72 data rows (`INVENTORY MASTER - LATEST1.xlsx`) with 23 warnings
  on the first run: 2 unparseable MTC date ranges, 21 MTC types outside 3.1/3.2.
  Those warnings are expected, not bugs.
- The only sheet read is the first one. A workbook with the data on a second
  sheet imports nothing and says "no data rows".
- Pure module: it does not touch the database. Duplicate detection against the
  database is done by the caller, through `existingKeys` / `stock-write.ts`.
- `stockKey` lower-cases, so `1557p` and `1557P` are the same heat for duplicates.
  The stored value keeps the original case.

## Related

- `stock-rows.test.ts` - one case per edge above, plus the duplicate rule.
- `stock-write.ts` - reads existing keys and writes rows.
- `src/app/api/inventory/stock/route.ts` - POST (manual add).
- `src/app/api/inventory/stock/import/route.ts` - POST (sheet import, dry run by default).
- `prisma/schema.prisma` -> `InventoryStock`, `MTCType`.

## Change (2026-10-22, follow-up 2)

`readStockSheet` is async and reads with exceljs (was xlsx). It reads `.xlsx` and `.csv` only; the old `.xls` format is refused. Blank rows are kept so line numbers match the sheet, and `planStockImport` skips them silently. Excel dates (UTC midnight) are taken by their calendar day.
