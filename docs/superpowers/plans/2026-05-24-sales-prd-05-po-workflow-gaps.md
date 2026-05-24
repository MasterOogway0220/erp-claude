# Sales PRD — Plan 05: PO-Workflow Gap Closure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close the genuine gaps found by the PO-workflow PRD audit. Nearly all 16 modules are already built; only small, well-bounded items remain.

**Architecture:** Extract a shared `createAlert()` helper (gaps D+E need it), add a `FAILED_INSPECTION` alert type + trigger, enforce lab-report tagging, add a dossier missing-doc gate + email, and wire a UI entry point to the (already-built) Client Status Report endpoints. No large new subsystems.

**Tech Stack:** Next.js 16 · Prisma 7 (MariaDB) · TypeScript · Vitest · nodemailer (existing) · @sparticuz/chromium PDF (existing)

---

## Audit basis (what's already built — do NOT rebuild)

PRD modules 1–16 are ~90% implemented. Confirmed built: Client PO + items + commercial/GST, dispatch address (`CustomerDispatchAddress` + select component), PO Acceptance + PDF, Order Processing (QAP fields), Warehouse Intimation + per-piece `WarehouseItemDetail` + `bundleNo`, inspection-offer generation + PDFs, LabLetter, **Inspection records** (`Inspection`/`InspectionParameter` + create/upload UI), **Lab reports** (`LabReport` + create UI), **Dispatch Dossier** (`/api/dispatch/dispatch-notes/[id]/dossier` merges everything into one PDF), **PO Status dashboard** (`/po-tracking` live stages + %), **Client Status Report** (`/api/reports/client-status/[salesOrderId]/{,pdf,excel,email}`), serial traceability, time-based **Alerts** (`/api/alerts` generates material-prep/inspection/lab/delivery), and RBAC (module-access, fixed earlier).

## Confirmed gaps (this plan)
- **G-helper:** alert creation is inline `prisma.alert.create` duplicated across routes → extract `src/lib/alerts.ts`.
- **D (M11):** no `FAILED_INSPECTION` alert when an inspection result is FAIL.
- **E (M6):** PO Acceptance ISSUED doesn't notify QA/Warehouse.
- **C (M13):** lab-report upload doesn't require `itemCode` (+ `poId`) tagging.
- **B (M14):** dossier has no missing-mandatory-doc gate and no email option.
- **A (M16):** client-status endpoints exist but may lack a UI entry point.

---

## Task 1: Shared `createAlert()` helper

**Files:** Create `src/lib/alerts.ts`, `src/lib/alerts.test.ts`

- [ ] **Step 1: Read the existing inline pattern**
```bash
cd /Users/adi0220/projects/erp-claude && sed -n '130,200p' "src/app/api/sales-orders/[id]/allotment/route.ts"
cd /Users/adi0220/projects/erp-claude && sed -n '2399,2445p' prisma/schema.prisma   # Alert model + enums
```
Note the exact `Alert` fields (`type`, `title`, `message`, `severity`, `status`, `relatedModule`, `relatedId`, `assignedToRole`, `companyId`, `dueDate?`) and the `AlertSeverity` / `AlertStatus` / `UserRole` enum values.

- [ ] **Step 2: Write the failing test** `src/lib/alerts.test.ts`
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildAlertData } from "./alerts";

describe("buildAlertData", () => {
  it("builds a complete alert payload with defaults", () => {
    const d = buildAlertData({
      companyId: "c1",
      type: "FAILED_INSPECTION",
      title: "Inspection failed",
      message: "INS-1 failed",
      assignedToRole: "QC",
      relatedModule: "Inspection",
      relatedId: "i1",
    });
    expect(d).toMatchObject({
      companyId: "c1",
      type: "FAILED_INSPECTION",
      title: "Inspection failed",
      message: "INS-1 failed",
      severity: "MEDIUM",          // default
      status: "UNREAD",            // default
      assignedToRole: "QC",
      relatedModule: "Inspection",
      relatedId: "i1",
    });
  });

  it("respects an explicit severity", () => {
    const d = buildAlertData({
      companyId: "c1", type: "FAILED_INSPECTION", title: "x", message: "y",
      assignedToRole: "QC", relatedModule: "Inspection", relatedId: "i1",
      severity: "HIGH",
    });
    expect(d.severity).toBe("HIGH");
  });
});
```

- [ ] **Step 3: Run → red**
```bash
cd /Users/adi0220/projects/erp-claude && npm test -- src/lib/alerts.test.ts
```

- [ ] **Step 4: Implement** `src/lib/alerts.ts`
```ts
import { prisma } from "./prisma";
import type { AlertType, AlertSeverity, UserRole } from "@prisma/client";

export interface AlertInput {
  companyId: string | null;
  type: AlertType;
  title: string;
  message: string;
  assignedToRole: UserRole;
  relatedModule: string;
  relatedId: string;
  severity?: AlertSeverity;
  dueDate?: Date | null;
}

/** Pure builder — returns the prisma.alert.create `data` payload with defaults. Unit-testable. */
export function buildAlertData(input: AlertInput) {
  return {
    companyId: input.companyId,
    type: input.type,
    title: input.title,
    message: input.message,
    severity: input.severity ?? ("MEDIUM" as AlertSeverity),
    status: "UNREAD" as const,
    relatedModule: input.relatedModule,
    relatedId: input.relatedId,
    assignedToRole: input.assignedToRole,
    dueDate: input.dueDate ?? null,
  };
}

/** Create an alert. Never throws into the caller's main flow — logs + swallows. */
export async function createAlert(input: AlertInput): Promise<void> {
  try {
    await prisma.alert.create({ data: buildAlertData(input) });
  } catch (err) {
    console.error("createAlert failed:", err);
  }
}
```
Adjust the `data` keys/types to match the actual `Alert` model + enum names from Step 1. If `status` is an enum, use the right member.

- [ ] **Step 5: Run → green; commit**
```bash
cd /Users/adi0220/projects/erp-claude && npm test -- src/lib/alerts.test.ts
cd /Users/adi0220/projects/erp-claude && git add src/lib/alerts.ts src/lib/alerts.test.ts && git commit -m "feat: shared createAlert() helper + buildAlertData (PO-workflow alerts)"
```
Do NOT push.

---

## Task 2: Add `FAILED_INSPECTION` to AlertType (migration)

**Files:** `prisma/schema.prisma` + new migration

> MariaDB shared host: use the manual migration path (`--create-only` or hand-write SQL, then `migrate deploy`), per the project DB constraint.

- [ ] **Step 1:** In `prisma/schema.prisma`, add `FAILED_INSPECTION` to `enum AlertType`.
- [ ] **Step 2:** Generate/hand-write the migration. For a MySQL/MariaDB enum column, the SQL is `ALTER TABLE \`Alert\` MODIFY COLUMN \`type\` ENUM('INSPECTION_DUE','LAB_TESTING_PENDING','DELIVERY_DEADLINE','MATERIAL_PREPARATION','STOCK_ALLOTMENT','PROCUREMENT_REQUIRED','FAILED_INSPECTION') NOT NULL;` (include ALL existing values + the new one; confirm the current set from schema first).
```bash
cd /Users/adi0220/projects/erp-claude && npx prisma migrate dev --name add_failed_inspection_alert --create-only || true
# if shadow-db blocked, hand-write migration.sql as above, then:
cd /Users/adi0220/projects/erp-claude && npx prisma migrate deploy && npx prisma generate
```
- [ ] **Step 3:** Verify the enum applied: `SHOW COLUMNS FROM \`Alert\` LIKE 'type'` shows FAILED_INSPECTION. `npx tsc --noEmit` clean (the Prisma client now knows the value).
- [ ] **Step 4:** Commit `prisma/schema.prisma` + migration. No push.

---

## Task 3: Gap D — failed-inspection alert

**Files:** `src/app/api/quality/inspections/route.ts` (+ `[id]/route.ts` if it has the PATCH that sets result)

- [ ] **Step 1:** Read how `overallResult` is computed/set (POST ~line 95-123; PATCH ~line 108-116). Confirm the `InspectionResult` enum (`PASS|FAIL|HOLD`) and where the inspection links to a PO/item (for the alert message + relatedId).
- [ ] **Step 2:** After the inspection is created/updated, when `overallResult === "FAIL"`, call:
```ts
import { createAlert } from "@/lib/alerts";
// ...after create/update:
if (overallResult === "FAIL") {
  await createAlert({
    companyId,
    type: "FAILED_INSPECTION",
    title: `Inspection FAILED: ${inspection.inspectionNo}`,
    message: `Inspection ${inspection.inspectionNo} returned FAIL — re-inspection required.`,
    severity: "HIGH",
    assignedToRole: "QC",
    relatedModule: "Inspection",
    relatedId: inspection.id,
  });
}
```
Place it in BOTH the POST (initial result) and the PATCH (result change to FAIL) paths if both can set FAIL. Use the actual `companyId` from `checkAccess`.
- [ ] **Step 3:** `npx tsc --noEmit` clean. Smoke: POST/PATCH path resolves (401 unauth is fine). Commit. No push.

---

## Task 4: Gap E — notify QA + Warehouse on PO Acceptance

**Files:** `src/app/api/po-acceptance/[id]/finalize/route.ts`

- [ ] **Step 1:** Read the current finalize handler (marks ISSUED). It already loads the acceptance + CPO + customer.
- [ ] **Step 2:** After the status→ISSUED update, dispatch two alerts (reuse `createAlert`):
```ts
import { createAlert } from "@/lib/alerts";
// QA
await createAlert({
  companyId: acceptance.companyId,
  type: "MATERIAL_PREPARATION",  // reuse existing type; or QAP-specific if one exists
  title: `Quality requirements due: ${acceptance.acceptanceNo}`,
  message: `PO accepted (${acceptance.acceptanceNo}) — define quality requirements.`,
  severity: "MEDIUM",
  assignedToRole: "QC",
  relatedModule: "POAcceptance",
  relatedId: acceptance.id,
});
// Warehouse
await createAlert({
  companyId: acceptance.companyId,
  type: "MATERIAL_PREPARATION",
  title: `Order accepted: ${acceptance.acceptanceNo}`,
  message: `PO accepted (${acceptance.acceptanceNo}) — begin material preparation.`,
  severity: "MEDIUM",
  assignedToRole: "STORES",
  relatedModule: "POAcceptance",
  relatedId: acceptance.id,
});
```
Confirm `acceptance.companyId` is selected (extend the `include`/`select` if needed). Don't let alert failures block the finalize response (createAlert already swallows).
- [ ] **Step 3:** `npx tsc --noEmit` clean. Commit. No push.

---

## Task 5: Gap C — enforce lab-report tagging

**Files:** `src/app/api/quality/lab-reports/route.ts`, `src/app/(dashboard)/quality/lab-reports/create/page.tsx`

- [ ] **Step 1 (API):** In the POST handler (~line 73-100), after the existing `heatNo` required check, add required checks for `itemCode` and `poId`:
```ts
if (!body.itemCode) return NextResponse.json({ error: "Item code is required" }, { status: 400 });
if (!body.poId)     return NextResponse.json({ error: "PO is required" }, { status: 400 });
```
(Confirm `poId` is the correct field name; the route currently treats it as optional-but-validated-if-present — change to required.)
- [ ] **Step 2 (form):** In `create/page.tsx` submit handler (~line 126-134), after the heatNo guard add:
```ts
if (!formData.itemCode) { toast.error("Item code is required"); return; }
if (!formData.poId) { toast.error("PO is required"); return; }
```
Mark those inputs visually required (asterisk/`required`) for consistency.
- [ ] **Step 3:** `npx tsc --noEmit` clean. Commit. No push.

---

## Task 6: Gap B — dossier missing-doc gate + email

**Files:** `src/app/api/dispatch/dispatch-notes/[id]/dossier/route.tsx` (+ a small validation helper); new `email` route OR a `?email=` branch.

- [ ] **Step 1:** Read the dossier route's data fetch (lines ~124-253) and the per-section `.length > 0` checks. Identify the mandatory doc set (e.g. Client PO, PO Acceptance, at least one MTC, at least one Inspection, Invoice — confirm with the PRD §14 list).
- [ ] **Step 2 — validation gate:** Add a `GET ...?validate=true` (or a small `computeDossierReadiness(data)` returning `{ missing: string[], present: string[] }`). When generating the PDF, if `missing.length > 0` and a `?force=true` flag is absent, return `409` with `{ missing }` so the UI can warn. Keep the existing generation behavior under `?force=true` (or when nothing is missing).
- [ ] **Step 3 — email:** Add a `POST ...?action=email` (or a sibling `email/route.tsx`) that reuses the dossier data fetch + `renderHtmlToPdf`, then sends via nodemailer (mirror `po-acceptance/[id]/email/route.tsx` transport) with the dossier PDF as an attachment to the customer email. Body: `{ to, cc?, subject? }`.
- [ ] **Step 4:** `npx tsc --noEmit` clean. Smoke both routes (401/409 as appropriate). Commit. No push.

---

## Task 7: Gap A — Client Status Report UI entry point

**Files:** `src/app/(dashboard)/sales/[id]/page.tsx` (or the po-tracking row actions) — verify first.

- [ ] **Step 1:** Confirm the endpoints exist and respond: `/api/reports/client-status/[soId]`, `/pdf`, `/excel`, `/email`. Then check whether ANY UI links to them:
```bash
cd /Users/adi0220/projects/erp-claude && grep -rn "reports/client-status" "src/app/(dashboard)" | head
```
- [ ] **Step 2:** If no UI entry point exists, add a "Client Status Report" action on the Sales Order detail page (`sales/[id]/page.tsx`) with: **Download PDF** (open `/api/reports/client-status/${id}/pdf`), **Download Excel** (`/excel`), and **Email to Client** (POST `/email`). If a UI already exists, mark this task done after verifying it works.
- [ ] **Step 3:** `npx tsc --noEmit` + `npm run build` clean. Commit. No push.

---

## Task 8: Verify + push

- [ ] **Step 1:** `npx tsc --noEmit` (0), `npm test` (all pass incl. alerts), `npm run build` (clean).
- [ ] **Step 2:** Manual smoke (dev server): record an inspection with FAIL → alert appears in `/api/alerts`; finalize a PO acceptance → QA+STORES alerts created; lab-report upload without itemCode → blocked; dossier with a missing mandatory doc → 409 warning; client-status report PDF/Excel/email reachable from the SO detail page.
- [ ] **Step 3:** `git push origin master`; confirm 0 unpushed.

---

## Done — what shipped
- `src/lib/alerts.ts` shared alert helper (+ tests).
- `FAILED_INSPECTION` alert type + auto-trigger on failed inspections (M11).
- QA + Warehouse notifications on PO Acceptance (M6).
- Enforced lab-report heat+item+PO tagging (M13).
- Dossier missing-doc gate + email-to-client (M14).
- Client Status Report UI entry point wired to existing endpoints (M16).

## Open flags
- Alert types reuse `MATERIAL_PREPARATION` for the QA/Warehouse acceptance notifications (no dedicated `QAP_REQUIRED` type). Add a dedicated type later if the team wants them visually distinct.
- The dossier "mandatory doc set" is my best reading of PRD §14 — confirm the exact required list with the team.

---

*End of Plan 05.*
