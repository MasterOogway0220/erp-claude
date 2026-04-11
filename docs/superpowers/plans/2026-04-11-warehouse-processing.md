# Warehouse Processing (3C) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable warehouse teams to process MPR items with per-pipe detail sub-rows (length, make, heat no), QA to link MTCs, and auto-generate inspection offers from ready items, with a dashboard-enhanced MPR list page.

**Architecture:** New `WarehouseItemDetail` model stores per-heat sub-rows under each WarehouseIntimationItem. Detail CRUD endpoints handle sub-row management with role-based MTC editing. Status cascades from detail → item → MPR automatically. Inspection offers are auto-generated from READY items using existing InspectionOffer creation logic. The MPR list page gets KPI summary cards.

**Tech Stack:** Next.js 16, Prisma, PostgreSQL, shadcn/ui, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-11-warehouse-processing-design.md`

---

## File Map

### New Files
| File | Purpose |
|------|---------|
| `src/app/api/warehouse/intimation/[id]/details/route.ts` | GET all details + POST upsert sub-rows |
| `src/app/api/warehouse/intimation/[id]/details/[detailId]/route.ts` | PATCH single detail + DELETE |
| `src/app/api/warehouse/intimation/[id]/generate-inspection-offer/route.ts` | POST generate IO from ready items |
| `src/app/(dashboard)/warehouse/intimation/[id]/prepare/page.tsx` | Prepare Material wizard page |

### Modified Files
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | WarehouseItemDetail model, reverse relations |
| `src/app/(dashboard)/warehouse/intimation/page.tsx` | Summary cards + status quick-filters |
| `src/app/(dashboard)/warehouse/intimation/[id]/page.tsx` | Expandable items with detail sub-rows, Prepare + Generate IO buttons |
| `src/app/api/warehouse/intimation/[id]/route.ts` | Include details in GET response |

---

## Task 1: Schema — WarehouseItemDetail Model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add WarehouseItemDetail model**

Add at the end of the schema:

```prisma
model WarehouseItemDetail {
  id                        String    @id @default(cuid())
  warehouseIntimationItemId String
  warehouseIntimationItem   WarehouseIntimationItem @relation(fields: [warehouseIntimationItemId], references: [id], onDelete: Cascade)
  sNo                       Int
  lengthMtr                 Decimal?  @db.Decimal(10, 3)
  pieces                    Int?
  make                      String?
  heatNo                    String?
  mtcNo                     String?
  mtcDate                   DateTime?
  inventoryStockId          String?
  inventoryStock            InventoryStock? @relation("DetailStock", fields: [inventoryStockId], references: [id])
  remarks                   String?
  status                    String    @default("PENDING")
  createdAt                 DateTime  @default(now())
  updatedAt                 DateTime  @updatedAt

  @@index([warehouseIntimationItemId])
  @@index([inventoryStockId])
}
```

- [ ] **Step 2: Add reverse relations**

In `WarehouseIntimationItem`, add:
```prisma
  details                   WarehouseItemDetail[]
```

In `InventoryStock`, add:
```prisma
  warehouseItemDetails      WarehouseItemDetail[] @relation("DetailStock")
```

- [ ] **Step 3: Validate and push**

```bash
npx prisma validate
npx prisma db push
```

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add WarehouseItemDetail model for per-pipe sub-rows"
```

---

## Task 2: API — Detail Sub-Rows GET + POST

**Files:**
- Create: `src/app/api/warehouse/intimation/[id]/details/route.ts`

- [ ] **Step 1: Create the details endpoint**

Create `src/app/api/warehouse/intimation/[id]/details/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("warehouseIntimation", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const intimation = await prisma.warehouseIntimation.findUnique({
      where: { id },
      select: {
        id: true,
        mprNo: true,
        status: true,
        items: {
          orderBy: { sNo: "asc" },
          include: {
            salesOrderItem: {
              select: { id: true, sNo: true, product: true, material: true, sizeLabel: true, quantity: true },
            },
            details: {
              orderBy: { sNo: "asc" },
              include: {
                inventoryStock: {
                  select: { id: true, heatNo: true, make: true, quantityMtr: true, mtcNo: true, mtcDate: true },
                },
              },
            },
          },
        },
      },
    });

    if (!intimation) {
      return NextResponse.json({ error: "Warehouse Intimation not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: intimation.id,
      mprNo: intimation.mprNo,
      status: intimation.status,
      items: intimation.items.map((item) => ({
        id: item.id,
        sNo: item.sNo,
        product: item.product,
        material: item.material,
        sizeLabel: item.sizeLabel,
        additionalSpec: item.additionalSpec,
        requiredQty: Number(item.requiredQty),
        preparedQty: Number(item.preparedQty),
        itemStatus: item.itemStatus,
        inspectionStatus: item.inspectionStatus,
        testingStatus: item.testingStatus,
        salesOrderItem: item.salesOrderItem
          ? { ...item.salesOrderItem, quantity: Number(item.salesOrderItem.quantity) }
          : null,
        details: item.details.map((d) => ({
          id: d.id,
          sNo: d.sNo,
          lengthMtr: d.lengthMtr ? Number(d.lengthMtr) : null,
          pieces: d.pieces,
          make: d.make,
          heatNo: d.heatNo,
          mtcNo: d.mtcNo,
          mtcDate: d.mtcDate,
          inventoryStockId: d.inventoryStockId,
          remarks: d.remarks,
          status: d.status,
        })),
      })),
    });
  } catch (error) {
    console.error("Error fetching intimation details:", error);
    return NextResponse.json({ error: "Failed to fetch details" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response } = await checkAccess("warehouseIntimation", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();
    const { warehouseIntimationItemId, details } = body;

    if (!warehouseIntimationItemId || !details || !Array.isArray(details)) {
      return NextResponse.json({ error: "warehouseIntimationItemId and details array are required" }, { status: 400 });
    }

    // Validate item belongs to this intimation
    const item = await prisma.warehouseIntimationItem.findFirst({
      where: { id: warehouseIntimationItemId, warehouseIntimationId: id },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found in this intimation" }, { status: 400 });
    }

    // Upsert details
    for (const detail of details) {
      if (detail.id) {
        // Update existing
        await prisma.warehouseItemDetail.update({
          where: { id: detail.id },
          data: {
            sNo: detail.sNo,
            lengthMtr: detail.lengthMtr ? parseFloat(detail.lengthMtr) : null,
            pieces: detail.pieces ? parseInt(detail.pieces) : null,
            make: detail.make || null,
            heatNo: detail.heatNo || null,
            inventoryStockId: detail.inventoryStockId || null,
            remarks: detail.remarks || null,
          },
        });
      } else {
        // Create new
        await prisma.warehouseItemDetail.create({
          data: {
            warehouseIntimationItemId,
            sNo: detail.sNo,
            lengthMtr: detail.lengthMtr ? parseFloat(detail.lengthMtr) : null,
            pieces: detail.pieces ? parseInt(detail.pieces) : null,
            make: detail.make || null,
            heatNo: detail.heatNo || null,
            inventoryStockId: detail.inventoryStockId || null,
            remarks: detail.remarks || null,
            status: "PENDING",
          },
        });
      }
    }

    // Recalculate preparedQty from details
    const allDetails = await prisma.warehouseItemDetail.findMany({
      where: { warehouseIntimationItemId },
    });

    const totalLength = allDetails.reduce(
      (sum, d) => sum + (d.lengthMtr ? Number(d.lengthMtr) : 0), 0
    );

    // Determine item status
    const hasDetails = allDetails.length > 0;
    const allHaveMtc = hasDetails && allDetails.every((d) => d.mtcNo && d.mtcDate);
    let newItemStatus = item.itemStatus;
    if (allHaveMtc) {
      newItemStatus = "READY";
    } else if (hasDetails) {
      newItemStatus = "PREPARING";
    }

    await prisma.warehouseIntimationItem.update({
      where: { id: warehouseIntimationItemId },
      data: {
        preparedQty: totalLength,
        heatNo: allDetails.map((d) => d.heatNo).filter(Boolean).join(", "),
        itemStatus: newItemStatus,
      },
    });

    // Auto-update MPR status
    const allItems = await prisma.warehouseIntimationItem.findMany({
      where: { warehouseIntimationId: id },
    });

    const allReady = allItems.every((i) => i.itemStatus === "READY" || i.itemStatus === "ISSUED");
    const anyInProgress = allItems.some((i) => i.itemStatus === "PREPARING" || i.itemStatus === "READY");

    let mprStatus: string | undefined;
    if (allReady && allItems.length > 0) {
      mprStatus = "MATERIAL_READY";
    } else if (anyInProgress) {
      mprStatus = "IN_PROGRESS";
    }

    if (mprStatus) {
      await prisma.warehouseIntimation.update({
        where: { id },
        data: { status: mprStatus },
      });
    }

    return NextResponse.json({ success: true, preparedQty: totalLength, itemStatus: newItemStatus });
  } catch (error) {
    console.error("Error saving details:", error);
    return NextResponse.json({ error: "Failed to save details" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/warehouse/intimation/\[id\]/details/route.ts
git commit -m "feat: add warehouse item detail sub-rows GET and POST endpoints"
```

---

## Task 3: API — Detail PATCH (MTC) + DELETE

**Files:**
- Create: `src/app/api/warehouse/intimation/[id]/details/[detailId]/route.ts`

- [ ] **Step 1: Create the detail PATCH/DELETE endpoint**

Create `src/app/api/warehouse/intimation/[id]/details/[detailId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; detailId: string }> }
) {
  try {
    const { authorized, session, response } = await checkAccess("warehouseIntimation", "write");
    if (!authorized) return response!;

    const { id, detailId } = await params;
    const body = await request.json();

    const detail = await prisma.warehouseItemDetail.findUnique({
      where: { id: detailId },
      include: {
        warehouseIntimationItem: { select: { warehouseIntimationId: true, id: true } },
      },
    });

    if (!detail || detail.warehouseIntimationItem.warehouseIntimationId !== id) {
      return NextResponse.json({ error: "Detail not found in this intimation" }, { status: 404 });
    }

    const userRole = session.user?.role;
    const isQA = ["QC", "ADMIN", "SUPER_ADMIN"].includes(userRole);

    // Build update data based on role
    const updateData: any = {};

    // Warehouse team fields
    if (body.lengthMtr !== undefined) updateData.lengthMtr = body.lengthMtr ? parseFloat(body.lengthMtr) : null;
    if (body.pieces !== undefined) updateData.pieces = body.pieces ? parseInt(body.pieces) : null;
    if (body.make !== undefined) updateData.make = body.make || null;
    if (body.heatNo !== undefined) updateData.heatNo = body.heatNo || null;
    if (body.remarks !== undefined) updateData.remarks = body.remarks || null;
    if (body.inventoryStockId !== undefined) updateData.inventoryStockId = body.inventoryStockId || null;

    // QA-only fields (MTC)
    if (body.mtcNo !== undefined || body.mtcDate !== undefined) {
      if (!isQA) {
        return NextResponse.json({ error: "Only QA team can update MTC details" }, { status: 403 });
      }
      if (body.mtcNo !== undefined) updateData.mtcNo = body.mtcNo || null;
      if (body.mtcDate !== undefined) updateData.mtcDate = body.mtcDate ? new Date(body.mtcDate) : null;
    }

    // Auto-update detail status
    const updatedMtcNo = body.mtcNo !== undefined ? body.mtcNo : detail.mtcNo;
    const updatedMtcDate = body.mtcDate !== undefined ? body.mtcDate : detail.mtcDate;
    if (updatedMtcNo && updatedMtcDate) {
      updateData.status = "READY";
    } else {
      updateData.status = "PENDING";
    }

    await prisma.warehouseItemDetail.update({
      where: { id: detailId },
      data: updateData,
    });

    // Recalculate parent item
    const parentItemId = detail.warehouseIntimationItem.id;
    const allDetails = await prisma.warehouseItemDetail.findMany({
      where: { warehouseIntimationItemId: parentItemId },
    });

    const totalLength = allDetails.reduce(
      (sum, d) => sum + (d.lengthMtr ? Number(d.lengthMtr) : 0), 0
    );
    const hasDetails = allDetails.length > 0;
    const allHaveMtc = hasDetails && allDetails.every((d) => {
      const mNo = d.id === detailId ? (body.mtcNo !== undefined ? body.mtcNo : d.mtcNo) : d.mtcNo;
      const mDt = d.id === detailId ? (body.mtcDate !== undefined ? body.mtcDate : d.mtcDate) : d.mtcDate;
      return mNo && mDt;
    });

    let newItemStatus: string;
    if (allHaveMtc) {
      newItemStatus = "READY";
    } else if (hasDetails) {
      newItemStatus = "PREPARING";
    } else {
      newItemStatus = "PENDING";
    }

    await prisma.warehouseIntimationItem.update({
      where: { id: parentItemId },
      data: { preparedQty: totalLength, itemStatus: newItemStatus },
    });

    // Auto-update MPR status
    const allItems = await prisma.warehouseIntimationItem.findMany({
      where: { warehouseIntimationId: id },
    });

    const allReady = allItems.every((i) => {
      const status = i.id === parentItemId ? newItemStatus : i.itemStatus;
      return status === "READY" || status === "ISSUED";
    });
    const anyInProgress = allItems.some((i) => {
      const status = i.id === parentItemId ? newItemStatus : i.itemStatus;
      return status === "PREPARING" || status === "READY";
    });

    let mprStatus: string | undefined;
    if (allReady && allItems.length > 0) {
      mprStatus = "MATERIAL_READY";
    } else if (anyInProgress) {
      mprStatus = "IN_PROGRESS";
    }

    if (mprStatus) {
      await prisma.warehouseIntimation.update({
        where: { id },
        data: { status: mprStatus },
      });

      // Create alert for QC when MATERIAL_READY
      if (mprStatus === "MATERIAL_READY") {
        const mpr = await prisma.warehouseIntimation.findUnique({
          where: { id },
          select: { mprNo: true, companyId: true },
        });
        if (mpr?.companyId) {
          await prisma.alert.create({
            data: {
              companyId: mpr.companyId,
              type: "MATERIAL_PREPARATION",
              title: `Material Ready: ${mpr.mprNo}`,
              message: "All items have MTC details filled. Ready for inspection offer generation.",
              severity: "MEDIUM",
              status: "UNREAD",
              relatedModule: "WarehouseIntimation",
              relatedId: id,
              assignedToRole: "QC",
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, detailStatus: updateData.status, itemStatus: newItemStatus });
  } catch (error) {
    console.error("Error updating detail:", error);
    return NextResponse.json({ error: "Failed to update detail" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; detailId: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("warehouseIntimation", "write");
    if (!authorized) return response!;

    const { id, detailId } = await params;

    const detail = await prisma.warehouseItemDetail.findUnique({
      where: { id: detailId },
      include: {
        warehouseIntimationItem: { select: { warehouseIntimationId: true, id: true } },
      },
    });

    if (!detail || detail.warehouseIntimationItem.warehouseIntimationId !== id) {
      return NextResponse.json({ error: "Detail not found" }, { status: 404 });
    }

    if (detail.status !== "PENDING") {
      return NextResponse.json({ error: "Can only delete PENDING details" }, { status: 400 });
    }

    await prisma.warehouseItemDetail.delete({ where: { id: detailId } });

    // Recalculate parent
    const parentItemId = detail.warehouseIntimationItem.id;
    const remaining = await prisma.warehouseItemDetail.findMany({
      where: { warehouseIntimationItemId: parentItemId },
    });

    const totalLength = remaining.reduce(
      (sum, d) => sum + (d.lengthMtr ? Number(d.lengthMtr) : 0), 0
    );

    const newStatus = remaining.length === 0 ? "PENDING" :
      remaining.every((d) => d.mtcNo && d.mtcDate) ? "READY" : "PREPARING";

    await prisma.warehouseIntimationItem.update({
      where: { id: parentItemId },
      data: { preparedQty: totalLength, itemStatus: newStatus },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting detail:", error);
    return NextResponse.json({ error: "Failed to delete detail" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/warehouse/intimation/\[id\]/details/\[detailId\]/
git commit -m "feat: add warehouse detail PATCH (role-based MTC) and DELETE endpoints"
```

---

## Task 4: API — Generate Inspection Offer from Ready Items

**Files:**
- Create: `src/app/api/warehouse/intimation/[id]/generate-inspection-offer/route.ts`

- [ ] **Step 1: Create the endpoint**

Create `src/app/api/warehouse/intimation/[id]/generate-inspection-offer/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("inspectionOffer", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();
    const { itemIds, addToExisting } = body;

    const intimation = await prisma.warehouseIntimation.findUnique({
      where: { id },
      include: {
        salesOrder: {
          select: {
            id: true,
            soNo: true,
            customerId: true,
            customerPoNo: true,
            projectName: true,
            clientPurchaseOrderId: true,
            customer: { select: { name: true } },
          },
        },
        items: {
          include: {
            details: {
              where: { status: "READY" },
              orderBy: { sNo: "asc" },
            },
            salesOrderItem: {
              select: {
                id: true,
                orderProcessing: {
                  select: {
                    tpiRequired: true,
                    tpiType: true,
                    colourCodingRequired: true,
                    colourCode: true,
                    vdiRequired: true,
                    vdiWitnessPercent: true,
                    hydroTestRequired: true,
                    hydroWitnessPercent: true,
                    requiredLabTests: true,
                  },
                },
              },
            },
          },
          orderBy: { sNo: "asc" },
        },
      },
    });

    if (!intimation) {
      return NextResponse.json({ error: "Warehouse Intimation not found" }, { status: 404 });
    }

    // Filter items if itemIds provided
    let selectedItems = intimation.items;
    if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
      selectedItems = intimation.items.filter((i) => itemIds.includes(i.id));
    }

    // Collect ready details from selected items
    const offerItems: any[] = [];
    let sNoCounter = 1;
    for (const item of selectedItems) {
      const readyDetails = item.details;
      if (readyDetails.length === 0) continue;

      const processing = item.salesOrderItem?.orderProcessing;

      for (const detail of readyDetails) {
        offerItems.push({
          sNo: sNoCounter++,
          product: item.product,
          material: item.material,
          sizeLabel: item.sizeLabel,
          heatNo: detail.heatNo,
          specification: item.additionalSpec,
          quantity: detail.lengthMtr ? String(Number(detail.lengthMtr)) : null,
          quantityReady: detail.lengthMtr ? String(Number(detail.lengthMtr)) : null,
          uom: "MTR",
          colourCodeRequired: processing?.colourCodingRequired || false,
          colourCode: processing?.colourCode || null,
          remark: detail.remarks,
        });
      }
    }

    if (offerItems.length === 0) {
      return NextResponse.json({ error: "No ready items found for inspection offer" }, { status: 400 });
    }

    // Add to existing IO or create new
    if (addToExisting) {
      const existingIO = await prisma.inspectionOffer.findUnique({
        where: { id: addToExisting },
        include: { items: { orderBy: { sNo: "desc" }, take: 1 } },
      });

      if (!existingIO) {
        return NextResponse.json({ error: "Existing inspection offer not found" }, { status: 404 });
      }

      const lastSNo = existingIO.items[0]?.sNo || 0;
      await prisma.inspectionOfferItem.createMany({
        data: offerItems.map((item, idx) => ({
          inspectionOfferId: addToExisting,
          ...item,
          sNo: lastSNo + idx + 1,
        })),
      });

      return NextResponse.json({ success: true, inspectionOfferId: addToExisting, addedItems: offerItems.length });
    }

    // Create new inspection offer
    const offerNo = await generateDocumentNumber("INSPECTION_OFFER", companyId);
    const so = intimation.salesOrder;

    const inspectionOffer = await prisma.inspectionOffer.create({
      data: {
        companyId,
        offerNo,
        customerId: so.customerId,
        salesOrderId: so.id,
        clientPurchaseOrderId: so.clientPurchaseOrderId,
        poNumber: so.customerPoNo,
        projectName: so.projectName,
        status: "DRAFT",
        createdById: session.user.id,
        remarks: `Auto-generated from MPR ${intimation.mprNo}`,
        items: {
          create: offerItems,
        },
      },
      include: { items: true },
    });

    // Create alert for QC
    if (companyId) {
      await prisma.alert.create({
        data: {
          companyId,
          type: "INSPECTION_DUE",
          title: `Inspection Offer: ${offerNo}`,
          message: `Draft inspection offer created from ${intimation.mprNo} for ${so.customer.name}. ${offerItems.length} item(s) ready for inspection.`,
          severity: "MEDIUM",
          status: "UNREAD",
          relatedModule: "InspectionOffer",
          relatedId: inspectionOffer.id,
          assignedToRole: "QC",
        },
      });
    }

    createAuditLog({
      companyId,
      userId: session.user.id,
      action: "CREATE",
      tableName: "InspectionOffer",
      recordId: inspectionOffer.id,
      newValue: JSON.stringify({ offerNo, mprNo: intimation.mprNo, itemCount: offerItems.length }),
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      inspectionOfferId: inspectionOffer.id,
      offerNo,
      itemCount: offerItems.length,
    }, { status: 201 });
  } catch (error) {
    console.error("Error generating inspection offer:", error);
    return NextResponse.json({ error: "Failed to generate inspection offer" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/warehouse/intimation/\[id\]/generate-inspection-offer/
git commit -m "feat: add API to generate inspection offer from ready warehouse items"
```

---

## Task 5: Update MPR GET API to Include Details

**Files:**
- Modify: `src/app/api/warehouse/intimation/[id]/route.ts`

- [ ] **Step 1: Add details to the items include in the GET handler**

In the GET handler, find the `items` include section. Add `details` to the include:

```typescript
items: {
  include: {
    salesOrderItem: { ... },  // existing
    inventoryStock: { ... },  // existing
    details: {                // ADD THIS
      orderBy: { sNo: "asc" as const },
      select: {
        id: true,
        sNo: true,
        lengthMtr: true,
        pieces: true,
        make: true,
        heatNo: true,
        mtcNo: true,
        mtcDate: true,
        inventoryStockId: true,
        remarks: true,
        status: true,
      },
    },
  },
  orderBy: { sNo: "asc" as const },
},
```

Also in the response mapping, convert detail Decimal fields:
Add to each item in the response:
```typescript
details: (item as any).details?.map((d: any) => ({
  ...d,
  lengthMtr: d.lengthMtr ? Number(d.lengthMtr) : null,
})) || [],
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/warehouse/intimation/\[id\]/route.ts
git commit -m "feat: include warehouse item details in MPR GET response"
```

---

## Task 6: MPR List Page — Summary Cards + Status Filters

**Files:**
- Modify: `src/app/(dashboard)/warehouse/intimation/page.tsx`

- [ ] **Step 1: Add summary cards state and calculation**

After the existing state and fetch logic, add computed counts:

```typescript
const statusCounts = useMemo(() => {
  const counts = { total: 0, pending: 0, inProgress: 0, materialReady: 0, dispatched: 0 };
  for (const item of intimations) {
    counts.total++;
    if (item.status === "PENDING") counts.pending++;
    else if (item.status === "IN_PROGRESS") counts.inProgress++;
    else if (item.status === "MATERIAL_READY") counts.materialReady++;
    else if (item.status === "DISPATCHED") counts.dispatched++;
  }
  return counts;
}, [intimations]);
```

(Add `useMemo` to the imports if not present.)

- [ ] **Step 2: Add summary cards above the table**

Before the existing table/list, add a row of 5 summary cards:

```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
  <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setStatusFilter("")}>
    <CardContent className="pt-4 pb-3">
      <p className="text-xs text-muted-foreground uppercase">Total MPRs</p>
      <p className="text-2xl font-bold">{statusCounts.total}</p>
    </CardContent>
  </Card>
  <Card className="cursor-pointer hover:bg-muted/50 border-l-4 border-l-yellow-500" onClick={() => setStatusFilter("PENDING")}>
    <CardContent className="pt-4 pb-3">
      <p className="text-xs text-muted-foreground uppercase">Pending</p>
      <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</p>
    </CardContent>
  </Card>
  <Card className="cursor-pointer hover:bg-muted/50 border-l-4 border-l-blue-500" onClick={() => setStatusFilter("IN_PROGRESS")}>
    <CardContent className="pt-4 pb-3">
      <p className="text-xs text-muted-foreground uppercase">In Progress</p>
      <p className="text-2xl font-bold text-blue-600">{statusCounts.inProgress}</p>
    </CardContent>
  </Card>
  <Card className="cursor-pointer hover:bg-muted/50 border-l-4 border-l-green-500" onClick={() => setStatusFilter("MATERIAL_READY")}>
    <CardContent className="pt-4 pb-3">
      <p className="text-xs text-muted-foreground uppercase">Material Ready</p>
      <p className="text-2xl font-bold text-green-600">{statusCounts.materialReady}</p>
    </CardContent>
  </Card>
  <Card className="cursor-pointer hover:bg-muted/50 border-l-4 border-l-purple-500" onClick={() => setStatusFilter("DISPATCHED")}>
    <CardContent className="pt-4 pb-3">
      <p className="text-xs text-muted-foreground uppercase">Dispatched</p>
      <p className="text-2xl font-bold text-purple-600">{statusCounts.dispatched}</p>
    </CardContent>
  </Card>
</div>
```

Note: `setStatusFilter` should set the existing status filter state (the page likely already has a status filter Select). Make sure clicking a card applies the same filter as the dropdown.

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/warehouse/intimation/page.tsx
git commit -m "feat: add summary cards and clickable status filters to MPR list page"
```

---

## Task 7: MPR Detail Page — Expandable Items + Buttons

**Files:**
- Modify: `src/app/(dashboard)/warehouse/intimation/[id]/page.tsx`

- [ ] **Step 1: Read the existing detail page and understand its structure**

Read the full file to understand: state, fetch logic, items rendering, and buttons area.

- [ ] **Step 2: Add expandable items with detail sub-rows**

This is a significant enhancement. Key changes:

1. Add state for expanded items and details:
```typescript
const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
const [itemDetails, setItemDetails] = useState<Record<string, any[]>>({});
```

2. Add fetchItemDetails function:
```typescript
const fetchItemDetails = async () => {
  try {
    const res = await fetch(`/api/warehouse/intimation/${id}/details`);
    if (res.ok) {
      const data = await res.json();
      const detailsMap: Record<string, any[]> = {};
      for (const item of data.items) {
        detailsMap[item.id] = item.details || [];
      }
      setItemDetails(detailsMap);
    }
  } catch (error) {
    console.error("Failed to fetch details:", error);
  }
};
```

Call `fetchItemDetails()` in the useEffect alongside `fetchDetail()`.

3. Make each item row clickable to toggle expand/collapse. When expanded, show the details sub-rows table below the item row.

4. In the expanded view, show detail sub-rows with inline-editable fields (length, pieces, make, heat no). MTC fields editable only for QC role (check `user?.role`). Use the existing `useCurrentUser` hook or pass role from session.

5. Add "Add Detail" button in expanded view that calls POST to create a new sub-row.

6. Add "Prepare Material" button in the page header that navigates to `/warehouse/intimation/${id}/prepare`.

7. Add "Generate Inspection Offer" button visible when any items have status READY. Opens a dialog with checkboxes for item selection, then calls POST to the generate-inspection-offer endpoint.

The exact implementation of the expandable UI, inline editing, and dialogs should follow the patterns already used in the project (inline inputs with save, overlay dialogs).

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/warehouse/intimation/\[id\]/page.tsx
git commit -m "feat: add expandable item details, Prepare Material button, and Generate IO dialog to MPR detail"
```

---

## Task 8: Prepare Material Wizard Page

**Files:**
- Create: `src/app/(dashboard)/warehouse/intimation/[id]/prepare/page.tsx`

- [ ] **Step 1: Create the wizard page**

The page follows the same stepper/wizard pattern as the order processing wizard (`/sales/[id]/process`). Key elements:

**Imports:**
```typescript
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Plus, Trash2, Check, Save, Package } from "lucide-react";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";
```

**Data fetching:** GET `/api/warehouse/intimation/${id}/details` on mount.

**State:**
- `currentIndex` — which item in the stepper
- `items` — array of MPR items with their details
- `mprInfo` — mprNo, status
- `editingDetails` — the current item's detail rows being edited (local state, saved on demand)
- `loading`, `saving`

**Per-item form:**
- Shows item info bar (product, material, size, required qty)
- Table of detail sub-rows: S.No, Length (MTR), Pieces, Make, Heat No, MTC No (disabled), MTC Date (disabled), Status
- "Add Row" button to add empty detail row
- Delete button per row (only PENDING rows)
- Progress bar: `sum(lengths) / requiredQty * 100`
- "Save Details" saves all rows via POST to `/api/warehouse/intimation/${id}/details`
- "Mark Ready" — validates total length >= required qty, calls PUT to update item status to READY

**Stock Picker (optional):**
- "Select from Stock" button
- Opens dialog showing available inventory matching the item (product, sizeLabel, specification)
- Same matching logic as allotment analyze
- Selecting auto-fills a new detail row with stock data

**Navigation:** Previous / Next with auto-save

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/warehouse/intimation/\[id\]/prepare/
git commit -m "feat: add Prepare Material wizard page for warehouse item detail entry"
```

---

## Task 9: Final Verification

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Build check**

```bash
npx next build 2>&1 | tail -15
```

Expected: Build succeeds with `/warehouse/intimation/[id]/prepare` and all new API routes in output.

- [ ] **Step 3: Commit if fixes needed**

```bash
git add -A && git commit -m "fix: address issues found during verification"
```
