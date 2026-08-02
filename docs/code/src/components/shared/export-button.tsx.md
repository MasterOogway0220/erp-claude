# src/components/shared/export-button.tsx

> "Export to Excel" for a list screen.

## What it does

Takes rows and column definitions, builds a CSV and downloads it.

## How it works

Delegates to `generateCSV` and `downloadCSV` in `src/lib/export-utils.ts`. The
component is the button and its filename convention; the encoding lives there.

## Gotchas and constraints

- **Produces CSV, not a real workbook**, despite the label. Excel opens it.
- **Exports what it is given** — the current page's rows, so a filtered or
  paginated view exports only what is visible. Users generally expect
  everything.
- The UTF-8 BOM that makes Excel read `₹` and `°` correctly is added in
  `export-utils.ts`; do not bypass it.

## Related

- `src/lib/export-utils.ts`
- `src/components/shared/data-table.tsx`
