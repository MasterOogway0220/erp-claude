# Order Processing (3A) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable order processing on Sales Orders: auto-create SO from accepted CPO, configure each item with colour coding, outsourced processes, TPI parameters, and lab tests via a wizard-style form, with item-level processing status tracking.

**Architecture:** New `OrderProcessingItem` model stores per-item processing config. New `clientPurchaseOrderId` + `processingStatus` fields on SalesOrder link CPO → SO and track processing progress. A wizard page at `/sales/[id]/process` lets users configure items one at a time. CPO detail page gets a "Create Sales Order" dialog. SO detail page gets processing status and summary.

**Tech Stack:** Next.js 16, Prisma, PostgreSQL, shadcn/ui, Tailwind CSS, date-fns

**Spec:** `docs/superpowers/specs/2026-04-11-order-processing-design.md`

---

## File Map

### New Files
| File | Purpose |
|------|---------|
| `src/lib/constants/order-processing.ts` | LAB_TESTS, NDT_TESTS, TPI_TYPES, PMI_TYPES, COATING_SIDES constants |
| `src/app/api/sales-orders/from-cpo/route.ts` | POST — create SO from CPO with review/modify |
| `src/app/api/sales-orders/[id]/processing/route.ts` | GET all processing items + POST upsert single item |
| `src/app/api/sales-orders/[id]/processing/[itemId]/route.ts` | PATCH — mark processed or reopen |
| `src/app/(dashboard)/sales/[id]/process/page.tsx` | Order processing wizard page |

### Modified Files
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add OrderProcessingItem model, add clientPurchaseOrderId + processingStatus to SalesOrder, reverse relations |
| `src/app/(dashboard)/sales/[id]/page.tsx` | Add processing status badge, Process Order button, processing summary card |
| `src/app/(dashboard)/client-purchase-orders/[id]/page.tsx` | Add Create SO button/dialog when acceptance is issued, show SO link |

---

## Task 1: Schema — OrderProcessingItem Model + SalesOrder Changes

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add fields to SalesOrder model**

Find the `SalesOrder` model (around line 1310). Add after `dispatchAddressId`:

```prisma
  clientPurchaseOrderId String?
  processingStatus      String   @default("UNPROCESSED")
```

Add the relation after the existing relations:

```prisma
  clientPurchaseOrder   ClientPurchaseOrder? @relation("SOFromCPO", fields: [clientPurchaseOrderId], references: [id])
```

Add to the `@@index` section:

```prisma
  @@index([clientPurchaseOrderId])
```

- [ ] **Step 2: Add reverse relation on ClientPurchaseOrder**

In the `ClientPurchaseOrder` model, add:

```prisma
  salesOrders           SalesOrder[]          @relation("SOFromCPO")
```

- [ ] **Step 3: Add OrderProcessingItem model**

Add at the end of the schema:

```prisma
model OrderProcessingItem {
  id                    String    @id @default(cuid())
  salesOrderItemId      String    @unique
  salesOrderItem        SalesOrderItem @relation(fields: [salesOrderItemId], references: [id], onDelete: Cascade)

  poSlNo                String?
  poItemCode            String?

  colourCodingRequired  Boolean   @default(false)
  colourCode            String?

  additionalPipeSpec    String?

  hotDipGalvanising     Boolean   @default(false)
  screwedEnds           Boolean   @default(false)
  coatingRequired       Boolean   @default(false)
  coatingType           String?
  coatingSide           String?

  tpiRequired           Boolean   @default(false)
  tpiType               String?

  labTestingRequired    Boolean   @default(false)

  pmiRequired           Boolean   @default(false)
  pmiType               String?

  ndtRequired           Boolean   @default(false)
  ndtTests              Json?

  vdiRequired           Boolean   @default(false)
  vdiWitnessPercent     Int?
  hydroTestRequired     Boolean   @default(false)
  hydroWitnessPercent   Int?

  requiredLabTests      Json?

  status                String    @default("PENDING")
  processedAt           DateTime?
  processedById         String?
  processedBy           User?     @relation("OrderProcessedBy", fields: [processedById], references: [id])

  companyId             String
  company               CompanyMaster @relation(fields: [companyId], references: [id])
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([salesOrderItemId])
  @@index([companyId])
}
```

- [ ] **Step 4: Add reverse relations**

In `SalesOrderItem`, add:

```prisma
  orderProcessing       OrderProcessingItem?
```

In `User`, add:

```prisma
  orderProcessingItems  OrderProcessingItem[] @relation("OrderProcessedBy")
```

In `CompanyMaster`, add:

```prisma
  orderProcessingItems  OrderProcessingItem[]
```

- [ ] **Step 5: Validate and push**

```bash
npx prisma validate
npx prisma db push
```

- [ ] **Step 6: Commit**

```bash
git add prisma/
git commit -m "feat: add OrderProcessingItem model, link SalesOrder to CPO, add processingStatus"
```

---

## Task 2: Order Processing Constants

**Files:**
- Create: `src/lib/constants/order-processing.ts`

- [ ] **Step 1: Create the constants file**

Create `src/lib/constants/order-processing.ts`:

```typescript
export const LAB_TESTS = [
  { value: "CHEMICAL", label: "Chemical Test" },
  { value: "TENSILE", label: "Tensile Test" },
  { value: "BEND", label: "Bend Test" },
  { value: "FLATTENING", label: "Flattening Test" },
  { value: "FLARING", label: "Flaring Test" },
  { value: "IGC_PRACTICE_E", label: "IGC Practice 'E' Test" },
  { value: "IGC_PRACTICE_E_MAG", label: "IGC Practice 'E' Test With 20X-250X Mag." },
  { value: "HARDNESS", label: "Hardness Test" },
  { value: "IMPACT", label: "Impact Test" },
  { value: "MACRO_SEAMLESS", label: "Macro Test for Seamless" },
  { value: "MICRO", label: "Micro Test" },
] as const;

export const NDT_TESTS = [
  { value: "DP_TEST", label: "DP Test" },
  { value: "MP_TEST", label: "MP Test" },
  { value: "UT_TEST", label: "UT Test" },
  { value: "RADIOGRAPHY", label: "Radiography" },
] as const;

export const TPI_TYPES = [
  { value: "TPI_CLIENT_QA", label: "Inspection under TPI/Client QA" },
  { value: "INHOUSE_QA", label: "Inspection by Inhouse QA" },
] as const;

export const PMI_TYPES = [
  { value: "INTERNAL", label: "Internal" },
  { value: "UNDER_WITNESS", label: "Under Witness" },
  { value: "BOTH", label: "Both" },
] as const;

export const COATING_SIDES = [
  { value: "INSIDE", label: "Inside" },
  { value: "OUTSIDE", label: "Outside" },
  { value: "BOTH", label: "Both" },
] as const;

export const PROCESSING_STATUS = {
  UNPROCESSED: "UNPROCESSED",
  PROCESSING: "PROCESSING",
  PROCESSED: "PROCESSED",
} as const;

export const ITEM_PROCESSING_STATUS = {
  PENDING: "PENDING",
  PROCESSED: "PROCESSED",
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/constants/order-processing.ts
git commit -m "feat: add order processing constants (lab tests, NDT, TPI, PMI, coating)"
```

---

## Task 3: API — Create Sales Order from CPO

**Files:**
- Create: `src/app/api/sales-orders/from-cpo/route.ts`

- [ ] **Step 1: Create the endpoint**

Create `src/app/api/sales-orders/from-cpo/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("salesOrder", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { clientPurchaseOrderId, items: itemOverrides } = body;

    if (!clientPurchaseOrderId) {
      return NextResponse.json({ error: "clientPurchaseOrderId is required" }, { status: 400 });
    }

    // Fetch CPO with acceptance and items
    const cpo = await prisma.clientPurchaseOrder.findUnique({
      where: { id: clientPurchaseOrderId },
      include: {
        customer: true,
        quotation: { select: { id: true } },
        poAcceptance: { select: { status: true } },
        items: { orderBy: { sNo: "asc" } },
      },
    });

    if (!cpo) {
      return NextResponse.json({ error: "Client Purchase Order not found" }, { status: 404 });
    }

    // Validate acceptance is issued
    if (!cpo.poAcceptance || cpo.poAcceptance.status !== "ISSUED") {
      return NextResponse.json({ error: "PO Acceptance must be issued before creating a Sales Order" }, { status: 400 });
    }

    // Check no existing SO linked to this CPO
    const existingSO = await prisma.salesOrder.findFirst({
      where: {
        clientPurchaseOrderId,
        status: { not: "CANCELLED" },
      },
    });

    if (existingSO) {
      return NextResponse.json(
        { error: `Sales Order ${existingSO.soNo} already exists for this CPO` },
        { status: 400 }
      );
    }

    // Generate SO number
    const soNo = await generateDocumentNumber("SALES_ORDER", companyId);

    // Build items — use overrides if provided, otherwise copy from CPO
    const soItems = cpo.items.map((cpoItem, idx) => {
      const override = itemOverrides?.find(
        (o: any) => o.quotationItemId === cpoItem.quotationItemId
      );

      const qtyOrdered = override?.qtyOrdered
        ? parseFloat(override.qtyOrdered)
        : Number(cpoItem.qtyOrdered);
      const unitRate = override?.unitRate
        ? parseFloat(override.unitRate)
        : Number(cpoItem.unitRate);

      return {
        sNo: idx + 1,
        product: cpoItem.product,
        material: cpoItem.material,
        additionalSpec: cpoItem.additionalSpec,
        sizeLabel: cpoItem.sizeLabel,
        od: cpoItem.od,
        wt: cpoItem.wt,
        ends: cpoItem.ends,
        quantity: qtyOrdered,
        unitRate: unitRate,
        amount: qtyOrdered * unitRate,
        deliveryDate: cpoItem.deliveryDate,
      };
    });

    // Filter out items with 0 qty (if user removed them via overrides)
    const validItems = soItems.filter((item) => item.quantity > 0);

    if (validItems.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    // Create SO in transaction
    const salesOrder = await prisma.$transaction(async (tx) => {
      const so = await tx.salesOrder.create({
        data: {
          companyId,
          soNo,
          customerId: cpo.customerId,
          quotationId: cpo.quotationId,
          clientPurchaseOrderId,
          customerPoNo: cpo.clientPoNumber,
          customerPoDate: cpo.clientPoDate,
          projectName: cpo.projectName,
          paymentTerms: cpo.paymentTerms,
          deliverySchedule: cpo.deliverySchedule,
          poAcceptanceStatus: "ACCEPTED",
          processingStatus: "UNPROCESSED",
          status: "OPEN",
          items: {
            create: validItems,
          },
        },
        include: {
          items: { orderBy: { sNo: "asc" } },
          customer: { select: { name: true } },
        },
      });

      return so;
    });

    // Audit log
    createAuditLog({
      companyId,
      userId: session.user.id,
      action: "CREATE",
      tableName: "SalesOrder",
      recordId: salesOrder.id,
      newValue: JSON.stringify({ soNo, clientPurchaseOrderId, itemCount: validItems.length }),
    }).catch(console.error);

    return NextResponse.json(
      {
        ...salesOrder,
        items: salesOrder.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitRate: Number(item.unitRate),
          amount: Number(item.amount),
          od: item.od ? Number(item.od) : null,
          wt: item.wt ? Number(item.wt) : null,
        })),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating sales order from CPO:", error);
    return NextResponse.json({ error: "Failed to create sales order" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sales-orders/from-cpo/
git commit -m "feat: add API to create Sales Order from Client Purchase Order"
```

---

## Task 4: API — Order Processing GET + POST

**Files:**
- Create: `src/app/api/sales-orders/[id]/processing/route.ts`

- [ ] **Step 1: Create the processing API**

Create `src/app/api/sales-orders/[id]/processing/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("salesOrder", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      select: {
        id: true,
        soNo: true,
        processingStatus: true,
        customer: { select: { name: true } },
        items: {
          orderBy: { sNo: "asc" },
          include: {
            orderProcessing: {
              include: {
                processedBy: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!salesOrder) {
      return NextResponse.json({ error: "Sales Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      salesOrder: {
        id: salesOrder.id,
        soNo: salesOrder.soNo,
        processingStatus: salesOrder.processingStatus,
        customerName: salesOrder.customer.name,
      },
      items: salesOrder.items.map((item) => ({
        salesOrderItem: {
          id: item.id,
          sNo: item.sNo,
          product: item.product,
          material: item.material,
          additionalSpec: item.additionalSpec,
          sizeLabel: item.sizeLabel,
          ends: item.ends,
          quantity: Number(item.quantity),
          unitRate: Number(item.unitRate),
          amount: Number(item.amount),
        },
        processing: item.orderProcessing
          ? {
              ...item.orderProcessing,
              processedBy: item.orderProcessing.processedBy?.name || null,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Error fetching processing items:", error);
    return NextResponse.json({ error: "Failed to fetch processing data" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("salesOrder", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();
    const { salesOrderItemId, ...processingData } = body;

    if (!salesOrderItemId) {
      return NextResponse.json({ error: "salesOrderItemId is required" }, { status: 400 });
    }

    // Validate item belongs to this SO
    const soItem = await prisma.salesOrderItem.findFirst({
      where: { id: salesOrderItemId, salesOrderId: id },
    });

    if (!soItem) {
      return NextResponse.json({ error: "Item does not belong to this Sales Order" }, { status: 400 });
    }

    // Upsert processing config
    const result = await prisma.orderProcessingItem.upsert({
      where: { salesOrderItemId },
      create: {
        salesOrderItemId,
        companyId: companyId!,
        poSlNo: processingData.poSlNo || null,
        poItemCode: processingData.poItemCode || null,
        colourCodingRequired: processingData.colourCodingRequired || false,
        colourCode: processingData.colourCode || null,
        additionalPipeSpec: processingData.additionalPipeSpec || null,
        hotDipGalvanising: processingData.hotDipGalvanising || false,
        screwedEnds: processingData.screwedEnds || false,
        coatingRequired: processingData.coatingRequired || false,
        coatingType: processingData.coatingType || null,
        coatingSide: processingData.coatingSide || null,
        tpiRequired: processingData.tpiRequired || false,
        tpiType: processingData.tpiType || null,
        labTestingRequired: processingData.labTestingRequired || false,
        pmiRequired: processingData.pmiRequired || false,
        pmiType: processingData.pmiType || null,
        ndtRequired: processingData.ndtRequired || false,
        ndtTests: processingData.ndtTests || null,
        vdiRequired: processingData.vdiRequired || false,
        vdiWitnessPercent: processingData.vdiWitnessPercent ?? null,
        hydroTestRequired: processingData.hydroTestRequired || false,
        hydroWitnessPercent: processingData.hydroWitnessPercent ?? null,
        requiredLabTests: processingData.requiredLabTests || null,
      },
      update: {
        poSlNo: processingData.poSlNo || null,
        poItemCode: processingData.poItemCode || null,
        colourCodingRequired: processingData.colourCodingRequired || false,
        colourCode: processingData.colourCode || null,
        additionalPipeSpec: processingData.additionalPipeSpec || null,
        hotDipGalvanising: processingData.hotDipGalvanising || false,
        screwedEnds: processingData.screwedEnds || false,
        coatingRequired: processingData.coatingRequired || false,
        coatingType: processingData.coatingType || null,
        coatingSide: processingData.coatingSide || null,
        tpiRequired: processingData.tpiRequired || false,
        tpiType: processingData.tpiType || null,
        labTestingRequired: processingData.labTestingRequired || false,
        pmiRequired: processingData.pmiRequired || false,
        pmiType: processingData.pmiType || null,
        ndtRequired: processingData.ndtRequired || false,
        ndtTests: processingData.ndtTests || null,
        vdiRequired: processingData.vdiRequired || false,
        vdiWitnessPercent: processingData.vdiWitnessPercent ?? null,
        hydroTestRequired: processingData.hydroTestRequired || false,
        hydroWitnessPercent: processingData.hydroWitnessPercent ?? null,
        requiredLabTests: processingData.requiredLabTests || null,
      },
    });

    // Update SO processingStatus if needed
    const allItems = await prisma.salesOrderItem.findMany({
      where: { salesOrderId: id },
      include: { orderProcessing: { select: { status: true } } },
    });

    const processedCount = allItems.filter(
      (i) => i.orderProcessing?.status === "PROCESSED"
    ).length;

    let newStatus = "UNPROCESSED";
    if (processedCount === allItems.length) {
      newStatus = "PROCESSED";
    } else if (processedCount > 0) {
      newStatus = "PROCESSING";
    }

    await prisma.salesOrder.update({
      where: { id },
      data: { processingStatus: newStatus },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error saving processing item:", error);
    return NextResponse.json({ error: "Failed to save processing data" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sales-orders/\[id\]/processing/route.ts
git commit -m "feat: add order processing GET and POST API endpoints"
```

---

## Task 5: API — Mark Item Processed / Reopen

**Files:**
- Create: `src/app/api/sales-orders/[id]/processing/[itemId]/route.ts`

- [ ] **Step 1: Create the endpoint**

Create `src/app/api/sales-orders/[id]/processing/[itemId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { authorized, session, response } = await checkAccess("salesOrder", "write");
    if (!authorized) return response!;

    const { id, itemId } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action || !["PROCESS", "REOPEN"].includes(action)) {
      return NextResponse.json({ error: "action must be 'PROCESS' or 'REOPEN'" }, { status: 400 });
    }

    // Validate the processing item exists and belongs to this SO
    const processingItem = await prisma.orderProcessingItem.findUnique({
      where: { salesOrderItemId: itemId },
      include: {
        salesOrderItem: { select: { salesOrderId: true } },
      },
    });

    if (!processingItem || processingItem.salesOrderItem.salesOrderId !== id) {
      return NextResponse.json({ error: "Processing item not found for this Sales Order" }, { status: 404 });
    }

    if (action === "PROCESS") {
      await prisma.orderProcessingItem.update({
        where: { salesOrderItemId: itemId },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
          processedById: session.user.id,
        },
      });
    } else {
      await prisma.orderProcessingItem.update({
        where: { salesOrderItemId: itemId },
        data: {
          status: "PENDING",
          processedAt: null,
          processedById: null,
        },
      });
    }

    // Update SO processingStatus
    const allItems = await prisma.salesOrderItem.findMany({
      where: { salesOrderId: id },
      include: { orderProcessing: { select: { status: true } } },
    });

    const processedCount = allItems.filter(
      (i) => i.orderProcessing?.status === "PROCESSED"
    ).length;
    const hasProcessing = allItems.some((i) => i.orderProcessing);

    let newStatus = "UNPROCESSED";
    if (processedCount === allItems.length && processedCount > 0) {
      newStatus = "PROCESSED";
    } else if (processedCount > 0 || hasProcessing) {
      newStatus = "PROCESSING";
    }

    await prisma.salesOrder.update({
      where: { id },
      data: { processingStatus: newStatus },
    });

    return NextResponse.json({
      success: true,
      itemStatus: action === "PROCESS" ? "PROCESSED" : "PENDING",
      soProcessingStatus: newStatus,
    });
  } catch (error) {
    console.error("Error updating processing item status:", error);
    return NextResponse.json({ error: "Failed to update processing status" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sales-orders/\[id\]/processing/\[itemId\]/
git commit -m "feat: add API to mark order processing items as processed or reopen"
```

---

## Task 6: Order Processing Wizard Page

**Files:**
- Create: `src/app/(dashboard)/sales/[id]/process/page.tsx`

- [ ] **Step 1: Create the wizard page**

This is a large file. Create `src/app/(dashboard)/sales/[id]/process/page.tsx`. The page should:

**Imports:**
```typescript
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Check, Save, RotateCcw, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";
import { LAB_TESTS, NDT_TESTS, TPI_TYPES, PMI_TYPES, COATING_SIDES } from "@/lib/constants/order-processing";
```

**Interfaces:**
```typescript
interface SOItemInfo {
  id: string;
  sNo: number;
  product: string | null;
  material: string | null;
  additionalSpec: string | null;
  sizeLabel: string | null;
  ends: string | null;
  quantity: number;
  unitRate: number;
  amount: number;
}

interface ProcessingData {
  poSlNo: string;
  poItemCode: string;
  colourCodingRequired: boolean;
  colourCode: string;
  additionalPipeSpec: string;
  hotDipGalvanising: boolean;
  screwedEnds: boolean;
  coatingRequired: boolean;
  coatingType: string;
  coatingSide: string;
  tpiRequired: boolean;
  tpiType: string;
  labTestingRequired: boolean;
  pmiRequired: boolean;
  pmiType: string;
  ndtRequired: boolean;
  ndtTests: string[];
  vdiRequired: boolean;
  vdiWitnessPercent: number | null;
  hydroTestRequired: boolean;
  hydroWitnessPercent: number | null;
  requiredLabTests: string[];
  status: string;
}

interface ProcessingItem {
  salesOrderItem: SOItemInfo;
  processing: (ProcessingData & { id?: string; processedBy?: string | null }) | null;
}
```

**Component structure:**
- Props: `params: Promise<{ id: string }>`
- State: `currentIndex` (number, starts at 0), `items` (ProcessingItem[]), `soInfo` (soNo, processingStatus, customerName), `loading`, `saving`, `formData` (ProcessingData for current item)
- `fetchProcessingData()` — GET `/api/sales-orders/${id}/processing`, populate items and soInfo
- `loadItemForm(index)` — sets currentIndex and populates formData from items[index].processing or empty defaults
- `saveDraft()` — POST `/api/sales-orders/${id}/processing` with current formData + salesOrderItemId
- `markProcessed()` — saveDraft() then PATCH `/api/sales-orders/${id}/processing/${itemId}` with action "PROCESS"
- `reopenItem()` — PATCH with action "REOPEN"
- `goNext()` / `goPrev()` — change currentIndex, auto-save current draft first

**Render layout:**
1. **PageHeader:** "Process Order — {soNo}" with Back button
2. **Progress bar:** "{currentIndex + 1} of {items.length} items | {processedCount} processed"
3. **Step indicator:** Row of circles, clickable to jump
4. **Current item info bar** (read-only card): Product, material, size, qty, rate
5. **Form sections in a Card:**
   - Section 1: PO References (poSlNo, poItemCode — 2 inputs side by side)
   - Section 2: Colour Coding (checkbox + conditional colour input)
   - Section 3: Additional Spec (text input)
   - Section 4: Outsourced Processes (checkbox grid 2-col with conditional sub-fields)
   - Section 5: TPI Parameters (conditional yellow card when tpiType === "TPI_CLIENT_QA")
6. **Footer buttons:** Previous | Save Draft | Mark as Processed | Next
   - If item status is PROCESSED, show "Reopen" instead of "Mark as Processed", and form is disabled

The form should be functional with all checkboxes, selects, and conditional rendering working properly. Use the constants from `order-processing.ts` for all dropdown/checkbox options.

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/sales/\[id\]/process/
git commit -m "feat: add order processing wizard page with stepper UI"
```

---

## Task 7: SO Detail Page — Processing Status + Button + Summary

**Files:**
- Modify: `src/app/(dashboard)/sales/[id]/page.tsx`

- [ ] **Step 1: Add processingStatus to the SalesOrder interface**

Add to the SalesOrder interface:

```typescript
  processingStatus: string;
  clientPurchaseOrderId?: string | null;
```

- [ ] **Step 2: Add Processing Status badge in the header**

Find where the SO status badge is displayed. Add the processing status badge next to it:

```tsx
{salesOrder.processingStatus && (
  <Badge
    variant={
      salesOrder.processingStatus === "PROCESSED" ? "default" :
      salesOrder.processingStatus === "PROCESSING" ? "outline" : "secondary"
    }
  >
    {salesOrder.processingStatus === "PROCESSED" ? "Processed" :
     salesOrder.processingStatus === "PROCESSING" ? "Processing" : "Unprocessed"}
  </Badge>
)}
```

- [ ] **Step 3: Add "Process Order" button**

In the header buttons area, add after the existing conditional buttons and before the Back button:

```tsx
{salesOrder.status === "OPEN" && salesOrder.processingStatus !== "PROCESSED" && (
  <Button onClick={() => router.push(`/sales/${id}/process`)}>
    <CheckCircle className="w-4 h-4 mr-2" />
    Process Order
  </Button>
)}
```

Add `CheckCircle` to the lucide-react imports.

- [ ] **Step 4: Add Order Processing Summary card**

After the items table section, add a processing summary card:

```tsx
{salesOrder.processingStatus !== "UNPROCESSED" && processingItems.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle>Order Processing Summary</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {processingItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-muted/50"
            onClick={() => router.push(`/sales/${salesOrder.id}/process`)}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">#{item.sNo}</span>
              <span className="text-sm">{item.product} {item.sizeLabel || ""}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.orderProcessing?.tpiRequired && (
                <Badge variant="outline" className="text-xs">TPI</Badge>
              )}
              {item.orderProcessing?.coatingRequired && (
                <Badge variant="outline" className="text-xs">Coating</Badge>
              )}
              {item.orderProcessing?.ndtRequired && (
                <Badge variant="outline" className="text-xs">NDT</Badge>
              )}
              <Badge variant={item.orderProcessing?.status === "PROCESSED" ? "default" : "secondary"}>
                {item.orderProcessing?.status === "PROCESSED" ? "Processed" : "Pending"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)}
```

This requires adding state and fetching processing data. Add:

```typescript
const [processingItems, setProcessingItems] = useState<any[]>([]);

// In a useEffect or after salesOrder loads:
useEffect(() => {
  if (salesOrder?.processingStatus !== "UNPROCESSED") {
    fetch(`/api/sales-orders/${id}/processing`)
      .then((res) => res.json())
      .then((data) => {
        setProcessingItems(
          data.items?.map((i: any) => ({
            ...i.salesOrderItem,
            orderProcessing: i.processing,
          })) || []
        );
      })
      .catch(console.error);
  }
}, [salesOrder?.processingStatus, id]);
```

- [ ] **Step 5: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/sales/\[id\]/page.tsx
git commit -m "feat: add processing status badge, Process Order button, and processing summary to SO detail"
```

---

## Task 8: CPO Detail Page — Create SO Button/Dialog + SO Link

**Files:**
- Modify: `src/app/(dashboard)/client-purchase-orders/[id]/page.tsx`

- [ ] **Step 1: Add linkedSO state and fetch logic**

Add state:
```typescript
const [linkedSO, setLinkedSO] = useState<{ id: string; soNo: string } | null>(null);
const [showCreateSODialog, setShowCreateSODialog] = useState(false);
const [creatingSO, setCreatingSO] = useState(false);
```

Add fetch function (call it after `fetchClientPO` succeeds):
```typescript
const fetchLinkedSO = async () => {
  try {
    const res = await fetch(`/api/sales-orders?clientPurchaseOrderId=${id}`);
    if (res.ok) {
      const data = await res.json();
      const sos = data.salesOrders || data;
      const activeSO = Array.isArray(sos) ? sos.find((so: any) => so.status !== "CANCELLED") : null;
      if (activeSO) {
        setLinkedSO({ id: activeSO.id, soNo: activeSO.soNo });
      }
    }
  } catch (error) {
    console.error("Failed to fetch linked SO:", error);
  }
};
```

Note: The existing GET `/api/sales-orders` endpoint will need a `clientPurchaseOrderId` filter. Add this as a search param filter in the GET handler (small modification to `src/app/api/sales-orders/route.ts`): In the existing `where` clause builder, add:
```typescript
const clientPurchaseOrderId = searchParams.get("clientPurchaseOrderId");
if (clientPurchaseOrderId) {
  where.clientPurchaseOrderId = clientPurchaseOrderId;
}
```

- [ ] **Step 2: Add createSOFromCPO function**

```typescript
const createSOFromCPO = async () => {
  setCreatingSO(true);
  try {
    const res = await fetch("/api/sales-orders/from-cpo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientPurchaseOrderId: clientPO?.id }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(`Sales Order ${data.soNo} created successfully`);
      setLinkedSO({ id: data.id, soNo: data.soNo });
      setShowCreateSODialog(false);
    } else {
      toast.error(data.error || "Failed to create Sales Order");
    }
  } catch (error) {
    toast.error("Failed to create Sales Order");
  } finally {
    setCreatingSO(false);
  }
};
```

- [ ] **Step 3: Add buttons and SO link in header area**

After the existing "Generate Acceptance" button block, add:

```tsx
{/* Show Create SO button when acceptance is issued and no SO linked */}
{clientPO.status !== "CANCELLED" && !linkedSO && (
  <Button
    variant="outline"
    onClick={() => setShowCreateSODialog(true)}
  >
    Create Sales Order
  </Button>
)}

{/* Show SO link when SO exists */}
{linkedSO && (
  <Button
    variant="outline"
    onClick={() => router.push(`/sales/${linkedSO.id}`)}
  >
    Sales Order: {linkedSO.soNo} →
  </Button>
)}
```

- [ ] **Step 4: Add Create SO confirmation dialog**

At the end of the component, before the closing `</div>`:

```tsx
{showCreateSODialog && clientPO && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateSODialog(false)}>
    <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <h3 className="text-lg font-semibold mb-2">Create Sales Order from CPO</h3>
      <p className="text-sm text-muted-foreground mb-4">
        A Sales Order will be created with the following items from {clientPO.cpoNo}:
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>S.No</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Size</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientPO.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.sNo}</TableCell>
              <TableCell>{item.product || "-"} {item.material ? `/ ${item.material}` : ""}</TableCell>
              <TableCell>{item.sizeLabel || "-"}</TableCell>
              <TableCell className="text-right">{item.qtyOrdered}</TableCell>
              <TableCell className="text-right">{item.unitRate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
              <TableCell className="text-right">{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={() => setShowCreateSODialog(false)}>Cancel</Button>
        <Button onClick={createSOFromCPO} disabled={creatingSO}>
          {creatingSO ? "Creating..." : "Create Sales Order"}
        </Button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 5: Update the GET SO API to support clientPurchaseOrderId filter**

In `src/app/api/sales-orders/route.ts`, find the GET handler's `where` clause builder. Add:

```typescript
const clientPurchaseOrderId = searchParams.get("clientPurchaseOrderId");
if (clientPurchaseOrderId) {
  where.clientPurchaseOrderId = clientPurchaseOrderId;
}
```

- [ ] **Step 6: Call fetchLinkedSO in useEffect**

Update the useEffect to also call `fetchLinkedSO()`:

```typescript
useEffect(() => {
  fetchClientPO();
  fetchLinkedSO();
}, [id]);
```

- [ ] **Step 7: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 8: Commit**

```bash
git add src/app/\(dashboard\)/client-purchase-orders/\[id\]/page.tsx src/app/api/sales-orders/route.ts
git commit -m "feat: add Create Sales Order from CPO dialog and SO link on CPO detail page"
```

---

## Task 9: Final Verification

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Build check**

```bash
npx next build 2>&1 | tail -15
```

Expected: Build succeeds with `/sales/[id]/process` in the output.

- [ ] **Step 3: Commit if fixes needed**

```bash
git add -A && git commit -m "fix: address issues found during verification"
```
