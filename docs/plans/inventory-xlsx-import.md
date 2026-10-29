# Plan: load INVENTORY MASTER xlsx into inventory module

Tier: L. Stop after this plan. Waiting for approval and the decisions below.

## What the sheet is

- File: `C:\Users\USER\Downloads\INVENTORY MASTER - LATEST1.xlsx`, one sheet `Sheet1 (2)`.
- 72 data rows, 18 columns. Headers map 1:1 to `InventoryStock` fields:
  Form, Product, Specification, Additional, Dimension, Size, Ends, Length, Heat No., Make,
  Quantity (Mtr.), Piece, MTC No., MTC Date, MTC Type, TPI, Location, Notes.
- `Location` column = rack number (`rackNo`). Values: `2`, `4`, `7`, `8`, `11`, `17`, `21`, ...
- `TPI` = third-party inspection agency (BVIS, DNV-GL, TUV, ...), not a rack.

## Target model

`InventoryStock` (prisma/schema.prisma:1569). Already has `heatNo`, `rackNo`, `location`,
`mtcType` (enum `MTC_3_1` / `MTC_3_2`), `tpiAgency`, `companyId`. No schema change planned.

## Same heat on several racks (the case the user asked for)

- Rule: one `InventoryStock` row per sheet line. Never merge by heat number.
- Heat numbers on more than one rack in this sheet: `1557P` (racks 7 and 9, rows 20/31),
  `183236` (rack `8 & 11` and rack 11, rows 28/37).
- Same heat AND same rack also happens with different sizes (e.g. `1551P` rack 2, rows 5/6;
  `241090` rack 17, rows 47-49). Those are separate lines too. So uniqueness is NOT heat+rack.
- Heat search (`/api/search/heat-number`, `inventory/stock?heatNo=`) returns all rows for a heat,
  so the user sees every rack the heat sits on. Verify this in the existing UI in Step 4.

## Proposed approach (needs your OK)

1. One-off import script `scripts/import-inventory-xlsx.ts` (style of
   `scripts/migrate-warehouse-details-to-heats.ts`): `--dry-run` prints the mapped rows and
   the issues; without it, writes in one transaction. Re-running must not duplicate rows (see Q5).
2. Column mapping:
   - `Quantity` -> `quantityMtr` (round to 3 dp; sheet has float noise like `1575.8499999999995`).
   - `Piece` -> `pieces` (Int).
   - `Heat No.` -> `heatNo` as text. Some heats are numbers in the sheet (e.g. `3524685`).
   - `MTC No.` -> `mtcNo`, `MTC Date` -> `mtcDate`, `TPI` -> `tpiAgency` (`-` becomes null).
   - `MTC Type`: `3.1 MTC` -> MTC_3_1, `3.2 MTC` -> MTC_3_2. Others (`IBR - IIIA`, `III FORM D`,
     `3.2 & IBR`, `-`) -> null, original text kept in `notes`.
   - `Notes` and `Dimension` -> `notes` / `dimensionStd`, original text kept.
3. Data issues the importer must handle (these are the test cases; the user said there may be more):
   - Compound rack values: `5 & 8`, `8 & 11`, `9 & 21`. Proposed: keep verbatim in `rackNo`, flag in dry-run.
   - Text in date column: `20-03-26 & 11-03-26`, `04 & 27-05-23`, `04/09 & 18/09/2018`, `-`.
     Unparseable -> `mtcDate` null, raw text in `notes`. Never guess a date.
   - Length column is sometimes an Excel time (`06:00:00`) or a float. Store raw string in `length`.
   - Heat numbers as int and as string: normalize to trimmed string, no leading-zero loss
     (check `M253911B`-style heats are kept as-is).
   - Empty `Notes`, `-` in text fields -> null.
4. Status: default `UNDER_INSPECTION` (schema default) unless you choose otherwise (Q2).

## Decisions I need from you

- Q1. Same heat on two racks: separate rows per rack (proposed), or merge and track rack in another table?
- Q2. Initial `status` for imported stock: UNDER_INSPECTION (default), ACCEPTED, or per-row?
- Q3. Compound racks (`8 & 11`): keep text (proposed), or split into two rows with quantity divided?
- Q4. Import delivery: one-off script run by you (proposed), or an upload page in the inventory module?
- Q5. Re-run safety: skip rows whose (heatNo, mtcNo, sizeLabel, rackNo) already exist (proposed), or refuse if table not empty?
- Q6. Company: which `companyId` owns the rows? (`companyFilter` scopes every read by it.)
- Q7. Link `rackNo` to `WarehouseLocation` rows too, or keep text only (proposed: text only, as today).

## Gates (checklists to apply)

- Backend: parameterized Prisma only, transaction for writes, no secrets in logs, timeouts.
- Security: script needs `DATABASE_URL` from env, never printed. No file path leaks.

## Verify

- Test file for the mapping functions (pure functions, no DB): one test per edge case above
  (compound rack, unparseable date, time-typed length, int heat, float qty, duplicate heat+rack different size).
- Dry-run on the real file: expect 72 rows mapped, 2 multi-rack heats reported, 3 compound racks flagged.
- Run `npx tsc --noEmit` and the test runner. Report real output.
- After code change: `python3 -c "from graphify.watch import _rebuild_code; ..."` per CLAUDE.md.
- Docs: `docs/code/scripts/import-inventory-xlsx.ts.md`, `docs/code/.../*.test.ts.md` if a test file is added, row in `docs/code/INDEX.md`.

## Not in scope

- No change to stock UI, no schema change, no commit or push.
