# Sales PRD — Plan 03: Step 2 (P.O. Acceptance) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement PRD §3 (Step 2 — P.O. Acceptance): add an Acceptance Details field, remove the signed-PO upload, add an editable consolidated Charges & Commercials box (initialized from the CPO), convert the create page into a 3-step backtrackable wizard, auto-generate the acceptance PDF on submit with a preview-and-send drawer, and rename the SO-creation button.

**Architecture:** Extend `POAcceptance` in place with the missing detail field, wizard state, PDF-audit field, and a mirror of the CPO charge/commercial fields (so charges can be adjusted at acceptance time, recomputed with the existing `src/lib/calc/po-totals.ts`). Drop the unused `attachmentUrl`. Refactor the create page into a 3-step wizard (Details+Contacts → Charges & Commercials → Review). On submit, persist + generate the PDF (existing template) and open a Sheet drawer to preview and send via the existing email route.

**Tech Stack:** Next.js 16 (App Router) · Prisma 7 (MariaDB) · TypeScript · Vitest · nodemailer (existing)

---

## Spec reconciliation (verified against code 2026-05-24)

The design spec's §3 assumptions diverged from reality. Corrected understanding:

| PRD | Spec assumed | Reality / decision |
|---|---|---|
| §3.1 | add several fields | CDD, Remarks, and a "Client Contact / Department Contact Details" section (followUp/quality/accounts) ALREADY exist on the create page. Only ADD a distinct `acceptanceDetails` text field. |
| §3.2 | `signedPoCopyPath` | Actual field is `attachmentUrl`, referenced in 5 places (create page, POST route ×2, [id] page ×3). Remove UI + drop column + clean all refs. |
| §3.3 | button on acceptance page | The "Create Sales Order" button is on the **CPO detail page** (`client-purchase-orders/[id]/page.tsx`), gated on acceptance status ISSUED. Rename THERE. |
| §3.4 | merge two existing boxes | No charge boxes exist on acceptance today. **Per user decision: ADD an editable Charges & Commercials box to the acceptance**, initialized from the CPO, recomputed with `computePOTotals`. New schema + UI. |
| §3.5 | auto PDF + email | PDF currently renders inline HTML (not persisted); email sends inline HTML (no attachment). Existing Download-PDF + Send-to-Client buttons live on [id] page. Enhancement: auto-generate on submit + Preview Drawer + explicit Send (D9). |
| §3.6 | wizard incl. charges | Wizard = Step 1 Details+Contacts → Step 2 Charges & Commercials → Step 3 Review & Submit. Back/Next preserve state; `wizardStep` persists. |

---

## File structure

```
prisma/schema.prisma                                        ← MODIFY (POAcceptance fields)
prisma/migrations/<ts>_step2_po_acceptance/migration.sql    ← CREATE (manual; see Task 1 + DB constraint memory)
src/app/api/po-acceptance/route.ts                          ← MODIFY (new fields, copy charges from CPO, drop attachmentUrl)
src/app/api/po-acceptance/[id]/route.ts                     ← MODIFY (PATCH new fields incl. charges + wizardStep)
src/app/api/po-acceptance/[id]/finalize/route.ts            ← CREATE (persist final + mark PDF generated, return preview meta)
src/app/(dashboard)/po-acceptance/create/page.tsx          ← MODIFY (3-step wizard, remove upload, charges box, preview drawer)
src/app/(dashboard)/po-acceptance/[id]/page.tsx            ← MODIFY (remove attachmentUrl display)
src/app/(dashboard)/client-purchase-orders/[id]/page.tsx   ← MODIFY (rename Create Sales Order → Start Order Processing)
```

---

## Task 1: Schema migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<ts>_step2_po_acceptance/migration.sql`

> **DB constraint:** This project is MariaDB on Hostinger shared hosting; `prisma migrate dev` shadow DB is blocked and `--accept-data-loss` is unsupported in Prisma v7. Use `--create-only` (or hand-write the SQL), then `npx prisma migrate deploy`, then verify with `SHOW COLUMNS`.

- [ ] **Step 1: Add fields to `POAcceptance` (around line 2306)**

Add under `remarks`:

```prisma
  acceptanceDetails     String?                @db.Text
  wizardStep            Int                    @default(1)
  pdfGeneratedAt        DateTime?
  // §3.4 charges & commercials captured/adjusted at acceptance (mirrors CPO)
  gstRate               Decimal?               @db.Decimal(5, 2)
  isInterState          Boolean                @default(false)
  freight               Decimal?               @db.Decimal(14, 2)
  freightTaxApplicable  Boolean                @default(false)
  packingForwarding     Decimal?               @db.Decimal(14, 2)
  packingTaxApplicable  Boolean                @default(false)
  insurance             Decimal?               @db.Decimal(14, 2)
  insuranceTaxApplicable Boolean               @default(false)
  otherCharges          Decimal?               @db.Decimal(14, 2)
  otherChargesTaxApplicable Boolean            @default(false)
  testingCharges        Decimal?               @db.Decimal(14, 2)
  testingTaxApplicable  Boolean                @default(false)
  tpiCharges            Decimal?               @db.Decimal(14, 2)
  tpiTaxApplicable      Boolean                @default(false)
  additionalChargesTotal Decimal?              @db.Decimal(14, 2)
  subtotal              Decimal?               @db.Decimal(14, 2)
  taxableAmount         Decimal?               @db.Decimal(14, 2)
  cgst                  Decimal?               @db.Decimal(14, 2)
  sgst                  Decimal?               @db.Decimal(14, 2)
  igst                  Decimal?               @db.Decimal(14, 2)
  roundOff              Decimal?               @db.Decimal(10, 2)
  grandTotal            Decimal?               @db.Decimal(14, 2)
```

REMOVE the line `attachmentUrl  String?`.

- [ ] **Step 2: Generate + apply migration**

```bash
cd /Users/adi0220/projects/erp-claude && npx prisma migrate dev --name step2_po_acceptance --create-only
```
If the SQL isn't generated (shadow DB error), hand-write `migration.sql` in the new migration dir with: one `ALTER TABLE POAcceptance ADD COLUMN ...` per added field (correct MariaDB types — `DECIMAL(14,2)`, `TINYINT(1) NOT NULL DEFAULT 0` for booleans, `DATETIME(3)`, `INT NOT NULL DEFAULT 1`, `TEXT`) and one `ALTER TABLE POAcceptance DROP COLUMN attachmentUrl`. Then:
```bash
cd /Users/adi0220/projects/erp-claude && npx prisma migrate deploy && npx prisma generate
```

- [ ] **Step 3: Verify live DB got the columns**

```bash
cd /Users/adi0220/projects/erp-claude && cat > /tmp/chk.mjs <<'JS'
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const cols = await p.$queryRaw`SHOW COLUMNS FROM POAcceptance`;
  const names = cols.map(c => c.Field);
  console.log("has acceptanceDetails:", names.includes("acceptanceDetails"));
  console.log("has wizardStep:", names.includes("wizardStep"));
  console.log("has grandTotal:", names.includes("grandTotal"));
  console.log("attachmentUrl absent:", !names.includes("attachmentUrl"));
} finally { await p.$disconnect(); }
JS
npx tsx /tmp/chk.mjs && rm /tmp/chk.mjs
```
Expected: first three `true`, last `true`.

- [ ] **Step 4: Capture the attachmentUrl TS errors (don't fix yet)**

```bash
cd /Users/adi0220/projects/erp-claude && npx tsc --noEmit 2>&1 | grep -E "attachmentUrl|error TS" | head -20
```
Expect errors in `po-acceptance/route.ts`, `po-acceptance/create/page.tsx`, `po-acceptance/[id]/page.tsx`. These are fixed in Tasks 3, 5, and 6.

- [ ] **Step 5: Commit**

```bash
cd /Users/adi0220/projects/erp-claude && git add prisma/schema.prisma prisma/migrations/ && git commit -m "$(cat <<'EOF'
feat: schema for P.O. Acceptance Step 2 (PRD §3)

POAcceptance: + acceptanceDetails, wizardStep, pdfGeneratedAt, and a
mirror of the CPO charge/commercial fields (freight/packing/insurance/
other/testing/tpi + tax flags, gstRate, isInterState, subtotal,
taxableAmount, cgst/sgst/igst, roundOff, grandTotal) so charges can be
adjusted at acceptance. Drops unused attachmentUrl (§3.2).

API + UI edits follow.
EOF
)"
```
Do NOT push.

---

## Task 2: Rename "Create Sales Order" → "Start Order Processing" (PRD §3.3)

**Files:**
- Modify: `src/app/(dashboard)/client-purchase-orders/[id]/page.tsx`

- [ ] **Step 1: Find the button**

```bash
cd /Users/adi0220/projects/erp-claude && grep -n "Create Sales Order\|from-cpo\|sales-orders" "src/app/(dashboard)/client-purchase-orders/[id]/page.tsx"
```

- [ ] **Step 2: Rename the visible label**

Change the button label text "Create Sales Order" to **"Start Order Processing"**. Change ONLY the user-visible label (and any tooltip/confirmation text that repeats it). Do NOT change the endpoint it calls (`/api/sales-orders/from-cpo`) or the navigation.

- [ ] **Step 3: Type-check + commit**

```bash
cd /Users/adi0220/projects/erp-claude && npx tsc --noEmit 2>&1 | grep "client-purchase-orders/\[id\]" | head
cd /Users/adi0220/projects/erp-claude && git add "src/app/(dashboard)/client-purchase-orders/[id]/page.tsx" && git commit -m 'feat(ui): rename "Create Sales Order" → "Start Order Processing" (PRD §3.3)'
```
Do NOT push.

---

## Task 3: API — accept new fields, copy charges from CPO, drop attachmentUrl

**Files:**
- Modify: `src/app/api/po-acceptance/route.ts`
- Modify: `src/app/api/po-acceptance/[id]/route.ts`

- [ ] **Step 1: Read both routes**

```bash
cd /Users/adi0220/projects/erp-claude && sed -n '1,167p' src/app/api/po-acceptance/route.ts
cd /Users/adi0220/projects/erp-claude && sed -n '1,165p' src/app/api/po-acceptance/\[id\]/route.ts
```

- [ ] **Step 2: POST route — drop attachmentUrl, add new fields, copy charges from CPO**

In `src/app/api/po-acceptance/route.ts`:
- Remove the `attachmentUrl` body read (~line 77) and the `attachmentUrl: attachmentUrl || null` in the create data (~line 134).
- Read from body: `acceptanceDetails`, and the charge fields (`gstRate`, `isInterState`, `freight`, `freightTaxApplicable`, `packingForwarding`, `packingTaxApplicable`, `insurance`, `insuranceTaxApplicable`, `otherCharges`, `otherChargesTaxApplicable`, `testingCharges`, `testingTaxApplicable`, `tpiCharges`, `tpiTaxApplicable`), and computed totals (`additionalChargesTotal`, `subtotal`, `taxableAmount`, `cgst`, `sgst`, `igst`, `roundOff`, `grandTotal`).
- When charge fields are absent from the body (e.g. legacy callers), initialize them from the related CPO. After loading the CPO (the handler already looks it up to validate / pull customer), copy CPO charge fields as defaults:

```ts
const cpo = await prisma.clientPurchaseOrder.findUnique({
  where: { id: clientPurchaseOrderId },
  select: {
    gstRate: true, isInterState: true,
    freight: true, freightTaxApplicable: true,
    packingForwarding: true, packingTaxApplicable: true,
    insurance: true, insuranceTaxApplicable: true,
    otherCharges: true, otherChargesTaxApplicable: true,
    testingCharges: true, testingTaxApplicable: true,
    tpiCharges: true, tpiTaxApplicable: true,
    additionalChargesTotal: true, subtotal: true, taxableAmount: true,
    cgst: true, sgst: true, igst: true, roundOff: true, grandTotal: true,
  },
});
```
Then in the create `data`, set each charge field to `body.<field> ?? cpo?.<field> ?? null` (booleans: `body.<flag> ?? cpo?.<flag> ?? false`). Add `acceptanceDetails: acceptanceDetails ?? null` and `wizardStep: body.wizardStep ?? 1`.

- [ ] **Step 3: PATCH route — accept new fields**

In `src/app/api/po-acceptance/[id]/route.ts` PATCH: allow updating `acceptanceDetails`, `wizardStep`, and all the charge/commercial fields (so the wizard can save drafts at each step). Keep existing contact + date + status updates. Do not reference `attachmentUrl`.

- [ ] **Step 4: Type-check**

```bash
cd /Users/adi0220/projects/erp-claude && npx tsc --noEmit 2>&1 | grep -E "po-acceptance/route|po-acceptance/\[id\]/route" | head
```
Fix errors in these two files. (The create page + [id] page attachmentUrl errors remain for Tasks 5/6.)

- [ ] **Step 5: Commit**

```bash
cd /Users/adi0220/projects/erp-claude && git add src/app/api/po-acceptance/route.ts "src/app/api/po-acceptance/[id]/route.ts" && git commit -m "$(cat <<'EOF'
feat: PO Acceptance API — charges from CPO + new fields, drop attachmentUrl

POST seeds acceptance charge/commercial fields from the related CPO
when not supplied, persists acceptanceDetails + wizardStep, and no
longer reads/writes attachmentUrl. PATCH accepts acceptanceDetails,
wizardStep, and all charge/commercial fields for per-step draft saves.
EOF
)"
```
Do NOT push.

---

## Task 4: Finalize endpoint (auto-PDF on submit)

**Files:**
- Create: `src/app/api/po-acceptance/[id]/finalize/route.ts`

- [ ] **Step 1: Read the existing pdf route to reuse its generation**

```bash
cd /Users/adi0220/projects/erp-claude && sed -n '1,102p' src/app/api/po-acceptance/\[id\]/pdf/route.ts
```
Note how it calls `generatePOAcceptanceLetterHtml()` from `src/lib/pdf/po-acceptance-template.ts`.

- [ ] **Step 2: Implement finalize**

Create `src/app/api/po-acceptance/[id]/finalize/route.ts`. It marks the acceptance ISSUED, stamps `pdfGeneratedAt`, and returns preview metadata for the drawer (it does not need to persist the HTML — the existing `/pdf` route renders on demand):

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const acceptance = await prisma.pOAcceptance.update({
      where: { id },
      data: { status: "ISSUED", pdfGeneratedAt: new Date() },
      include: { clientPurchaseOrder: { include: { customer: true } } },
    });

    const customerEmail =
      acceptance.clientPurchaseOrder.customer.email ??
      acceptance.followUpEmail ??
      "";

    return NextResponse.json({
      pdfUrl: `/api/po-acceptance/${id}/pdf`,
      suggestedRecipient: customerEmail,
      suggestedSubject: `P.O. Acceptance Letter — ${acceptance.acceptanceNo}`,
    });
  } catch (error) {
    console.error("finalize error:", error);
    return NextResponse.json({ error: "Failed to finalize" }, { status: 500 });
  }
}
```

Verify the customer email field name (`email`) by checking `CustomerMaster` (it has `email` + `contactPersonEmail`). Adjust if needed.

- [ ] **Step 3: Type-check + commit**

```bash
cd /Users/adi0220/projects/erp-claude && npx tsc --noEmit 2>&1 | grep "finalize" | head
cd /Users/adi0220/projects/erp-claude && git add "src/app/api/po-acceptance/[id]/finalize/route.ts" && git commit -m "$(cat <<'EOF'
feat: PO Acceptance finalize endpoint (auto-PDF on submit, §3.5)

POST /api/po-acceptance/[id]/finalize marks the acceptance ISSUED,
stamps pdfGeneratedAt, and returns { pdfUrl, suggestedRecipient,
suggestedSubject } for the Preview Drawer. PDF itself renders via the
existing /pdf route.
EOF
)"
```
Do NOT push.

---

## Task 5: Create page — wizardize + remove upload + contacts in step 1 (PRD §3.1, §3.2, §3.6)

**Files:**
- Modify: `src/app/(dashboard)/po-acceptance/create/page.tsx`

- [ ] **Step 1: Read the full page**

```bash
cd /Users/adi0220/projects/erp-claude && sed -n '1,704p' "src/app/(dashboard)/po-acceptance/create/page.tsx"
```
Note: state object (`formData`, ~line 104), CPO selection (~282), acceptance details (~354), attachment upload (~395–459), contacts (~461–682), submit (~684).

- [ ] **Step 2: Remove the attachment upload section (§3.2)**

Delete the "Signed PO Acceptance Copy" UI block (~395–459), the `attachmentFile` state, any upload handler, and the `attachmentUrl: attachmentFile?.filePath` key in the submit payload (~245). Remove now-unused imports.

- [ ] **Step 3: Add `acceptanceDetails` field (§3.1)**

In the acceptance-details section, add a labelled `<Textarea>` bound to `formData.acceptanceDetails` (distinct from the existing `remarks`). Add `acceptanceDetails: ""` to initial state and include it in the submit payload.

- [ ] **Step 4: Introduce wizard scaffolding (§3.6)**

Add `const [step, setStep] = useState(1)` (initialize from a loaded draft's `wizardStep` if editing). Wrap the existing content into **Step 1 — Details & Contacts**: CPO selection + acceptance details (date, CDD, acceptanceDetails, remarks) + the contacts section. Add a footer with **Next** (→ step 2). Render Step 1 only when `step === 1`. Steps 2 and 3 are added in Tasks 6 and 7 — for now, leave `{step === 2 && <div>/* Task 6 */</div>}` and `{step === 3 && <div>/* Task 7 */</div>}` placeholders so navigation is wired but inert.

Add a step indicator (e.g. "Step 1 of 3 — Details & Contacts"). Use a simple header; the existing `Tabs` component may be repurposed, but a plain stepper is fine.

- [ ] **Step 5: Type-check**

```bash
cd /Users/adi0220/projects/erp-claude && npx tsc --noEmit 2>&1 | grep "po-acceptance/create" | head
```
There should be no `attachmentUrl` references left in this file. Fix any errors you introduced.

- [ ] **Step 6: Commit**

```bash
cd /Users/adi0220/projects/erp-claude && git add "src/app/(dashboard)/po-acceptance/create/page.tsx" && git commit -m "$(cat <<'EOF'
feat(ui): PO Acceptance wizard step 1 + remove signed-PO upload

- Remove the Signed P.O. Copy upload section + attachmentUrl payload
  (PRD §3.2).
- Add a distinct Acceptance Details textarea (PRD §3.1).
- Introduce 3-step wizard scaffolding (PRD §3.6); Step 1 holds CPO
  selection, acceptance details, and contacts with a Next control.
  Steps 2/3 are placeholders wired for Tasks 6/7.
EOF
)"
```
Do NOT push.

---

## Task 6: Create page — Step 2 consolidated Charges & Commercials box (PRD §3.4)

**Files:**
- Modify: `src/app/(dashboard)/po-acceptance/create/page.tsx`

- [ ] **Step 1: Load the CPO line items + charges into state when a CPO is selected**

When the CPO is chosen in Step 1, fetch the CPO detail (items + charge fields) — reuse the existing CPO GET (`/api/client-purchase-orders/[id]`) if it returns items + charges; otherwise the CPO summary already loaded in the create page may include them. Store: line items (read-only, for subtotal), and editable charge fields seeded from the CPO (`freight`, `packingForwarding`, `insurance`, `otherCharges`, `testingCharges`, `tpiCharges` + their tax flags, `gstRate`, `isInterState`). Add these to `formData` with CPO values as defaults.

- [ ] **Step 2: Render the single consolidated box**

Render `{step === 2 && (...)}` as ONE card titled "Charges & Commercials" containing:
- A read-only line-items summary (or just the subtotal derived from CPO items).
- Editable charge inputs (freight, packing & forwarding, insurance, other, testing, TPI) each with a "taxable" checkbox.
- A totals panel (Subtotal, Additional Charges, Taxable, CGST/SGST or IGST, Round Off, Grand Total).

Compute totals with the existing helper:
```tsx
import { computePOTotals } from "@/lib/calc/po-totals";
```
Build its input from the CPO items (`qty`,`unitRate`) + the editable charges + `gstRate`/`isInterState`. **IMPORTANT — map the charge field names**: `computePOTotals` expects `charges: { freight, packing, insurance, other, testing, tpi }`, but the schema/CPO fields are named `packingForwarding` and `otherCharges`. Map explicitly so no charge is silently dropped:
```ts
const totals = computePOTotals({
  items: cpoItems.map((i) => ({ qty: Number(i.qtyOrdered), unitRate: Number(i.unitRate) })),
  currency: cpoCurrency as "INR" | "USD",
  isInternational: cpoCurrency === "USD",
  isDomesticDelivery: Boolean(cpo.isDomesticDelivery),
  gstRate: Number(formData.gstRate ?? 0),
  isInterState: Boolean(formData.isInterState),
  charges: {
    freight:   Number(formData.freight ?? 0),
    packing:   Number(formData.packingForwarding ?? 0),
    insurance: Number(formData.insurance ?? 0),
    other:     Number(formData.otherCharges ?? 0),
    testing:   Number(formData.testingCharges ?? 0),
    tpi:       Number(formData.tpiCharges ?? 0),
  },
});
```
The acceptance is for an already-registered order; if the CPO is international USD, the GST gating encoded in `computePOTotals` applies automatically. Display CGST/SGST vs IGST per `isInterState`, and hide GST rows when GST doesn't apply (same rule as Plan 02).

> Note: `computePOTotals` does not model per-charge `taxApplicable` flags (the CPO form's richer `commercials` calc does). For the acceptance box, the taxable base = subtotal + all additional charges (what `computePOTotals` does). If per-charge tax flags must be honored exactly like the CPO, replicate the CPO's `commercials` taxable-base logic instead and report it as DONE_WITH_CONCERNS. Otherwise the simpler `computePOTotals` base is acceptable for the acceptance snapshot.

Footer: **Back** (→ step 1) and **Next** (→ step 3).

- [ ] **Step 3: Persist computed totals into formData**

Store the `computePOTotals` result fields (`subtotal`, `additionalChargesTotal`, `taxableAmount`, `cgst`, `sgst`, `igst`, `grandTotal`) plus `roundOff` into `formData` so they're included in the submit payload (the API persists them).

- [ ] **Step 4: Type-check + commit**

```bash
cd /Users/adi0220/projects/erp-claude && npx tsc --noEmit 2>&1 | grep "po-acceptance/create" | head
cd /Users/adi0220/projects/erp-claude && git add "src/app/(dashboard)/po-acceptance/create/page.tsx" && git commit -m "$(cat <<'EOF'
feat(ui): PO Acceptance wizard step 2 — consolidated Charges & Commercials (§3.4)

Single box combining editable charge inputs (freight/packing/insurance/
other/testing/TPI + taxable flags) and the commercial totals panel,
seeded from the CPO and recomputed via computePOTotals (shared with
the Client P.O. form). GST gating matches Plan 02 semantics. Computed
totals flow into the submit payload.
EOF
)"
```
Do NOT push.

---

## Task 7: Create page — Step 3 Review & Submit + finalize + Preview Drawer (PRD §3.5, §3.6)

**Files:**
- Modify: `src/app/(dashboard)/po-acceptance/create/page.tsx`

- [ ] **Step 1: Step 3 review**

Render `{step === 3 && (...)}` as a read-only summary of Steps 1 + 2 (CPO, dates, acceptance details, contacts, charges, grand total). Footer: **Back** (→ step 2) and a primary **Create Acceptance** button (this submits).

- [ ] **Step 2: Submit + finalize + drawer**

On submit:
1. POST `/api/po-acceptance` (existing) with the full payload (details, contacts, charges, computed totals). Get `{ id }`.
2. POST `/api/po-acceptance/${id}/finalize` → `{ pdfUrl, suggestedRecipient, suggestedSubject }`.
3. Open a `Sheet` (drawer) from `@/components/ui/sheet` containing:
   - An `<iframe src={pdfUrl} />` preview (the /pdf route returns HTML — iframe renders it).
   - Editable **To**, **CC**, **Subject** inputs prefilled from the finalize response.
   - A **Send Email** button → POST `/api/po-acceptance/${id}/email` with `{ to, cc, subject }`.
   - A **Skip / Close** button → navigate to `/po-acceptance/${id}`.

Use a state flag `previewOpen` + `previewMeta`. After a successful send, toast success and navigate to `/po-acceptance/${id}`.

- [ ] **Step 3: Wizard back-navigation preserves state**

Confirm Back/Next only change `step` and never reset `formData`. Optionally PATCH `/api/po-acceptance/[id]` with `wizardStep` if editing an existing draft — for a fresh create (no id until submit), just keep `step` in local state.

- [ ] **Step 4: Type-check + build**

```bash
cd /Users/adi0220/projects/erp-claude && npx tsc --noEmit 2>&1 | tail -5
cd /Users/adi0220/projects/erp-claude && npm run build 2>&1 | tail -8
```
Both clean.

- [ ] **Step 5: Commit**

```bash
cd /Users/adi0220/projects/erp-claude && git add "src/app/(dashboard)/po-acceptance/create/page.tsx" && git commit -m "$(cat <<'EOF'
feat(ui): PO Acceptance wizard step 3 — review, finalize, preview drawer (§3.5)

Step 3 reviews steps 1–2 then submits: creates the acceptance, calls
finalize (auto-PDF + ISSUED), and opens a Sheet drawer with an iframe
PDF preview + editable To/CC/Subject + Send Email (existing email
route). Skip/close routes to the acceptance detail page. Back/Next
preserve wizard state (PRD §3.6).
EOF
)"
```
Do NOT push.

---

## Task 8: Remove attachmentUrl from the [id] detail page

**Files:**
- Modify: `src/app/(dashboard)/po-acceptance/[id]/page.tsx`

- [ ] **Step 1: Remove the attachment display**

Remove the `attachmentUrl` field from the `POAcceptanceDetail` interface (~line 33) and the download-link block (~lines 514–542). Remove any now-unused imports.

- [ ] **Step 2: Type-check (whole project should now be clean)**

```bash
cd /Users/adi0220/projects/erp-claude && npx tsc --noEmit 2>&1 | tail -5
```
Expected: ZERO errors project-wide (all attachmentUrl references gone).

- [ ] **Step 3: Commit**

```bash
cd /Users/adi0220/projects/erp-claude && git add "src/app/(dashboard)/po-acceptance/[id]/page.tsx" && git commit -m 'feat(ui): remove signed-PO attachment display from acceptance detail (§3.2)'
```
Do NOT push.

---

## Task 9: Manual verification + push

- [ ] **Step 1: Final automated checks**

```bash
cd /Users/adi0220/projects/erp-claude && npx tsc --noEmit 2>&1 | tail -3
cd /Users/adi0220/projects/erp-claude && npm test 2>&1 | tail -8
cd /Users/adi0220/projects/erp-claude && npm run build 2>&1 | tail -8
```
All clean (tsc 0 errors; 8/8 tests; build succeeds). If not, STOP and report.

- [ ] **Step 2: Manual smoke (dev server)**

1. `/po-acceptance/create` → select a CPO → Step 1 shows details + contacts, NO upload field; "Acceptance Details" textarea present.
2. Next → Step 2 shows ONE Charges & Commercials box seeded from the CPO; edit a charge → totals recompute; GST shows/hides correctly for domestic vs USD CPO.
3. Next → Step 3 review; Back preserves edits.
4. Create Acceptance → Preview Drawer opens with the PDF; recipient prefilled; Send Email logs to POAcceptanceEmailLog (or Skip → detail page).
5. On `/po-acceptance/[id]` → no attachment download block.
6. On the CPO detail page → the SO button reads "Start Order Processing".

- [ ] **Step 3: Push**

```bash
cd /Users/adi0220/projects/erp-claude && git push origin master && git log origin/master..HEAD --oneline | wc -l
```
Expected: `0` unpushed after push.

---

## Done — what shipped

- POAcceptance schema: +acceptanceDetails, +wizardStep, +pdfGeneratedAt, +charge/commercial mirror; −attachmentUrl.
- `/api/po-acceptance` POST seeds charges from CPO + persists new fields; PATCH accepts them.
- `/api/po-acceptance/[id]/finalize` auto-PDF + ISSUED + preview meta.
- 3-step acceptance wizard (Details & Contacts → Charges & Commercials → Review) with back-nav, signed-PO upload removed, distinct Acceptance Details field.
- Submit → finalize → Preview Drawer (iframe PDF + editable recipient + Send Email).
- CPO detail button renamed to "Start Order Processing".
- attachmentUrl fully removed across API + both pages.

**Next plan:** Plan 04 — Step 3 (Order Processing + Allotment wizard). Written after Plan 03 lands.

---

## Open questions / flags

- **OQ-A (§3.4 charges model):** charges are stored as a flat mirror of CPO fields on POAcceptance, editable at acceptance, recomputed with `computePOTotals`. If stakeholders only wanted a *display* consolidation (not editable capture), this over-delivers — confirm.
- **OQ-B (§3.1 contacts):** "Client Contact / Department Contact Details" is served by the existing followUp/quality/accounts contact groups. No new client-contact FK was added. Confirm that satisfies §3.1.
- **OQ-C (PDF as attachment):** the email currently sends inline HTML, not a PDF attachment. §3.5 says "emailed P.O. Acceptance Letter in PDF format" — if a true PDF *attachment* is required (vs. inline HTML letter), that needs an HTML→PDF step (e.g. the existing `@react-pdf/renderer` or `@sparticuz/chromium` already in deps). Flagged for confirmation.

---

*End of Plan 03.*
