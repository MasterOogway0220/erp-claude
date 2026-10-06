# Tender Terms & Conditions — design

Requested 2026-10-06: quotations have a Terms & Conditions section, tenders
do not. The 03/10 notebook line "Terms and condition" was misread as "terms
appearing twice" (item 12 in `docs/meeting-notes/2026-10-03-bug-report.md`)
and skipped. Approved by the user as written below.

## Behaviour

1. **Tender form, create and edit** (`/tenders/create`, `?editId=`): a
   collapsible "Terms & Conditions (N included)" card, the same as the
   quotation forms. It starts with the picked customer's saved terms
   (`CustomerTermDefault`), else the Offer Terms list (`OfferTermTemplate`).
   The list type is DOMESTIC for an INR tender and EXPORT for any other
   currency (a tender has no market-type field). Template rows can be ticked
   and given a value; "Add Custom Term" rows can also be renamed and removed.
   Changing the customer or crossing INR/non-INR reloads the defaults, as on
   quotations. Editing a tender loads its saved terms; a tender saved before
   this feature (no terms) gets the defaults.
2. **Tender detail page:** a read-only card of the ticked terms.
3. **Quotation from a tender** (`/quotations/create/standard|nonstandard?tenderId=`):
   starts with the tender's terms instead of the defaults, if the tender has
   any; changing them on the quotation works as usual.
4. **Sandbox login only.** Every file involved already has a `.sandbox` copy
   behind a gate; the code goes only there. `.legacy` copies are untouched.
5. **Storage:** new table `TenderTerm` (tenderId FK cascade, termNo,
   termName VARCHAR(191), termValue VARCHAR(191), isIncluded, isCustom).
   termValue matches `QuotationTerm.termValue` (not TEXT like ClientPOTerm)
   because the rows are copied into a quotation, and the live MySQL is
   non-strict: a longer value would be cut silently there. Both tender inputs
   carry `maxLength={191}`. isCustom is what keeps a user-added row renamable
   and removable after a reload; the quotation's isDefault / isHeadingEditable
   are derived from it (`!isCustom`, `isCustom`), as every live QuotationTerm
   row already has them.

## Server

- POST `/api/tenders`: `terms: { create: tenderTermRows(body.terms) }` nested
  in the existing create.
- GET `/api/tenders/[id]`: include `terms` ordered by `termNo`.
- PATCH `/api/tenders/[id]`: replace the terms inside the existing callback
  transaction, only when `Array.isArray(body.terms)` — the detail page's
  status-only PATCH must not wipe them. The edit form always sends `terms`.
- `tenderTermRows` (in `src/lib/quotations/terms.ts`): trim, drop blank rows,
  number 1..n, default isIncluded true / isCustom false. Test first.

## Live database

Additive: one new table, nothing existing changes, legacy code never reads it.
The user runs one guarded script: `migrate deploy` only if exactly this
migration is pending, then `CREATE TABLE sbx_TenderTerm LIKE TenderTerm` plus
its FK to `sbx_Tender`, then the real-vs-sandbox column check (must print zero
differences). The sandbox copies are not rebuilt, so the sandbox user's test
data is kept. This closes the gap that broke the sandbox on 2026-10-05.

## Done means

- `tenderTermRows` test written first and passing; full `npx vitest run` and
  `npx tsc --noEmit` no worse than the baseline.
- After the migration: parity check prints zero differences and
  `sbx_TenderTerm` exists.
- As the sandbox login: the tender form shows the terms card loaded from the
  defaults; create, reload, edit keep the terms; the detail page shows them; a
  quotation made from the tender starts with them.
- Docs companions updated; graphify rebuilt; quality-guardian review passed.
