# Live-Test Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the five problems the 6 Oct live test found, for the sandbox login only.

**Architecture:** One additive column (`SalesOrderItem.quotationItemId`) plus three pure
helpers (`poVsQuotation`, `cleanTermValue`, `letterAddressee`) with unit tests; the
screens that change are `X.sandbox.*` copies behind the existing gates
(`ReviewStep.tsx` becomes a new gate). Spec:
`docs/superpowers/specs/2026-10-06-live-test-followups-design.md`.

**Tech Stack:** Next.js 16, React 19, Prisma 7.3 (MariaDB adapter, live MySQL), vitest.

## Global Constraints

- New behaviour reaches the sandbox login only; `X.legacy.*` files are never edited.
- Prisma `$transaction` callback form only (the sandbox router rejects the array form).
- Never run `prisma format` (it rewrites unrelated models); edit the schema by hand.
- Live MySQL is non-strict: read values back after a save.
- The migration is applied to the live DB (with its `sbx_` twin and a parity check)
  BEFORE the push, because ungated routes start writing the column.
- Every changed code file gets its `docs/code/<path>.md` updated in the same commit.

---

### Task 1: `SalesOrderItem.quotationItemId`

**Files:** Modify `prisma/schema.prisma` (models `SalesOrderItem`, `QuotationItem`);
Create `prisma/migrations/20261006130000_sales_order_item_quotation_link/migration.sql`;
docs `docs/code/prisma/schema.prisma.md`, `docs/code/prisma/migrations.md`.

- [ ] **Step 1: Schema.** In `SalesOrderItem`, after `itemDescription`:

```prisma
  // The quotation line this order line came from, directly or through a client
  // PO line; a split line's parts share one. Null on lines added by hand and on
  // orders made before 6 Oct 2026.
  quotationItemId          String?
```

with the relations: `quotationItem            QuotationItem?            @relation(fields: [quotationItemId], references: [id], onDelete: SetNull)`
and `@@index([quotationItemId])`. In `QuotationItem` next to `clientPOItems`:
`salesOrderItems   SalesOrderItem[]`.

- [ ] **Step 2: Migration SQL**

```sql
ALTER TABLE `SalesOrderItem` ADD COLUMN `quotationItemId` VARCHAR(191) NULL;
CREATE INDEX `SalesOrderItem_quotationItemId_idx` ON `SalesOrderItem`(`quotationItemId`);
ALTER TABLE `SalesOrderItem`
  ADD CONSTRAINT `SalesOrderItem_quotationItemId_fkey`
  FOREIGN KEY (`quotationItemId`) REFERENCES `QuotationItem`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 3: Check against Prisma.** `git show HEAD:prisma/schema.prisma > <scratch>/schema-head.prisma`,
then `npx prisma migrate diff --from-schema-datamodel <scratch>/schema-head.prisma --to-schema-datamodel prisma/schema.prisma --script`.
Expected: the same three statements. Then `npx prisma validate` and `npx prisma generate`.

### Task 2: `poVsQuotation` (TDD)

**Files:** Create `src/lib/calc/po-vs-quotation.ts`, `src/lib/calc/po-vs-quotation.test.ts`, doc + INDEX row.

**Produces:** `poVsQuotation(po: PoLine[], quoted: QuotedLine[]): ComparisonRow[]`;
`ComparisonRow.itemNo` is a string ("1, 2" for a split line).

- [ ] **Step 1: Failing tests** — split parts sum against their quoted line (no variance,
  itemNo "1, 2"); a part order compares each line with its own quoted line; no links →
  pairs by S.No as before; an unlinked line among linked ones is its own row with
  nothing quoted; a short-ordered single line shows qty variance −20; split parts at
  different rates compare their weighted average.
- [ ] **Step 2:** `npx vitest run src/lib/calc/po-vs-quotation.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement**

```ts
export function poVsQuotation(po: PoLine[], quoted: QuotedLine[]): ComparisonRow[] {
  if (!po.some((l) => l.quotationItemId)) return po.map((l) => row([l], quoted.find((q) => q.sNo === l.sNo)));
  const groups = new Map<string, PoLine[]>();
  for (const l of po) {
    const key = l.quotationItemId ?? `line:${l.sNo}`;
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }
  return [...groups].map(([key, lines]) => row(lines, quoted.find((q) => q.id === key)));
}
```

`row(lines, q)`: poQty / poAmount summed; poRate = single line's rate, else poAmount ÷ poQty;
variances PO − quotation; `hasVariance` when any |variance| > 0.01.
- [ ] **Step 4:** tests PASS.

### Task 3: Review step (gate + sandbox copy)

**Files:** `src/components/order-wizard/ReviewStep.tsx` → gate;
Create `ReviewStep.legacy.tsx` (`git show HEAD:…/ReviewStep.tsx`, byte-identical) and
`ReviewStep.sandbox.tsx`; docs `ReviewStep.tsx.md`, INDEX gate count 40 → 41.

- [ ] **Step 1:** copy HEAD to `.legacy.tsx` and `.sandbox.tsx`; gate file:

```tsx
"use client";
// Sandbox preview (2026-10-06): the sandbox login gets ./ReviewStep.sandbox, everyone
// else ./ReviewStep.legacy. Going live: replace this file with ReviewStep.sandbox.tsx.
import { sandboxSwitch } from "@/components/sandbox/preview-gate";
import { ReviewStep as Next } from "./ReviewStep.sandbox";
import { ReviewStep as Legacy } from "./ReviewStep.legacy";
export const ReviewStep = sandboxSwitch(Next, Legacy, null);
```

- [ ] **Step 2: sandbox copy** — types gain `quotation.items[].id`, `items[].quotationItemId`,
  `items[].uom`, `SOItem.uom`; `populateEditForm` copies `uom`; the comparison block becomes
  `poVsQuotation(...)` (Decimal strings → `Number`); header `Quantity (unit)` when every
  line shares a unit, else `Quantity`; edit label `Qty ({item.uom || "Mtr"})`.

### Task 4: Writers of the link + Create Order line dates

**Files:** `src/app/api/sales-orders/from-cpo/route.ts`, `src/app/api/sales-orders/route.ts`,
`src/app/api/sales-orders/[id]/route.sandbox.ts`, `src/app/(dashboard)/sales/create/page.sandbox.tsx`; their docs.

- [ ] from-cpo: `quotationItemId: cpoItem.quotationItemId,` in the item map.
- [ ] POST: `quotationItemId: item.quotationItemId || null,`.
- [ ] sandbox PUT: `quotationItemId` in the kept `select` and in `keptFields`.
- [ ] Create Order page:

```ts
const quotedLineDate = (period: string | null | undefined, poDate: string) =>
  deliveryScheduleToDate(period, poDate || new Date()) ||
  format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");
```

  lines from a quotation get `quotationItemId: item.id`, `quotedDelivery: item.delivery`,
  `deliveryDate: quotedLineDate(item.delivery, formData.customerPoDate)` (callback deps gain
  `formData.customerPoDate`); the PO date input re-dates lines with `quotedDelivery` and no
  `dateTyped`; `updateItem` sets `dateTyped` when `deliveryDate` changes.

### Task 5: Unit labels on the order page

**Files:** `src/app/(dashboard)/sales/[id]/page.sandbox.tsx`, doc.

- [ ] `{reservedQty.toFixed(3)} {item.uom || "Mtr"}` and `Shortfall: {shortfall.toFixed(3)} {item.uom || "Mtr"}`.

### Task 6: `cleanTermValue` (TDD) and print-time use

**Files:** `src/lib/quotations/terms.ts` (+ test), `src/app/api/quotations/[id]/pdf/route.sandbox.tsx`,
`src/lib/po-acceptance/letter.ts`; docs.

- [ ] Failing tests: `": Ex-Godown"` → `"Ex-Godown"`, `" :: x "` → `"x"`, inner colons kept, null → `""`.
- [ ] Implement `cleanTermValue(v) = (v ?? "").replace(/^[\s:]+/, "").trim()`; `termValue` uses it.
- [ ] PDF route renders `{ ...quotation, terms: quotation.terms.map((t) => ({ ...t, termValue: cleanTermValue(t.termValue) })) }`;
  `letterData` maps the PO terms through it.

### Task 7: `letterAddressee` (TDD)

**Files:** `src/lib/po-acceptance/letter.ts` (+ test), doc.

- [ ] Failing tests: no billing → customer unchanged; picked site → its name/lines/"city - PIN"/state;
  site GSTIN wins; no site GSTIN → customer's only in the same state; no company name →
  customer name; typed text → printed as the address, no separate GSTIN.
- [ ] Implement; `LETTER_INCLUDE.clientPurchaseOrder.include.billingAddress = true`;
  `customer: letterAddressee(cpo.customer, cpo.billingAddress ?? null, cpo.billingAddressText)`.

### Task 8: Verify and review

- [ ] `npx tsc --noEmit` clean; `npx vitest run` all pass; eslint on changed files, no new problems.
- [ ] quality-guardian review; fix confirmed findings.
- [ ] graphify rebuild.

### Task 9: Migrate, commit, push, deploy

- [ ] Guarded script (scratchpad): checks the DB is the expected one, only this migration
  pending → `prisma migrate deploy` → adds `sbx_SalesOrderItem.quotationItemId` + index + FK
  to `sbx_QuotationItem` → column-parity check over every real table.
- [ ] Commit (spec, plan, code, docs, graph) and push; wait for the Vercel deploy to be Ready.

### Task 10: Live re-test on the sandbox login

- [ ] New quotation → client PO with a split and a skipped line → acceptance → order:
  Review step shows no false variance.
- [ ] SO/2026-27/00011 shows Reserved / Shortfall in Nos.
- [ ] NPS/26/15287 and POA/2026-27/00012 PDFs print single colons.
- [ ] POA/2026-27/00011 PDF is addressed to the PO's billing site.
- [ ] Direct Create Order from an unlinked quotation dates lines from their quoted period,
  and they follow the Customer PO date.
- [ ] Any failure → systematic-debugging → fix → repeat Tasks 8–10.
