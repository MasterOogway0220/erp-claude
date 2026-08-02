# src/lib/export-utils.ts

> Builds a CSV from rows and column definitions, and hands it to the browser as
> a download.

## Why this exists

Several list screens offer "Export to Excel". The data is already on the
client, so a round trip to generate a file server-side would be wasted work.

The two things that make a hand-rolled CSV go wrong are quoting and encoding,
and both are handled here once.

## What it does

| Export | Purpose |
|---|---|
| `ExportColumn` | `{ key, header, format? }`. |
| `generateCSV(data, columns)` | Rows → a CSV string. |
| `downloadCSV(content, filename)` | Saves it. |

## How it works

### Quoting

**Every** field is wrapped in quotes, not just those that need it. Simpler and
safer than deciding per value: product descriptions contain commas
(`6"NB X SCH 40, BE`), remarks contain newlines, and a missed case corrupts the
row alignment rather than one cell.

Embedded quotes are doubled (`"` → `""`), which is the CSV escape. Note that
sizes contain inch marks — `6"NB` — so this path is exercised constantly, not
rarely.

`null` and `undefined` become `""` rather than the strings "null"/"undefined".

### The BOM

```ts
new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" })
```

`﻿` is a UTF-8 byte order mark. Excel on Windows ignores the charset in
the MIME type and assumes the system codepage, so without the BOM any non-ASCII
character — `₹`, `°` in `90° ELBOW`, a customer name with an accent — renders
as mojibake. The BOM is what makes Excel read it as UTF-8.

This single character is the reason to use this helper rather than assembling a
CSV inline.

### `format`

An optional per-column formatter, for dates and currency. Applied before
stringification so the caller controls locale rather than getting
`toString()`'s default.

## Domain notes

None — but note the inch marks and degree symbols in product data are exactly
what the quoting and BOM handling exist for.

## Gotchas and constraints

- **CSV, not real Excel.** The buttons say "Export to Excel"; the file is a
  `.csv` Excel opens. No formatting, formulas or multiple sheets.
- **`downloadCSV` does not remove the anchor** from the DOM — it never appends
  it, relying on a detached element being clickable. Works in current browsers.
  It does revoke the object URL.
- **Line ending is `\n`**, not the CSV spec's `\r\n`. Excel copes.
- No streaming; the whole file is built in memory.

## Related

- Various `src/app/(dashboard)/**/page.tsx` export buttons.
- `src/app/api/reports/client-status/[salesOrderId]/excel/route.ts` — a
  server-side export that does produce a real workbook.
