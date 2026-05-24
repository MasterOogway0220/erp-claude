# §7 QAP → Order Wire-up — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. **Read the spec first:** `docs/superpowers/specs/2026-05-24-qap-order-wireup-design.md`.

**Goal:** Capture order-level QAP (Inspection Required / Location / TPI Agency / QAP document / proposed date) during order processing, and flow it into the Inspection Offer (prefill) and Warehouse Intimation (real inspection/testing statuses).

**Architecture:** Add 6 QAP columns to `SalesOrder` (order-level inspection scope; per-item tests stay in `OrderProcessingItem`). A new `GET/PUT /api/sales-orders/[id]/qap` reads/writes them. Pure helpers in `src/lib/quality/qap.ts` (unit-tested) drive (a) warehouse status derivation and (b) inspection-offer prefill. The wizard `ProcessStep` gains an order-level QAP panel; the allotment route and inspection-offer create page consume the QAP.

**Tech Stack:** Next.js 16 (App Router, client components) · Prisma 7 + MariaDB (manual migrations — shadow DB blocked) · TypeScript · vitest · shadcn UI.

---

## Pre-flight
- [ ] Read the spec. Confirm `npm test` is green and `git status` clean before starting.
- [ ] Note the manual-migration constraint: `prisma migrate dev` fails (no shadow DB on Hostinger shared hosting). Use hand-written SQL + `prisma migrate deploy` + `prisma generate` + raw `SHOW COLUMNS` verification.

---

## Task 1: Schema + migration — QAP columns on SalesOrder

**Files:**
- Modify: `prisma/schema.prisma` (SalesOrder model `:903-949`; InspectionAgencyMaster `:332-350`)
- Create: `prisma/migrations/20260524190000_add_qap_order_header/migration.sql`

- [ ] **Step 1: Add fields to `SalesOrder`** — insert after `allotmentStatus` (`:924`) in the scalar block, and add the relation in the relation block:

```prisma
  // QAP (order-level quality scope — PRD §7)
  qapInspectionRequired     Boolean                  @default(false)
  qapInspectionLocation     String?
  qapTpiAgencyId            String?
  qapDocumentPath           String?
  qapProposedInspectionDate DateTime?
  qapRemarks                String?                  @db.Text
```

In the relation block (near `dispatchAddress` at `:935`):

```prisma
  qapTpiAgency          InspectionAgencyMaster?  @relation("SOQapTpiAgency", fields: [qapTpiAgencyId], references: [id])
```

And add to the `@@index` block:

```prisma
  @@index([qapTpiAgencyId])
```

- [ ] **Step 2: Add the back-relation to `InspectionAgencyMaster`** — add inside the model (after `qualityRequirements` at `:349`):

```prisma
  salesOrdersQap       SalesOrder[]         @relation("SOQapTpiAgency")
```

- [ ] **Step 3: Write the migration SQL** — create `prisma/migrations/20260524190000_add_qap_order_header/migration.sql`:

```sql
ALTER TABLE `SalesOrder`
  ADD COLUMN `qapInspectionRequired` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `qapInspectionLocation` VARCHAR(191) NULL,
  ADD COLUMN `qapTpiAgencyId` VARCHAR(191) NULL,
  ADD COLUMN `qapDocumentPath` VARCHAR(191) NULL,
  ADD COLUMN `qapProposedInspectionDate` DATETIME(3) NULL,
  ADD COLUMN `qapRemarks` TEXT NULL;

CREATE INDEX `SalesOrder_qapTpiAgencyId_idx` ON `SalesOrder`(`qapTpiAgencyId`);

ALTER TABLE `SalesOrder`
  ADD CONSTRAINT `SalesOrder_qapTpiAgencyId_fkey`
  FOREIGN KEY (`qapTpiAgencyId`) REFERENCES `InspectionAgencyMaster`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 4: Apply + regenerate**

Run: `npx prisma migrate deploy && npx prisma generate`
Expected: "All migrations have been successfully applied." + client regenerated, no errors.

- [ ] **Step 5: Verify columns exist**

Run: `npx prisma db execute --stdin <<< "SHOW COLUMNS FROM \`SalesOrder\` LIKE 'qap%';"`
Expected: 6 rows (qapInspectionRequired, qapInspectionLocation, qapTpiAgencyId, qapDocumentPath, qapProposedInspectionDate, qapRemarks).

- [ ] **Step 6: tsc + commit**

Run: `npx tsc --noEmit` → 0 errors.
```bash
git add prisma/schema.prisma prisma/migrations/20260524190000_add_qap_order_header/migration.sql
git commit -m "feat(db): add order-level QAP columns to SalesOrder (PRD §7)"
```

---

## Task 2: Pure helpers + tests — `src/lib/quality/qap.ts`

**Files:**
- Create: `src/lib/quality/qap.ts`
- Test: `src/lib/quality/qap.test.ts`

- [ ] **Step 1: Write the failing test** — `src/lib/quality/qap.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  deriveWarehouseStatuses,
  qapToOfferPrefill,
  normalizeQapInput,
  VALID_QAP_LOCATIONS,
} from "./qap";

describe("deriveWarehouseStatuses", () => {
  it("inspection PENDING when QAP requires it, NA otherwise", () => {
    expect(deriveWarehouseStatuses(true, {}).inspectionStatus).toBe("PENDING");
    expect(deriveWarehouseStatuses(false, {}).inspectionStatus).toBe("NA");
  });
  it("testing PENDING when any item testing flag set, NA otherwise", () => {
    expect(deriveWarehouseStatuses(false, { hydroTestRequired: true }).testingStatus).toBe("PENDING");
    expect(deriveWarehouseStatuses(false, { ndtRequired: true }).testingStatus).toBe("PENDING");
    expect(deriveWarehouseStatuses(true, {}).testingStatus).toBe("NA");
  });
});

describe("qapToOfferPrefill", () => {
  it("maps QAP header fields to offer prefill", () => {
    const d = new Date("2026-06-01T00:00:00.000Z");
    expect(
      qapToOfferPrefill({
        qapInspectionRequired: true,
        qapInspectionLocation: "LAB",
        qapTpiAgencyId: "agency1",
        qapDocumentPath: null,
        qapProposedInspectionDate: d,
        qapRemarks: null,
      })
    ).toEqual({ inspectionLocation: "LAB", tpiAgencyId: "agency1", proposedInspectionDate: d.toISOString() });
  });
  it("yields empty strings / null when QAP unset", () => {
    expect(
      qapToOfferPrefill({
        qapInspectionRequired: false,
        qapInspectionLocation: null,
        qapTpiAgencyId: null,
        qapDocumentPath: null,
        qapProposedInspectionDate: null,
        qapRemarks: null,
      })
    ).toEqual({ inspectionLocation: "", tpiAgencyId: "", proposedInspectionDate: null });
  });
});

describe("normalizeQapInput", () => {
  it("accepts valid location and coerces types", () => {
    const r = normalizeQapInput({ qapInspectionRequired: true, qapInspectionLocation: "WAREHOUSE", qapTpiAgencyId: "a1" });
    expect(r.qapInspectionRequired).toBe(true);
    expect(r.qapInspectionLocation).toBe("WAREHOUSE");
    expect(r.qapTpiAgencyId).toBe("a1");
  });
  it("rejects an invalid location", () => {
    expect(() => normalizeQapInput({ qapInspectionLocation: "MARS" })).toThrow();
  });
  it("nulls blank optional fields", () => {
    const r = normalizeQapInput({ qapInspectionLocation: "", qapTpiAgencyId: "", qapRemarks: "" });
    expect(r.qapInspectionLocation).toBeNull();
    expect(r.qapTpiAgencyId).toBeNull();
    expect(r.qapRemarks).toBeNull();
  });
});

it("exposes the two valid locations", () => {
  expect(VALID_QAP_LOCATIONS).toEqual(["WAREHOUSE", "LAB"]);
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run src/lib/quality/qap.test.ts`
Expected: FAIL — cannot resolve `./qap`.

- [ ] **Step 3: Implement `src/lib/quality/qap.ts`**

```ts
export const VALID_QAP_LOCATIONS = ["WAREHOUSE", "LAB"] as const;
export type QapLocation = (typeof VALID_QAP_LOCATIONS)[number];
export type MprCheckStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "NA";

export interface QapHeader {
  qapInspectionRequired: boolean;
  qapInspectionLocation: string | null;
  qapTpiAgencyId: string | null;
  qapDocumentPath: string | null;
  qapProposedInspectionDate: Date | string | null;
  qapRemarks: string | null;
}

export interface ItemTestingFlags {
  labTestingRequired?: boolean | null;
  pmiRequired?: boolean | null;
  ndtRequired?: boolean | null;
  vdiRequired?: boolean | null;
  hydroTestRequired?: boolean | null;
}

/** Inspection status comes from order-level QAP; testing from per-item flags. */
export function deriveWarehouseStatuses(
  qapInspectionRequired: boolean,
  item: ItemTestingFlags,
): { inspectionStatus: MprCheckStatus; testingStatus: MprCheckStatus } {
  const anyTesting = !!(
    item.labTestingRequired ||
    item.pmiRequired ||
    item.ndtRequired ||
    item.vdiRequired ||
    item.hydroTestRequired
  );
  return {
    inspectionStatus: qapInspectionRequired ? "PENDING" : "NA",
    testingStatus: anyTesting ? "PENDING" : "NA",
  };
}

/** Map a QAP header to the Inspection-Offer form prefill shape. */
export function qapToOfferPrefill(qap: QapHeader): {
  inspectionLocation: string;
  tpiAgencyId: string;
  proposedInspectionDate: string | null;
} {
  const date = qap.qapProposedInspectionDate
    ? new Date(qap.qapProposedInspectionDate).toISOString()
    : null;
  return {
    inspectionLocation: qap.qapInspectionLocation ?? "",
    tpiAgencyId: qap.qapTpiAgencyId ?? "",
    proposedInspectionDate: date,
  };
}

const blankToNull = (v: unknown): string | null => {
  if (typeof v !== "string") return v == null ? null : String(v);
  const t = v.trim();
  return t === "" ? null : t;
};

/** Validate + normalize the QAP PUT body. Throws on invalid location. */
export function normalizeQapInput(body: Record<string, unknown>): {
  qapInspectionRequired: boolean;
  qapInspectionLocation: string | null;
  qapTpiAgencyId: string | null;
  qapDocumentPath: string | null;
  qapProposedInspectionDate: Date | null;
  qapRemarks: string | null;
} {
  const location = blankToNull(body.qapInspectionLocation);
  if (location !== null && !VALID_QAP_LOCATIONS.includes(location as QapLocation)) {
    throw new Error(`Invalid qapInspectionLocation: ${location}`);
  }
  const rawDate = blankToNull(body.qapProposedInspectionDate);
  return {
    qapInspectionRequired: !!body.qapInspectionRequired,
    qapInspectionLocation: location,
    qapTpiAgencyId: blankToNull(body.qapTpiAgencyId),
    qapDocumentPath: blankToNull(body.qapDocumentPath),
    qapProposedInspectionDate: rawDate ? new Date(rawDate) : null,
    qapRemarks: blankToNull(body.qapRemarks),
  };
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/lib/quality/qap.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/quality/qap.ts src/lib/quality/qap.test.ts
git commit -m "feat(quality): pure QAP helpers (warehouse-status + offer-prefill + input validation)"
```

---

## Task 3: QAP read/write endpoint — `GET`/`PUT /api/sales-orders/[id]/qap`

**Files:**
- Create: `src/app/api/sales-orders/[id]/qap/route.ts`

- [ ] **Step 1: Implement the route** (mirror the auth + companyId pattern from `processing/route.ts`):

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { normalizeQapInput } from "@/lib/quality/qap";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { authorized, response } = await checkAccess("salesOrder", "read");
  if (!authorized) return response!;
  const { id } = await params;
  const so = await prisma.salesOrder.findUnique({
    where: { id },
    select: {
      id: true,
      qapInspectionRequired: true,
      qapInspectionLocation: true,
      qapTpiAgencyId: true,
      qapDocumentPath: true,
      qapProposedInspectionDate: true,
      qapRemarks: true,
    },
  });
  if (!so) return NextResponse.json({ error: "Sales Order not found" }, { status: 404 });
  return NextResponse.json(so);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { authorized, response } = await checkAccess("salesOrder", "write");
    if (!authorized) return response!;
    const { id } = await params;
    const body = await req.json();
    const data = normalizeQapInput(body);
    const updated = await prisma.salesOrder.update({ where: { id }, data });
    return NextResponse.json({
      id: updated.id,
      qapInspectionRequired: updated.qapInspectionRequired,
      qapInspectionLocation: updated.qapInspectionLocation,
      qapTpiAgencyId: updated.qapTpiAgencyId,
      qapDocumentPath: updated.qapDocumentPath,
      qapProposedInspectionDate: updated.qapProposedInspectionDate,
      qapRemarks: updated.qapRemarks,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("QAP save error:", detail);
    const status = detail.startsWith("Invalid qapInspectionLocation") ? 400 : 500;
    return NextResponse.json({ error: "Failed to save QAP", detail }, { status });
  }
}
```

- [ ] **Step 2: tsc + commit**

Run: `npx tsc --noEmit` → 0 errors.
```bash
git add src/app/api/sales-orders/[id]/qap/route.ts
git commit -m "feat(api): GET/PUT order-level QAP endpoint"
```

---

## Task 4: ProcessStep — order-level QAP panel

**Files:**
- Modify: `src/components/order-wizard/ProcessStep.tsx`

- [ ] **Step 1: Add state + fetch agencies and QAP.** Near the other `useState` declarations (`:185-203`), add:

```tsx
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [qap, setQap] = useState({
    qapInspectionRequired: false,
    qapInspectionLocation: "",
    qapTpiAgencyId: "",
    qapDocumentPath: "",
    qapProposedInspectionDate: "",
    qapRemarks: "",
  });
  const [savingQap, setSavingQap] = useState(false);
```

In the existing load effect (the one that fetches `/api/sales-orders/${id}/processing` at `:225`), after `setSoInfo(...)`, also fetch agencies and QAP:

```tsx
    const [agRes, qapRes] = await Promise.all([
      fetch("/api/masters/inspection-agencies"),
      fetch(`/api/sales-orders/${id}/qap`),
    ]);
    if (agRes.ok) setAgencies((await agRes.json()).agencies ?? []);
    if (qapRes.ok) {
      const q = await qapRes.json();
      setQap({
        qapInspectionRequired: !!q.qapInspectionRequired,
        qapInspectionLocation: q.qapInspectionLocation ?? "",
        qapTpiAgencyId: q.qapTpiAgencyId ?? "",
        qapDocumentPath: q.qapDocumentPath ?? "",
        qapProposedInspectionDate: q.qapProposedInspectionDate
          ? String(q.qapProposedInspectionDate).slice(0, 10)
          : "",
        qapRemarks: q.qapRemarks ?? "",
      });
    }
```

> `/api/masters/inspection-agencies` returns `{ agencies: [{ id, name, ... }] }` (see `inspection-offers/create/page.tsx:102`) — hence `.agencies`.

- [ ] **Step 2: Add the save handler** (place near `handleSave` ~`:358`):

```tsx
  const handleSaveQap = async () => {
    setSavingQap(true);
    try {
      const res = await fetch(`/api/sales-orders/${order.id}/qap`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(qap),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail || e.error || "Failed");
      }
      toast.success("QAP saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save QAP");
    } finally {
      setSavingQap(false);
    }
  };
```

> Use `order.id` (the prop) or the `id` derived in the component — match whichever the surrounding handlers use (`handleSave` uses ``/api/sales-orders/${id}/...`` — reuse that `id`).

- [ ] **Step 3: Render the QAP panel** — insert a Card once, above the per-item area, inside the main `return (` (~`:583`), before the item stepper. Use existing shadcn `Card`/`Label`/`Switch`/`Select`/`Input`/`Textarea`/`Button` already imported in the file (add any missing imports):

```tsx
      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base">Quality / QAP (order-level — PRD §7)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="qapInspectionRequired"
              checked={qap.qapInspectionRequired}
              onCheckedChange={(c) => setQap({ ...qap, qapInspectionRequired: !!c })}
            />
            <Label htmlFor="qapInspectionRequired">Inspection Required</Label>
          </div>
          {qap.qapInspectionRequired && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Inspection Location</Label>
                <Select value={qap.qapInspectionLocation} onValueChange={(v) => setQap({ ...qap, qapInspectionLocation: v })}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                    <SelectItem value="LAB">Lab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>TPI Agency</Label>
                <Select value={qap.qapTpiAgencyId} onValueChange={(v) => setQap({ ...qap, qapTpiAgencyId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
                  <SelectContent>
                    {agencies.map((a) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Proposed Inspection Date</Label>
                <Input type="date" value={qap.qapProposedInspectionDate} onChange={(e) => setQap({ ...qap, qapProposedInspectionDate: e.target.value })} />
              </div>
              <div>
                <Label>QAP Document</Label>
                <Input type="file" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append("file", file);
                  const up = await fetch("/api/upload", { method: "POST", body: fd });
                  if (up.ok) { const r = await up.json(); setQap((q) => ({ ...q, qapDocumentPath: r.filePath ?? "" })); toast.success("QAP uploaded"); }
                  else toast.error("Upload failed");
                }} />
                {qap.qapDocumentPath && <p className="text-xs text-muted-foreground mt-1">Uploaded ✓</p>}
              </div>
            </div>
          )}
          <div>
            <Label>QAP Remarks</Label>
            <Textarea value={qap.qapRemarks} onChange={(e) => setQap({ ...qap, qapRemarks: e.target.value })} rows={2} />
          </div>
          <Button type="button" variant="outline" onClick={handleSaveQap} disabled={savingQap}>
            {savingQap ? "Saving…" : "Save QAP"}
          </Button>
        </CardContent>
      </Card>
```

> `/api/upload` returns `{ filePath, fileName }` (see `quality/lab-reports/create/page.tsx:116-117`). Store `filePath`.

- [ ] **Step 4: tsc + build**

Run: `npx tsc --noEmit` → 0. Run: `npm run build` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/order-wizard/ProcessStep.tsx
git commit -m "feat(ui): order-level QAP panel in Process step (inspection scope + TPI agency + QAP doc)"
```

---

## Task 5: Allotment — derive Warehouse Intimation inspection/testing statuses

**Files:**
- Modify: `src/app/api/sales-orders/[id]/allotment/route.ts`

- [ ] **Step 1: Load QAP + per-item processing flags.** Where the route loads `salesOrder` (`:~20-30`, currently `items: true`), extend the query to include processing and QAP:

```ts
      select: {
        // ...existing selected fields...
        qapInspectionRequired: true,
        items: { include: { orderProcessing: true } },
      },
```

> If the current query uses `include` rather than `select`, add `qapInspectionRequired` is not includable — convert the needed fields to a `select`, or do a second lightweight `prisma.salesOrder.findUnique({ where:{id}, select:{ qapInspectionRequired:true } })`. Pick whichever keeps the existing code working; the second-fetch approach is lowest-risk.

- [ ] **Step 2: Apply derived statuses in the WI item `create` map** (`:121-135`). Import the helper at top:

```ts
import { deriveWarehouseStatuses } from "@/lib/quality/qap";
```

In the `items.create` map, look up the matching SO item's `orderProcessing` and compute statuses:

```ts
          items: {
            create: stockItems.map((item) => {
              const soi = salesOrder.items.find((i) => i.id === item.salesOrderItemId);
              const { inspectionStatus, testingStatus } = deriveWarehouseStatuses(
                !!salesOrder.qapInspectionRequired,
                soi?.orderProcessing ?? {},
              );
              return {
                salesOrderItemId: item.salesOrderItemId,
                sNo: /* existing sNo expression */,
                product: /* existing */,
                material: /* existing */,
                sizeLabel: /* existing */,
                requiredQty: item.requiredQty,
                inspectionStatus,
                testingStatus,
              };
            }),
          },
```

> Preserve every field the existing `create` already sets (sNo/product/material/sizeLabel/heatNo/etc.) — only ADD `inspectionStatus`/`testingStatus`. Read the current map body and keep it intact.

- [ ] **Step 3: tsc + commit**

Run: `npx tsc --noEmit` → 0.
```bash
git add src/app/api/sales-orders/[id]/allotment/route.ts
git commit -m "feat(api): derive WarehouseIntimation inspection/testing status from order QAP"
```

---

## Task 6: Inspection Offer — prefill from order QAP

**Files:**
- Modify: `src/app/(dashboard)/quality/inspection-offers/create/page.tsx`

- [ ] **Step 1: Add a Sales-Order selector + state.** Near the existing `formData` state (`:70-81`), add `salesOrderId` to `formData` (default `""`) and:

```tsx
  const [salesOrders, setSalesOrders] = useState<{ id: string; soNo: string; customerName?: string }[]>([]);
```

In the existing load effect, fetch the order list:

```tsx
    const soRes = await fetch("/api/sales-orders");
    if (soRes.ok) {
      const d = await soRes.json();
      const list = Array.isArray(d) ? d : (d.salesOrders ?? d.data ?? []);
      setSalesOrders(list.map((s: any) => ({ id: s.id, soNo: s.soNo, customerName: s.customer?.name })));
    }
```

> `/api/sales-orders` GET returns `{ salesOrders: [...] }`, each with `soNo` and `customer.name`.

- [ ] **Step 2: On selecting an order, prefill from QAP.** Add a Select above the inspection-location field (`:~220`):

```tsx
                <Label>Link Sales Order (optional — prefills QAP)</Label>
                <Select
                  value={formData.salesOrderId}
                  onValueChange={async (v) => {
                    setFormData((f) => ({ ...f, salesOrderId: v }));
                    const res = await fetch(`/api/sales-orders/${v}/qap`);
                    if (res.ok) {
                      const q = await res.json();
                      setFormData((f) => ({
                        ...f,
                        inspectionLocation: q.qapInspectionLocation ?? f.inspectionLocation,
                        tpiAgencyId: q.qapTpiAgencyId ?? f.tpiAgencyId,
                        proposedInspectionDate: q.qapProposedInspectionDate
                          ? String(q.qapProposedInspectionDate).slice(0, 10)
                          : f.proposedInspectionDate,
                      }));
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                  <SelectContent>
                    {salesOrders.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.soNo}{s.customerName ? ` — ${s.customerName}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
```

- [ ] **Step 3: Send `salesOrderId` in the POST body.** In the submit handler (the `fetch("/api/quality/inspection-offers", ...)` at `:139`), ensure `salesOrderId: formData.salesOrderId || null` is included in the JSON body (the POST route already accepts it).

- [ ] **Step 4: tsc + build + commit**

Run: `npx tsc --noEmit` → 0. Run: `npm run build` → clean.
```bash
git add "src/app/(dashboard)/quality/inspection-offers/create/page.tsx"
git commit -m "feat(ui): link Sales Order in Inspection Offer create + prefill location/agency/date from QAP"
```

---

## Task 7: Verify + graph refresh

- [ ] **Step 1: Full static gate** — `npx tsc --noEmit` (0) · `npm test` (all pass, including new qap tests) · `npm run build` (clean).
- [ ] **Step 2: Refresh graphify** (project rule after code changes):

Run: `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"`

- [ ] **Step 3: Commit any graph refresh**
```bash
git add graphify-out/ && git commit -m "chore: refresh graphify graph after QAP wire-up" || true
```

- [ ] **Step 4: Runtime verification (OPEN — needs a safe surface).** Browser-verify end-to-end: Process step → set Inspection Required + Location + TPI agency + upload QAP + Save QAP → reload persists; create Inspection Offer linked to that order → location/agency/date prefill; run allotment → Warehouse Intimation items show PENDING inspection/testing where required. **Cannot be done against the live Hostinger DB safely** — defer to a deploy or a seeded local DB target, per the spec's open item.

---

## Guardrails
- **Manual migrations only** (shadow DB blocked). Never run `prisma migrate dev`.
- **Additive only** — don't touch existing `OrderProcessingItem` fields, `QualityRequirement` schema, document numbering, or RBAC keys.
- When editing existing files (allotment route, inspection-offer page, ProcessStep), **read the current code and preserve all existing fields/behavior** — these tasks only ADD.
- Each task ends green (tsc) and is independently committable.

## Self-review notes (spec coverage)
- §7 missing fields (Inspection Required / Location / QAP doc / TPI agency dropdown) → Task 1 (schema) + Task 4 (UI). ✓
- Downstream: Inspection Offer prefill → Task 6. ✓  Warehouse Intimation statuses → Task 5. ✓
- QualityRequirement kept as-is (template) → no task needed (non-goal: not deleted). ✓
- Pure, testable helpers → Task 2. ✓
- Runtime verification flagged as the open item → Task 7 Step 4. ✓
