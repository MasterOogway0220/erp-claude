# Tender Terms & Conditions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give tenders the quotation-style Terms & Conditions card, save them per tender, and start a quotation raised from a tender with them. Spec: `docs/superpowers/specs/2026-10-06-tender-terms-design.md`.

**Architecture:** New `TenderTerm` table (additive migration). The pure helper `tenderTermRows` prepares rows for storage. Only `.sandbox` copies of already-gated tender and quotation files change, so real users keep today's behaviour.

**Tech Stack:** Next.js 16 app router, Prisma 7 on MySQL (live Hostinger, non-strict), vitest 2.

## Global Constraints

- No `git commit` / `git push` without the user's say-so.
- Never edit `*.legacy.*` files. They must stay byte-identical to the pre-1cef3b8 code.
- `prisma.$transaction` callback form only (the sandbox router throws on the array form; `no-array-transactions.test.ts` guards it).
- `.env` is the LIVE DB. Claude applies nothing to it; the user runs the Task 5 script.
- Every changed code file gets its `docs/code/` companion updated in the same change. Then run the graphify rebuild from CLAUDE.md.
- Baseline (2026-10-06 10:29): `npx vitest run` = 1 failed (mtc-certificate-pdf.test.ts timeout, pre-existing) / 335 passed / 10 skipped; `npx tsc --noEmit` clean.

---

### Task 1: Storage and row helper

**Files:**
- Modify: `prisma/schema.prisma` (Tender relation at ~2796, new model after Tender)
- Create: `prisma/migrations/20261006100000_tender_terms/migration.sql`
- Modify: `src/lib/quotations/terms.ts`, test `src/lib/quotations/terms.test.ts`
- Docs: `docs/code/prisma/schema.prisma.md`, `docs/code/prisma/migrations.md`, `docs/code/src/lib/quotations/terms.ts.md`, `docs/code/INDEX.md:125`

**Produces:** `tenderTermRows(terms: {termName?, termValue?, isIncluded?, isCustom?}[] | null | undefined): {termNo:number, termName:string, termValue:string, isIncluded:boolean, isCustom:boolean}[]`; Prisma delegate `tenderTerm`; relation `Tender.terms`.

- [ ] Step 1: add the failing tests to `terms.test.ts`:

```ts
describe("tenderTermRows", () => {
  it("numbers rows in order, trims, keeps the included and custom flags", () => {
    expect(
      tenderTermRows([
        { termName: " Payment ", termValue: " 30 days ", isIncluded: true, isCustom: false },
        { termName: "LD Clause", termValue: "0.5% per week", isIncluded: false, isCustom: true },
      ])
    ).toEqual([
      { termNo: 1, termName: "Payment", termValue: "30 days", isIncluded: true, isCustom: false },
      { termNo: 2, termName: "LD Clause", termValue: "0.5% per week", isIncluded: false, isCustom: true },
    ]);
  });
  it("drops blank rows, numbers without gaps, defaults the flags", () => {
    expect(
      tenderTermRows([{ termName: " ", termValue: "", isCustom: true }, { termName: "Validity", termValue: "" }])
    ).toEqual([{ termNo: 1, termName: "Validity", termValue: "", isIncluded: true, isCustom: false }]);
  });
  it("handles a missing list", () => {
    expect(tenderTermRows(null)).toEqual([]);
  });
});
```

- [ ] Step 2: `npx vitest run src/lib/quotations/terms.test.ts`. Expect FAIL (`tenderTermRows` is not exported).
- [ ] Step 3: implement in `terms.ts`:

```ts
export function tenderTermRows(
  terms: { termName?: string | null; termValue?: string | null; isIncluded?: boolean | null; isCustom?: boolean | null }[] | null | undefined
) {
  return (terms ?? [])
    .map((t) => ({
      termName: (t.termName ?? "").trim(),
      termValue: (t.termValue ?? "").trim(),
      isIncluded: t.isIncluded ?? true,
      isCustom: t.isCustom ?? false,
    }))
    .filter((t) => t.termName || t.termValue)
    .map((t, i) => ({ termNo: i + 1, ...t }));
}
```

- [ ] Step 4: re-run. Expect PASS.
- [ ] Step 5: schema. Add `terms          TenderTerm[]` under `items          TenderItem[]` in `model Tender`, then a new model after it:

```prisma
model TenderTerm {
  id         String  @id @default(cuid())
  tenderId   String
  termNo     Int
  termName   String
  termValue  String
  isIncluded Boolean @default(true)
  isCustom   Boolean @default(false)
  tender     Tender  @relation(fields: [tenderId], references: [id], onDelete: Cascade)

  @@index([tenderId])
}
```

- [ ] Step 6: migration SQL. Clone the shape of `20261005094000_client_po_terms`: header comments; CREATE TABLE `TenderTerm` (id VARCHAR(191), tenderId VARCHAR(191), termNo INTEGER, termName VARCHAR(191), termValue VARCHAR(191), isIncluded BOOLEAN DEFAULT true, isCustom BOOLEAN DEFAULT false, INDEX `TenderTerm_tenderId_idx`, PK); a separate ADD CONSTRAINT `TenderTerm_tenderId_fkey` … REFERENCES `Tender`(`id`) ON DELETE CASCADE ON UPDATE CASCADE.
- [ ] Step 7: `npx prisma generate`. Check that the SQL matches what Prisma would emit: run `npx prisma migrate diff` from the pre-change schema (`git show HEAD:prisma/schema.prisma`) to the new one with `--script`. Expect the same CREATE TABLE / FK, nothing else.
- [ ] Step 8: docs (schema paragraph, migrations table row, terms.ts doc, INDEX row).

### Task 2: Tender API (sandbox copies)

**Files:** `src/app/api/tenders/route.sandbox.ts`, `src/app/api/tenders/[id]/route.sandbox.ts`; docs `docs/code/src/app/api/tenders/route.ts.md`, `docs/code/src/app/api/tenders/[id]/route.ts.md`.

**Consumes:** `tenderTermRows`, `prisma.tenderTerm`.

- [ ] POST: import `tenderTermRows` from `@/lib/quotations/terms`, destructure `terms`, add `terms: { create: tenderTermRows(terms) },` beside `items` in `prisma.tender.create`.
- [ ] GET [id]: add `terms: { orderBy: { termNo: "asc" } },` to the include.
- [ ] PATCH: inside the existing callback transaction, after the items block:

```ts
if (Array.isArray(body.terms)) {
  await tx.tenderTerm.deleteMany({ where: { tenderId: id } });
  const termRows = tenderTermRows(body.terms);
  if (termRows.length) {
    await tx.tenderTerm.createMany({ data: termRows.map((r) => ({ ...r, tenderId: id })) });
  }
}
```

- [ ] Check: `npx tsc --noEmit` clean; `npx vitest run src/lib/sandbox` green (no-array-transactions).

### Task 3: Tender form and detail page (sandbox copies)

**Files:** `src/app/(dashboard)/tenders/create/page.sandbox.tsx`, `src/app/(dashboard)/tenders/[id]/page.sandbox.tsx`; docs for both `page.tsx.md`.

- [ ] Form: `TenderTerm` interface {termName, termValue, isIncluded, isCustom}; `termsTypeFor(currency)` = INR→"DOMESTIC" else "EXPORT"; state `terms`, `showTerms`, `termsKeyRef`, `editLoaded`.
- [ ] Edit load: map `t.terms`. If there are any, set them and `termsKeyRef` = `${termsTypeFor(t.currency)}|${t.customerId}`. Always `setEditLoaded(true)`.
- [ ] Loader effect on `[editLoaded, currency, customerId]`: skip until `editLoaded`, skip if the key is unchanged. Try the customer's `/api/masters/customers/{id}/terms?quotationType=`, fall back to `/api/offer-term-templates?quotationType=`. Drop the result if the key has changed since. Apply `fillBlankCurrencyTerm`.
- [ ] Immutable handlers `updateTerm(index, patch)`, `addCustomTerm()`, `removeTerm(index)`; payload gets `terms`.
- [ ] Card between Items and Remarks: a copy of the quotation card (collapsible, "(N included)", Add Custom Term). The name Input is shown only for `isCustom` rows, and the delete button only on `isCustom` rows. Both inputs get `maxLength={191}`. The card always renders, with no customer requirement.
- [ ] Detail: `terms?` on the interface, and a read-only card of ticked rows after Line Items (copy of the CPO detail card).
- [ ] Check: `npx tsc --noEmit` clean.

### Task 4: Quotation from a tender starts with its terms (sandbox copies)

**Files:** `src/app/(dashboard)/quotations/create/standard/page.sandbox.tsx`, `.../nonstandard/page.sandbox.tsx`; docs `docs/code/src/app/(dashboard)/quotations/create/standard/page.tsx.md`, `.../nonstandard/page.tsx.md`.

- [ ] `const tenderTermsRef = useRef<typeof terms | null>(null);` next to `termsLoadedForKey`.
- [ ] Loader: the first branch is `if (tenderTermsRef.current) setTerms(tenderTermsRef.current.map((t) => ({ ...t })));`, then `else if (formData.customerId) …`. Both stale guards also return when `tenderTermsRef.current` is set.
- [ ] Prefill: if `tender.terms?.length`, map to `{termName, termValue, isIncluded, isCustom, isHeadingEditable: isCustom}`, store in the ref, then `setTerms` with a copy.
- [ ] Check: `npx tsc --noEmit` clean.

### Task 5: Live DB (user runs it)

- [ ] Scratchpad script `apply-tender-terms.cjs`. It applies `migrate deploy` only if the pending list is exactly `["20261006100000_tender_terms"]`. If `sbx_TenderTerm` is missing it runs `CREATE TABLE sbx_TenderTerm LIKE TenderTerm` and `ADD CONSTRAINT sbx_TenderTerm_tenderId_fkey … REFERENCES sbx_Tender(id) ON DELETE CASCADE ON UPDATE CASCADE`. Then it runs the real-vs-sbx column parity check and exits 1 on any difference.
- [ ] Before handing it over: a read-only check that `Tender.id` is VARCHAR(191) utf8mb4_unicode_ci (FK compatibility).
- [ ] After the user runs it: re-run the parity check read-only, expecting 0 differences, and confirm the sbx_TenderTerm FK exists.

### Task 6: Verify and review

- [ ] `npx vitest run` (no new failures vs baseline), `npx tsc --noEmit`, eslint on touched files.
- [ ] Local dev server as the sandbox login, read-only: the tender create page shows the card with the Offer Terms rows; `GET /api/tenders/{id}` returns `terms`.
- [ ] User-run round-trip script as the sandbox login (create a tender with terms, read back, edit, status-only PATCH keeps terms, soft-delete the test tender). Then a read-only browser check that `/quotations/create/standard?tenderId=` shows the tender's terms.
- [ ] quality-guardian review; fix findings; graphify rebuild; memory note.
