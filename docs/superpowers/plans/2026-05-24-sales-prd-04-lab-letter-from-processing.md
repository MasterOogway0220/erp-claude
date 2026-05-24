# Sales PRD — Plan 04: Lab Letter from Order Processing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close the ONE genuine gap in PRD §4 — §4.5.4 "a Lab Letter will be auto-generated specifying the required tests." Add a **"Generate Lab Letter" button** on the order-processing flow that creates a DRAFT `LabLetter` pre-filled from an item's required lab tests (per the user's decision: explicit button, not auto-on-save).

**Architecture:** A dedicated endpoint `POST /api/sales-orders/[id]/processing/[itemId]/lab-letter` builds a `LabLetter` DRAFT from the item's `OrderProcessingItem.requiredLabTests` + the SalesOrder/customer/item context, best-effort-mapping the lab-test constant values to `TestingMaster` IDs (matching by name) and always storing the human labels in `testNames`. Heat is left null (assigned later at the warehouse stage), so it does NOT reuse the generic `POST /api/quality/lab-letters` route (which requires `heatNo`). The process page gets a per-item button shown when `tpiType === "TPI_CLIENT_QA"` and `requiredLabTests` is non-empty.

**Tech Stack:** Next.js 16 (App Router) · Prisma 7 (MariaDB) · TypeScript

---

## Audit basis (why this is the only task)

A read-only clause-by-clause audit (2026-05-24) found PRD §4 ~92% implemented: §4.1 order selection (list→detail→Process Order), §4.2 colour coding, §4.3 stencil spec, §4.4 all outsourced processes with correct options (PMI Internal/Under-Witness/Both; NDT DP/MP/UT/Radiography), §4.5.1–3 TPI/VDI/Hydro + all 11 lab tests, and §4.6 stock/procure split with auto WarehouseIntimation + PurchaseRequisition + Alerts — ALL present and wired. The only gap is §4.5.4 (lab letter), addressed here. No schema migration is needed; `LabLetter` already exists.

## Key facts (verified)
- `OrderProcessingItem` (schema ~2519): `requiredLabTests String? @db.LongText`, `tpiType String?` (value `"TPI_CLIENT_QA"` triggers TPI params), `labTestingRequired Boolean`, `salesOrderItemId @unique`, `companyId`.
- Lab-test constants in `src/lib/constants/order-processing.ts` → `LAB_TESTS = [{ value: "CHEMICAL", label: "Chemical Test" }, …]` (11 entries).
- `LabLetter` (schema 1885): `letterNo` (unique, via `generateDocumentNumber("LAB_LETTER", companyId)`), `heatNo String?` (nullable — OK to omit), `specification`, `sizeLabel`, `testIds @db.LongText`, `testNames @db.LongText`, `productDescription`, `itemCode`, `poNumber`, `clientName`, `quantity`, `unit`, `status @default("DRAFT")`, `companyId`, `generatedById`, `witnessRequired`.
- `TestingMaster` (schema 251) has `testName`. Generic `POST /api/quality/lab-letters` resolves `testIds`→`testNames` and REQUIRES `heatNo` + `testIds` — we will NOT reuse it (heat unknown at processing).
- Auth pattern: `checkAccess("labLetter", "write")` from `@/lib/rbac`; `generateDocumentNumber` from `@/lib/document-numbering`.

---

## File structure
```
src/app/api/sales-orders/[id]/processing/[itemId]/lab-letter/route.ts   ← CREATE (build + create DRAFT LabLetter)
src/app/(dashboard)/sales/[id]/process/page.tsx                          ← MODIFY (per-item "Generate Lab Letter" button)
```

---

## Task 1: Lab-letter-from-processing endpoint

**Files:**
- Create: `src/app/api/sales-orders/[id]/processing/[itemId]/lab-letter/route.ts`

- [ ] **Step 1: Confirm how requiredLabTests is serialized**

Read how the processing route writes/reads `requiredLabTests` (JSON array string vs CSV) so we parse it identically:
```bash
cd /Users/adi0220/projects/erp-claude && grep -n "requiredLabTests\|ndtTests\|JSON.parse\|JSON.stringify\|.split(" src/app/api/sales-orders/\[id\]/processing/route.ts src/app/\(dashboard\)/sales/\[id\]/process/page.tsx | head -30
```
Also confirm the route param shape and the `OrderProcessingItem` accessor (`prisma.orderProcessingItem`). Note the relation path from a sales-order item → its processing record → the SalesOrder + customer (for poNumber/clientName/product/spec/size).

- [ ] **Step 2: Implement the endpoint**

Create `src/app/api/sales-orders/[id]/processing/[itemId]/lab-letter/route.ts`. It loads the processing item + its SO item + SO + customer, parses `requiredLabTests`, maps the constant values → labels (via the `LAB_TESTS` constant) → best-effort `TestingMaster` IDs by name match, and creates a DRAFT `LabLetter`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { LAB_TESTS } from "@/lib/constants/order-processing";

// Parse the requiredLabTests LongText into an array of constant values.
// Use the SAME format the processing route stores (confirmed in Step 1).
function parseLabTests(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // fall back to CSV
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { authorized, session, response, companyId } = await checkAccess("labLetter", "write");
  if (!authorized) return response!;

  const { id: salesOrderId, itemId } = await params;

  try {
    // itemId = SalesOrderItem id. Load its processing record + context.
    const soItem = await prisma.salesOrderItem.findFirst({
      where: { id: itemId, salesOrderId },
      include: {
        orderProcessing: true,
        salesOrder: { include: { customer: true } },
      },
    });
    if (!soItem || !soItem.orderProcessing) {
      return NextResponse.json({ error: "Processing item not found" }, { status: 404 });
    }

    const proc = soItem.orderProcessing;
    const values = parseLabTests(proc.requiredLabTests);
    if (values.length === 0) {
      return NextResponse.json({ error: "No lab tests specified for this item" }, { status: 400 });
    }

    // Map constant values → human labels
    const labelByValue = new Map(LAB_TESTS.map((t) => [t.value, t.label]));
    const testNames = values.map((v) => labelByValue.get(v) ?? v);

    // Best-effort map labels → TestingMaster ids (match by testName)
    const matched = await prisma.testingMaster.findMany({
      where: { testName: { in: testNames } },
      select: { id: true },
    });
    const testIds = matched.map((m) => m.id);

    const letterNo = await generateDocumentNumber("LAB_LETTER", companyId);

    const letter = await prisma.labLetter.create({
      data: {
        letterNo,
        companyId,
        status: "DRAFT",
        heatNo: soItem.heatNo ?? null, // usually null at processing; filled later
        clientName: soItem.salesOrder.customer?.name ?? null,
        poNumber: soItem.salesOrder.customerPoNo ?? null,
        productDescription: soItem.product ?? null,
        itemCode: proc.poItemCode ?? null,
        specification: soItem.material ?? null,
        sizeLabel: soItem.sizeLabel ?? null,
        quantity: soItem.quantity ? String(soItem.quantity) : null,
        witnessRequired: proc.tpiType === "TPI_CLIENT_QA",
        testIds: testIds.length ? JSON.stringify(testIds) : null,
        testNames: JSON.stringify(testNames),
        generatedById: session.user.id,
      },
    });

    return NextResponse.json({ id: letter.id, letterNo: letter.letterNo });
  } catch (error) {
    console.error("lab-letter from processing error:", error);
    return NextResponse.json({ error: "Failed to generate lab letter" }, { status: 500 });
  }
}
```

**Verify before finalizing:**
- The field names used on `salesOrder` (`customerPoNo`) and `soItem` (`product`, `material`, `sizeLabel`, `quantity`, `heatNo`) against the actual schema — adjust if different.
- The `testIds`/`testNames` storage format: the generic lab-letter route stores `testIds` from a JS array and `testNames` similarly. Match whatever format the `LabLetter` detail/PDF pages READ (check `src/app/(dashboard)/quality/lab-letters/[id]/page.tsx` — if it `JSON.parse`s these, use `JSON.stringify`; if it expects a raw array column, match that). Make the stored format consistent with how the lab-letter UI reads it.

- [ ] **Step 3: Type-check**
```bash
cd /Users/adi0220/projects/erp-claude && npx tsc --noEmit 2>&1 | grep -E "lab-letter|error TS" | head
```
Fix errors in the new file.

- [ ] **Step 4: Smoke test (route wired)**
```bash
cd /Users/adi0220/projects/erp-claude && npm run dev &
sleep 10
curl -s -X POST "http://localhost:3000/api/sales-orders/x/processing/y/lab-letter" -i | head -10
pkill -f "next dev" || true
```
401 (unauthorized) or 404 (not found) both confirm the route resolves. A 500 means a query/field bug — fix it.

- [ ] **Step 5: Commit (no push)**
```bash
cd /Users/adi0220/projects/erp-claude && git add "src/app/api/sales-orders/[id]/processing/[itemId]/lab-letter/route.ts" && git commit -m "$(cat <<'EOF'
feat: generate DRAFT lab letter from order-processing item (PRD §4.5.4)

POST /api/sales-orders/[id]/processing/[itemId]/lab-letter builds a
DRAFT LabLetter from the item's requiredLabTests + SO/customer context.
Maps lab-test constants to labels (LAB_TESTS) and best-effort to
TestingMaster ids; heat is left null (assigned later at warehouse).
Does not reuse the generic lab-letters POST (which requires heatNo).
EOF
)"
```

---

## Task 2: "Generate Lab Letter" button on the process page

**Files:**
- Modify: `src/app/(dashboard)/sales/[id]/process/page.tsx`

- [ ] **Step 1: Locate the per-item processing UI + state**
```bash
cd /Users/adi0220/projects/erp-claude && grep -n "tpiType\|requiredLabTests\|TPI_CLIENT_QA\|salesOrderId\|item.id\|router\|useRouter\|toast" "src/app/(dashboard)/sales/[id]/process/page.tsx" | head -40
```
Identify: the per-item data object (does it carry the SalesOrderItem id + tpiType + requiredLabTests?), the SO id, and whether `toast` (sonner) + `useRouter` are imported.

- [ ] **Step 2: Add the button**

For the current item, when `tpiType === "TPI_CLIENT_QA"` AND `requiredLabTests` is non-empty (parse it the same way), render a button near the TPI/lab-test section:

```tsx
<Button
  type="button"
  variant="outline"
  disabled={generatingLetter}
  onClick={async () => {
    setGeneratingLetter(true);
    try {
      const res = await fetch(`/api/sales-orders/${salesOrderId}/processing/${item.salesOrderItemId}/lab-letter`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to generate lab letter"); return; }
      toast.success(`Lab letter ${data.letterNo} created (draft)`, {
        action: { label: "Open", onClick: () => router.push(`/quality/lab-letters/${data.id}`) },
      });
    } catch {
      toast.error("Failed to generate lab letter");
    } finally {
      setGeneratingLetter(false);
    }
  }}
>
  Generate Lab Letter
</Button>
```

Add `const [generatingLetter, setGeneratingLetter] = useState(false);`. Use the actual SalesOrderItem id field name the page has for the item (it might be `item.id`, `item.salesOrderItemId`, or similar — match the real shape; the endpoint expects the SalesOrderItem id as `[itemId]`). Ensure `useRouter` + `toast` are imported (add if missing).

> Save-first nuance: the lab letter reads from the PERSISTED `OrderProcessingItem`. If the page allows generating before the item's processing has been saved, either disable the button until the item is saved/PROCESSED, or have the onClick save first. Prefer: only enable the button when the item's processing record exists (e.g. status !== "PENDING" or after a successful save). Match the page's existing save flow; report what you chose.

- [ ] **Step 3: Type-check + build**
```bash
cd /Users/adi0220/projects/erp-claude && npx tsc --noEmit 2>&1 | tail -5
cd /Users/adi0220/projects/erp-claude && npm run build 2>&1 | tail -6
```
Both clean.

- [ ] **Step 4: Commit (no push)**
```bash
cd /Users/adi0220/projects/erp-claude && git add "src/app/(dashboard)/sales/[id]/process/page.tsx" && git commit -m "$(cat <<'EOF'
feat(ui): Generate Lab Letter button on order processing (PRD §4.5.4)

Per-item "Generate Lab Letter" button shown when TPI/Client QA is
selected and lab tests are specified. Calls the processing lab-letter
endpoint and toasts a link to the created draft. Enabled only once the
item's processing is saved.
EOF
)"
```

---

## Task 3: Verify + push

- [ ] **Step 1: Automated checks**
```bash
cd /Users/adi0220/projects/erp-claude && npx tsc --noEmit 2>&1 | tail -3
cd /Users/adi0220/projects/erp-claude && npm test 2>&1 | tail -6
cd /Users/adi0220/projects/erp-claude && npm run build 2>&1 | tail -6
```
tsc 0 errors; 8/8 tests; build clean.

- [ ] **Step 2: Manual smoke**
Dev server → `/sales/[id]/process` for an SO item: set TPI = Inspection under TPI/Client QA, select some lab tests, save the item, click **Generate Lab Letter** → toast shows letter no + "Open" → opens `/quality/lab-letters/[id]` showing a DRAFT with the selected tests listed.

- [ ] **Step 3: Push**
```bash
cd /Users/adi0220/projects/erp-claude && git push origin master && git log origin/master..HEAD --oneline | wc -l
```
Expected: 0 unpushed.

---

## Done — what shipped
- `POST /api/sales-orders/[id]/processing/[itemId]/lab-letter` — DRAFT lab letter from processing data.
- "Generate Lab Letter" button on the process page (TPI/Client QA + lab tests).
- Closes the only PRD §4 gap; the rest of §4 was already implemented.

## Open flags
- **Heat is null** on the generated draft (assigned at the warehouse stage). The lab-letter detail/PDF should tolerate a blank heat for drafts — confirm the PDF route doesn't hard-require it.
- **TestingMaster mapping is best-effort by name.** If the 11 LAB_TESTS labels aren't all seeded in TestingMaster, `testIds` will be partial but `testNames` always carries the full human list, so the letter content is complete regardless. If exact testId linkage matters, seed TestingMaster with the 11 names.

---

*End of Plan 04.*
