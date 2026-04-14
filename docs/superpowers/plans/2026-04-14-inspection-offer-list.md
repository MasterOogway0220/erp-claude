# Inspection Offer List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full Inspection Offer workflow — from PO or Warehouse Intimation, through heat/MTC data entry, item selection, approval, TPI sign-off, and final inspection report.

**Architecture:** Introduce `InspectionPrep` as a hub entity linking both entry points (PO and Warehouse Intimation) to a structured heat/MTC hierarchy. The existing `InspectionOffer` is extended with an approval status workflow. Role-based field locking ensures Warehouse fills heat data and QA fills MTC data.

**Tech Stack:** Next.js 15 App Router, Prisma ORM, PostgreSQL, shadcn/ui, sonner (toasts), date-fns

---

## Role Reference (used throughout)
| Spec Role | Codebase Role |
|---|---|
| Warehouse staff | `STORES` |
| QA | `QC` |
| Manager | `MANAGEMENT` |
| Admin | `ADMIN`, `SUPER_ADMIN` |

---

## File Map

### New Files
- `src/app/api/quality/inspection-prep/route.ts` — GET list, POST create
- `src/app/api/quality/inspection-prep/[id]/route.ts` — GET detail, PATCH status
- `src/app/api/quality/inspection-prep/[id]/items/route.ts` — POST add item
- `src/app/api/quality/inspection-prep/[id]/items/[itemId]/heats/route.ts` — POST add heat
- `src/app/api/quality/inspection-prep/[id]/items/[itemId]/heats/[heatId]/route.ts` — PATCH/DELETE heat
- `src/app/api/quality/inspection-prep/[id]/items/[itemId]/heats/[heatId]/mtc/route.ts` — POST add MTC (QA only)
- `src/app/api/quality/inspection-prep/[id]/items/[itemId]/heats/[heatId]/mtc/[mtcId]/route.ts` — PATCH/DELETE MTC
- `src/app/api/quality/inspection-prep/[id]/generate-offer/route.ts` — POST generate offer with selection
- `src/app/(dashboard)/quality/inspection-prep/page.tsx` — List page
- `src/app/(dashboard)/quality/inspection-prep/create/page.tsx` — Create page
- `src/app/(dashboard)/quality/inspection-prep/[id]/page.tsx` — Detail page (tabs)

### Modified Files
- `prisma/schema.prisma` — New models + extend InspectionOffer + InspectionOfferItem
- `src/lib/rbac.ts` — Add `inspectionPrep` module
- `src/app/api/quality/inspection-offers/[id]/route.ts` — Add PATCH for approval actions
- `src/app/(dashboard)/quality/inspection-offers/[id]/page.tsx` — Add approval UI + status buttons
- `src/app/(dashboard)/quality/inspections/create/page.tsx` — Accept `?offerId=` param to pre-fill
- Purchase orders detail page — Add "Prepare for Inspection" button (find with grep)
- Warehouse intimation detail page — Add "Prepare for Inspection" button (find with grep)
- Sidebar nav config — Add inspection-prep links (find with grep for nav config)

---

## Task 1: Schema — New Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `InspectionPrep` and child models to schema**

Open `prisma/schema.prisma`. At the end of the file (or near the existing `InspectionOffer` block), add:

```prisma
model InspectionPrep {
  id                    String    @id @default(cuid())
  prepNo                String    @unique
  poId                  String?
  warehouseIntimationId String?
  status                String    @default("DRAFT")
  companyId             String?
  preparedById          String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  company             CompanyMaster?        @relation(fields: [companyId], references: [id])
  purchaseOrder       PurchaseOrder?        @relation(fields: [poId], references: [id])
  warehouseIntimation WarehouseIntimation?  @relation(fields: [warehouseIntimationId], references: [id])
  preparedBy          User?                 @relation("IPPreparedBy", fields: [preparedById], references: [id])
  items               InspectionPrepItem[]
  inspectionOffers    InspectionOffer[]

  @@index([companyId])
  @@index([poId])
  @@index([warehouseIntimationId])
}

model InspectionPrepItem {
  id               String   @id @default(cuid())
  inspectionPrepId String
  poItemId         String?
  description      String?
  sizeLabel        String?
  uom              String?
  make             String?
  status           String   @default("PENDING")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  inspectionPrep InspectionPrep @relation(fields: [inspectionPrepId], references: [id], onDelete: Cascade)
  poItem         POItem?        @relation(fields: [poItemId], references: [id])
  heatEntries    HeatEntry[]

  @@index([inspectionPrepId])
  @@index([poItemId])
}

model HeatEntry {
  id                   String   @id @default(cuid())
  inspectionPrepItemId String
  heatNo               String
  lengthMtr            Decimal? @db.Decimal(10, 3)
  pieces               Int?
  make                 String?
  addedById            String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  inspectionPrepItem  InspectionPrepItem       @relation(fields: [inspectionPrepItemId], references: [id], onDelete: Cascade)
  addedBy             User?                    @relation("HEAddedBy", fields: [addedById], references: [id])
  mtcDocuments        MTCDocument[]
  offerItemHeats      InspectionOfferItemHeat[]

  @@index([inspectionPrepItemId])
}

model MTCDocument {
  id          String    @id @default(cuid())
  heatEntryId String
  mtcNo       String
  mtcDate     DateTime?
  fileUrl     String?
  addedById   String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  heatEntry HeatEntry @relation(fields: [heatEntryId], references: [id], onDelete: Cascade)
  addedBy   User?     @relation("MTCAddedBy", fields: [addedById], references: [id])

  @@index([heatEntryId])
}

model InspectionOfferItemHeat {
  id                   String  @id @default(cuid())
  inspectionOfferItemId String
  heatEntryId          String
  piecesSelected       Int?

  inspectionOfferItem InspectionOfferItem @relation(fields: [inspectionOfferItemId], references: [id], onDelete: Cascade)
  heatEntry           HeatEntry           @relation(fields: [heatEntryId], references: [id])

  @@unique([inspectionOfferItemId, heatEntryId])
  @@index([inspectionOfferItemId])
  @@index([heatEntryId])
}
```

- [ ] **Step 2: Extend existing `InspectionOffer` model**

Find the `InspectionOffer` model in `prisma/schema.prisma`. Add these fields inside the model block:

```prisma
  // New fields — add after existing fields, before relations
  inspectionPrepId   String?
  approvedById       String?
  approvedAt         DateTime?
  rejectedById       String?
  rejectedAt         DateTime?
  rejectionRemarks   String?   @db.Text
  sentAt             DateTime?
  tpiSignedAt        DateTime?
```

Add these relations inside `InspectionOffer` (after existing relations):

```prisma
  inspectionPrep InspectionPrep? @relation(fields: [inspectionPrepId], references: [id])
  approvedBy     User?           @relation("IOApprovedBy", fields: [approvedById], references: [id])
  rejectedBy     User?           @relation("IORejectedBy", fields: [rejectedById], references: [id])
```

- [ ] **Step 3: Extend `InspectionOfferItem` model**

Find `InspectionOfferItem` in schema. Add:

```prisma
  // New fields — add after existing fields, before relations
  piecesSelected Int?
```

Add this relation:

```prisma
  heatSelections InspectionOfferItemHeat[]
```

- [ ] **Step 4: Add back-relations to User model**

Find the `User` model in `prisma/schema.prisma`. Add these relation fields:

```prisma
  inspectionPrepsCreated   InspectionPrep[]          @relation("IPPreparedBy")
  heatEntriesAdded         HeatEntry[]               @relation("HEAddedBy")
  mtcDocumentsAdded        MTCDocument[]             @relation("MTCAddedBy")
  inspectionOffersApproved InspectionOffer[]         @relation("IOApprovedBy")
  inspectionOffersRejected InspectionOffer[]         @relation("IORejectedBy")
```

- [ ] **Step 5: Add back-relations to PurchaseOrder model**

Find the `PurchaseOrder` model. Add:

```prisma
  inspectionPreps InspectionPrep[]
```

- [ ] **Step 6: Add back-relation to WarehouseIntimation model**

Find the `WarehouseIntimation` model. Add:

```prisma
  inspectionPreps InspectionPrep[]
```

- [ ] **Step 7: Run migration**

```bash
cd E:/freelance/erp-claude
npx prisma migrate dev --name add_inspection_prep_models
```

Expected output: Migration created and applied. Prisma Client regenerated.

- [ ] **Step 8: Verify Prisma Client generated correctly**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add InspectionPrep, HeatEntry, MTCDocument schema models"
```

---

## Task 2: RBAC Setup

**Files:**
- Modify: `src/lib/rbac.ts`

- [ ] **Step 1: Add `inspectionPrep` to MODULE_ACCESS**

Open `src/lib/rbac.ts`. Find the `MODULE_ACCESS` object (it contains `inspectionOffer`). Add the new module alongside it:

```typescript
inspectionPrep: {
  read: ["QC", "SALES", "STORES", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"],
  write: ["QC", "STORES", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"],
  delete: ["QC", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"],
  approve: ["MANAGEMENT", "ADMIN", "SUPER_ADMIN"],
},
```

- [ ] **Step 2: Add to MODULE_TO_ACCESS_KEY**

Find `MODULE_TO_ACCESS_KEY` in the same file. Add:

```typescript
inspectionPrep: "quality",
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/rbac.ts
git commit -m "feat: add inspectionPrep RBAC module with role permissions"
```

---

## Task 3: InspectionPrep List & Create API

**Files:**
- Create: `src/app/api/quality/inspection-prep/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("inspectionPrep", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: any = { ...companyFilter(companyId) };
    if (search) {
      where.OR = [
        { prepNo: { contains: search, mode: "insensitive" } },
        { purchaseOrder: { poNo: { contains: search, mode: "insensitive" } } },
      ];
    }

    const preps = await prisma.inspectionPrep.findMany({
      where,
      include: {
        purchaseOrder: { select: { id: true, poNo: true } },
        warehouseIntimation: { select: { id: true, mprNo: true } },
        preparedBy: { select: { name: true } },
        items: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ preps });
  } catch (error) {
    console.error("Error fetching inspection preps:", error);
    return NextResponse.json({ error: "Failed to fetch inspection preps" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("inspectionPrep", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { poId, warehouseIntimationId, itemsToInclude } = body;

    if (!poId && !warehouseIntimationId) {
      return NextResponse.json(
        { error: "Either a Purchase Order or Warehouse Intimation is required" },
        { status: 400 }
      );
    }

    const prepNo = await generateDocumentNumber("INSPECTION_PREP", companyId);

    const prep = await prisma.inspectionPrep.create({
      data: {
        prepNo,
        companyId,
        poId: poId || null,
        warehouseIntimationId: warehouseIntimationId || null,
        preparedById: session.user.id,
        status: "DRAFT",
        items: itemsToInclude?.length
          ? {
              create: itemsToInclude.map((item: any) => ({
                poItemId: item.poItemId || null,
                description: item.description || null,
                sizeLabel: item.sizeLabel || null,
                uom: item.uom || null,
                make: item.make || null,
                status: "PENDING",
              })),
            }
          : undefined,
      },
      include: {
        items: true,
        purchaseOrder: { select: { id: true, poNo: true } },
        warehouseIntimation: { select: { id: true, mprNo: true } },
      },
    });

    createAuditLog({
      userId: session.user.id,
      companyId,
      action: "CREATE",
      tableName: "InspectionPrep",
      recordId: prep.id,
      newValue: JSON.stringify({ prepNo: prep.prepNo }),
    }).catch(console.error);

    return NextResponse.json(prep, { status: 201 });
  } catch (error: any) {
    console.error("Error creating inspection prep:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create inspection prep" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/quality/inspection-prep/route.ts
git commit -m "feat: add inspection prep list and create API"
```

---

## Task 4: InspectionPrep Detail API

**Files:**
- Create: `src/app/api/quality/inspection-prep/[id]/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("inspectionPrep", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const prep = await prisma.inspectionPrep.findUnique({
      where: { id },
      include: {
        purchaseOrder: { select: { id: true, poNo: true, supplier: { select: { name: true } } } },
        warehouseIntimation: { select: { id: true, mprNo: true } },
        preparedBy: { select: { id: true, name: true } },
        items: {
          include: {
            poItem: { select: { id: true, description: true, uom: true } },
            heatEntries: {
              include: {
                mtcDocuments: { orderBy: { createdAt: "asc" } },
                addedBy: { select: { name: true } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!prep) {
      return NextResponse.json({ error: "Inspection Prep not found" }, { status: 404 });
    }

    return NextResponse.json(prep);
  } catch (error) {
    console.error("Error fetching inspection prep:", error);
    return NextResponse.json({ error: "Failed to fetch inspection prep" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("inspectionPrep", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const prep = await prisma.inspectionPrep.update({
      where: { id },
      data: { status },
    });

    createAuditLog({
      userId: session.user.id,
      companyId,
      action: "STATUS_CHANGE",
      tableName: "InspectionPrep",
      recordId: id,
      newValue: JSON.stringify({ status }),
    }).catch(console.error);

    return NextResponse.json(prep);
  } catch (error: any) {
    console.error("Error updating inspection prep:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update inspection prep" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/quality/inspection-prep/[id]/route.ts
git commit -m "feat: add inspection prep detail and status update API"
```

---

## Task 5: HeatEntry API

**Files:**
- Create: `src/app/api/quality/inspection-prep/[id]/items/route.ts`
- Create: `src/app/api/quality/inspection-prep/[id]/items/[itemId]/heats/route.ts`
- Create: `src/app/api/quality/inspection-prep/[id]/items/[itemId]/heats/[heatId]/route.ts`

- [ ] **Step 1: Create items sub-route (POST add item)**

Create `src/app/api/quality/inspection-prep/[id]/items/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("inspectionPrep", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();
    const { poItemId, description, sizeLabel, uom, make } = body;

    const item = await prisma.inspectionPrepItem.create({
      data: {
        inspectionPrepId: id,
        poItemId: poItemId || null,
        description: description || null,
        sizeLabel: sizeLabel || null,
        uom: uom || null,
        make: make || null,
        status: "PENDING",
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    console.error("Error adding prep item:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to add item" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create heats sub-route (POST add heat)**

Create `src/app/api/quality/inspection-prep/[id]/items/[itemId]/heats/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { authorized, session, response } = await checkAccess("inspectionPrep", "write");
    if (!authorized) return response!;

    const { itemId } = await params;
    const body = await request.json();
    const { heatNo, lengthMtr, pieces, make } = body;

    if (!heatNo) {
      return NextResponse.json({ error: "Heat number is required" }, { status: 400 });
    }

    const heat = await prisma.heatEntry.create({
      data: {
        inspectionPrepItemId: itemId,
        heatNo,
        lengthMtr: lengthMtr ? parseFloat(lengthMtr) : null,
        pieces: pieces ? parseInt(pieces) : null,
        make: make || null,
        addedById: session.user.id,
      },
    });

    return NextResponse.json(heat, { status: 201 });
  } catch (error: any) {
    console.error("Error adding heat entry:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to add heat entry" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Create heat detail route (PATCH/DELETE)**

Create `src/app/api/quality/inspection-prep/[id]/items/[itemId]/heats/[heatId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ heatId: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("inspectionPrep", "write");
    if (!authorized) return response!;

    const { heatId } = await params;
    const body = await request.json();
    const { heatNo, lengthMtr, pieces, make } = body;

    const heat = await prisma.heatEntry.update({
      where: { id: heatId },
      data: {
        heatNo: heatNo ?? undefined,
        lengthMtr: lengthMtr !== undefined ? parseFloat(lengthMtr) : undefined,
        pieces: pieces !== undefined ? parseInt(pieces) : undefined,
        make: make ?? undefined,
      },
    });

    return NextResponse.json(heat);
  } catch (error: any) {
    console.error("Error updating heat entry:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update heat entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ heatId: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("inspectionPrep", "write");
    if (!authorized) return response!;

    const { heatId } = await params;

    await prisma.heatEntry.delete({ where: { id: heatId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting heat entry:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete heat entry" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/quality/inspection-prep/[id]/items/ src/app/api/quality/inspection-prep/[id]/items/[itemId]/heats/
git commit -m "feat: add heat entry CRUD API endpoints"
```

---

## Task 6: MTCDocument API (QA-only)

**Files:**
- Create: `src/app/api/quality/inspection-prep/[id]/items/[itemId]/heats/[heatId]/mtc/route.ts`
- Create: `src/app/api/quality/inspection-prep/[id]/items/[itemId]/heats/[heatId]/mtc/[mtcId]/route.ts`

- [ ] **Step 1: Create MTC list/create route**

Create `src/app/api/quality/inspection-prep/[id]/items/[itemId]/heats/[heatId]/mtc/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

// QA-only: write access maps to QC role
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ heatId: string }> }
) {
  try {
    // Use inspectionPrep write — QC, STORES, MANAGEMENT, ADMIN can write.
    // We further restrict to QC/MANAGEMENT/ADMIN by checking role in session.
    const { authorized, session, response } = await checkAccess("inspectionPrep", "write");
    if (!authorized) return response!;

    const allowedRoles = ["QC", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: "Only QA/Manager can add MTC documents" },
        { status: 403 }
      );
    }

    const { heatId } = await params;
    const body = await request.json();
    const { mtcNo, mtcDate, fileUrl } = body;

    if (!mtcNo) {
      return NextResponse.json({ error: "MTC number is required" }, { status: 400 });
    }

    const mtc = await prisma.mTCDocument.create({
      data: {
        heatEntryId: heatId,
        mtcNo,
        mtcDate: mtcDate ? new Date(mtcDate) : null,
        fileUrl: fileUrl || null,
        addedById: session.user.id,
      },
    });

    return NextResponse.json(mtc, { status: 201 });
  } catch (error: any) {
    console.error("Error adding MTC document:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to add MTC document" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create MTC detail route (PATCH/DELETE)**

Create `src/app/api/quality/inspection-prep/[id]/items/[itemId]/heats/[heatId]/mtc/[mtcId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ mtcId: string }> }
) {
  try {
    const { authorized, session, response } = await checkAccess("inspectionPrep", "write");
    if (!authorized) return response!;

    const allowedRoles = ["QC", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Only QA/Manager can edit MTC documents" }, { status: 403 });
    }

    const { mtcId } = await params;
    const body = await request.json();
    const { mtcNo, mtcDate, fileUrl } = body;

    const mtc = await prisma.mTCDocument.update({
      where: { id: mtcId },
      data: {
        mtcNo: mtcNo ?? undefined,
        mtcDate: mtcDate ? new Date(mtcDate) : undefined,
        fileUrl: fileUrl ?? undefined,
      },
    });

    return NextResponse.json(mtc);
  } catch (error: any) {
    console.error("Error updating MTC document:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update MTC document" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ mtcId: string }> }
) {
  try {
    const { authorized, session, response } = await checkAccess("inspectionPrep", "write");
    if (!authorized) return response!;

    const allowedRoles = ["QC", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Only QA/Manager can delete MTC documents" }, { status: 403 });
    }

    const { mtcId } = await params;
    await prisma.mTCDocument.delete({ where: { id: mtcId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting MTC document:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete MTC document" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/quality/inspection-prep/[id]/items/[itemId]/heats/[heatId]/mtc/"
git commit -m "feat: add MTC document CRUD API (QA-only role enforcement)"
```

---

## Task 7: Generate Inspection Offer API

**Files:**
- Create: `src/app/api/quality/inspection-prep/[id]/generate-offer/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("inspectionOffer", "write");
    if (!authorized) return response!;

    // QA and above only
    const allowedRoles = ["QC", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Only QA/Manager can generate inspection offers" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    // selectedItems: Array of { itemId, heats: Array<{ heatId, piecesSelected? }> }
    const { selectedItems, customerId, tpiAgencyId, inspectionLocation, proposedInspectionDate, remarks } = body;

    if (!selectedItems || selectedItems.length === 0) {
      return NextResponse.json({ error: "Select at least one item for the offer" }, { status: 400 });
    }
    if (!customerId) {
      return NextResponse.json({ error: "Customer is required" }, { status: 400 });
    }

    const prep = await prisma.inspectionPrep.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            heatEntries: { include: { mtcDocuments: true } },
          },
        },
      },
    });

    if (!prep) {
      return NextResponse.json({ error: "Inspection Prep not found" }, { status: 404 });
    }

    const offerNo = await generateDocumentNumber("INSPECTION_OFFER", companyId);

    const offer = await prisma.inspectionOffer.create({
      data: {
        companyId,
        offerNo,
        customerId,
        inspectionPrepId: id,
        tpiAgencyId: tpiAgencyId || null,
        inspectionLocation: inspectionLocation || null,
        proposedInspectionDate: proposedInspectionDate ? new Date(proposedInspectionDate) : null,
        remarks: remarks || null,
        status: "DRAFT",
        createdById: session.user.id,
        items: {
          create: selectedItems.map((sel: any, idx: number) => {
            const prepItem = prep.items.find((i) => i.id === sel.itemId);
            return {
              sNo: idx + 1,
              product: prepItem?.description || null,
              sizeLabel: prepItem?.sizeLabel || null,
              uom: prepItem?.uom || null,
              piecesSelected: sel.heats?.reduce(
                (sum: number, h: any) => sum + (h.piecesSelected || 0),
                0
              ) || null,
              heatSelections: {
                create: (sel.heats || []).map((h: any) => ({
                  heatEntryId: h.heatId,
                  piecesSelected: h.piecesSelected || null,
                })),
              },
            };
          }),
        },
      },
      include: {
        items: { include: { heatSelections: true } },
      },
    });

    // Update prep status
    await prisma.inspectionPrep.update({
      where: { id },
      data: { status: "OFFER_GENERATED" },
    });

    createAuditLog({
      userId: session.user.id,
      companyId,
      action: "CREATE",
      tableName: "InspectionOffer",
      recordId: offer.id,
      newValue: JSON.stringify({ offerNo: offer.offerNo, from: "InspectionPrep", prepId: id }),
    }).catch(console.error);

    return NextResponse.json(offer, { status: 201 });
  } catch (error: any) {
    console.error("Error generating inspection offer:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate inspection offer" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/api/quality/inspection-prep/[id]/generate-offer/route.ts"
git commit -m "feat: add generate-offer API with 3-level item selection"
```

---

## Task 8: InspectionOffer Approval Workflow API

**Files:**
- Modify: `src/app/api/quality/inspection-offers/[id]/route.ts`

- [ ] **Step 1: Add PATCH handler to existing file**

Open `src/app/api/quality/inspection-offers/[id]/route.ts`. The file currently has only a GET handler. Add this PATCH function to the same file:

```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("inspectionOffer", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();
    const { action, tpiAgencyId, rejectionRemarks } = body;

    const existing = await prisma.inspectionOffer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Inspection Offer not found" }, { status: 404 });
    }

    let updateData: any = {};

    if (action === "submit_for_approval") {
      if (existing.status !== "DRAFT") {
        return NextResponse.json({ error: "Only DRAFT offers can be submitted" }, { status: 400 });
      }
      updateData = { status: "PENDING_APPROVAL" };
    } else if (action === "approve") {
      if (!["MANAGEMENT", "ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
        return NextResponse.json({ error: "Only managers can approve offers" }, { status: 403 });
      }
      if (existing.status !== "PENDING_APPROVAL") {
        return NextResponse.json({ error: "Only offers pending approval can be approved" }, { status: 400 });
      }
      updateData = { status: "APPROVED", approvedById: session.user.id, approvedAt: new Date() };
    } else if (action === "reject") {
      if (!["MANAGEMENT", "ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
        return NextResponse.json({ error: "Only managers can reject offers" }, { status: 403 });
      }
      if (existing.status !== "PENDING_APPROVAL") {
        return NextResponse.json({ error: "Only offers pending approval can be rejected" }, { status: 400 });
      }
      if (!rejectionRemarks) {
        return NextResponse.json({ error: "Rejection remarks are required" }, { status: 400 });
      }
      updateData = {
        status: "DRAFT",
        rejectedById: session.user.id,
        rejectedAt: new Date(),
        rejectionRemarks,
      };
    } else if (action === "mark_sent") {
      if (existing.status !== "APPROVED") {
        return NextResponse.json({ error: "Only approved offers can be marked as sent" }, { status: 400 });
      }
      updateData = {
        status: "SENT",
        sentAt: new Date(),
        tpiAgencyId: tpiAgencyId || existing.tpiAgencyId,
      };
    } else if (action === "mark_tpi_signed") {
      if (existing.status !== "SENT") {
        return NextResponse.json({ error: "Offer must be in SENT status" }, { status: 400 });
      }
      updateData = { status: "INSPECTION_DONE", tpiSignedAt: new Date() };
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const updated = await prisma.inspectionOffer.update({
      where: { id },
      data: updateData,
    });

    createAuditLog({
      userId: session.user.id,
      companyId,
      action: "STATUS_CHANGE",
      tableName: "InspectionOffer",
      recordId: id,
      newValue: JSON.stringify({ action, status: updated.status }),
    }).catch(console.error);

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating inspection offer:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update inspection offer" },
      { status: 500 }
    );
  }
}
```

Also add the missing imports to the top of the file if not already present:
```typescript
import { createAuditLog } from "@/lib/audit";
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/quality/inspection-offers/[id]/route.ts
git commit -m "feat: add approval workflow PATCH actions to inspection offer API"
```

---

## Task 9: InspectionPrep List Page

**Files:**
- Create: `src/app/(dashboard)/quality/inspection-prep/page.tsx`

- [ ] **Step 1: Create the file**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import { format } from "date-fns";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  READY: "default",
  OFFER_GENERATED: "outline",
};

export default function InspectionPrepListPage() {
  const router = useRouter();
  const [preps, setPreps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchPreps();
  }, [search]);

  const fetchPreps = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quality/inspection-prep?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setPreps(data.preps || []);
    } finally {
      setLoading(false);
    }
  };

  const readyCount = (items: any[]) => items.filter((i: any) => i.status === "READY").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inspection Preparation</h1>
          <p className="text-muted-foreground text-sm">Manage heat entries and MTC documents before generating inspection offers</p>
        </div>
        <Button onClick={() => router.push("/quality/inspection-prep/create")}>
          <Plus className="w-4 h-4 mr-2" /> New Inspection Prep
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by prep no or PO no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prep No.</TableHead>
                <TableHead>PO No.</TableHead>
                <TableHead>MPR No.</TableHead>
                <TableHead>Items Ready</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prepared By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : preps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No inspection preparations found
                  </TableCell>
                </TableRow>
              ) : (
                preps.map((prep) => (
                  <TableRow key={prep.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/quality/inspection-prep/${prep.id}`)}>
                    <TableCell className="font-medium">{prep.prepNo}</TableCell>
                    <TableCell>{prep.purchaseOrder?.poNo || "—"}</TableCell>
                    <TableCell>{prep.warehouseIntimation?.mprNo || "—"}</TableCell>
                    <TableCell>
                      {readyCount(prep.items)} / {prep.items.length}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[prep.status] || "secondary"}>
                        {prep.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{prep.preparedBy?.name || "—"}</TableCell>
                    <TableCell>{format(new Date(prep.createdAt), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); router.push(`/quality/inspection-prep/${prep.id}`); }}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/quality/inspection-prep/page.tsx
git commit -m "feat: add inspection prep list page"
```

---

## Task 10: InspectionPrep Create Page

**Files:**
- Create: `src/app/(dashboard)/quality/inspection-prep/create/page.tsx`

- [ ] **Step 1: Create the file**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function InspectionPrepCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const poId = searchParams.get("poId");
  const intimationId = searchParams.get("intimationId");

  const [loading, setLoading] = useState(false);
  const [sourceData, setSourceData] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, { selected: boolean; make: string }>>({});

  useEffect(() => {
    if (poId) fetchPO();
    else if (intimationId) fetchIntimation();
  }, [poId, intimationId]);

  const fetchPO = async () => {
    const res = await fetch(`/api/purchase-orders/${poId}`);
    const data = await res.json();
    setSourceData({ type: "PO", ...data });
    const init: Record<string, { selected: boolean; make: string }> = {};
    (data.items || []).forEach((item: any) => {
      init[item.id] = { selected: true, make: "" };
    });
    setSelectedItems(init);
  };

  const fetchIntimation = async () => {
    const res = await fetch(`/api/warehouse/intimation/${intimationId}`);
    const data = await res.json();
    setSourceData({ type: "INTIMATION", ...data });
    const init: Record<string, { selected: boolean; make: string }> = {};
    (data.items || []).forEach((item: any) => {
      init[item.id] = { selected: true, make: "" };
    });
    setSelectedItems(init);
  };

  const handleSubmit = async () => {
    if (!poId && !intimationId) {
      toast.error("No PO or Intimation selected");
      return;
    }

    const items = (sourceData?.items || [])
      .filter((item: any) => selectedItems[item.id]?.selected)
      .map((item: any) => ({
        poItemId: sourceData.type === "PO" ? item.id : item.poItemId || null,
        description: item.description || item.itemDescription || null,
        sizeLabel: item.sizeLabel || item.size || null,
        uom: item.uom || null,
        make: selectedItems[item.id]?.make || null,
      }));

    if (items.length === 0) {
      toast.error("Select at least one item");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/quality/inspection-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poId: poId || null,
          warehouseIntimationId: intimationId || null,
          itemsToInclude: items,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }

      const prep = await res.json();
      toast.success(`Inspection Prep ${prep.prepNo} created`);
      router.push(`/quality/inspection-prep/${prep.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!poId && !intimationId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">No source selected. Use the "Prepare for Inspection" button from a PO or Warehouse Intimation.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Inspection Preparation</h1>
          <p className="text-muted-foreground text-sm">
            {sourceData?.type === "PO" ? `PO: ${sourceData.poNo}` : `MPR: ${sourceData?.mprNo || intimationId}`}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Items to Include</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!sourceData ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            (sourceData.items || []).map((item: any) => (
              <div key={item.id} className="flex items-start gap-4 p-3 border rounded-lg">
                <Checkbox
                  checked={selectedItems[item.id]?.selected ?? true}
                  onCheckedChange={(v) =>
                    setSelectedItems((prev) => ({ ...prev, [item.id]: { ...prev[item.id], selected: !!v } }))
                  }
                />
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <p className="font-medium text-sm">{item.description || item.itemDescription || "—"}</p>
                    <p className="text-xs text-muted-foreground">{item.sizeLabel || item.size || ""} {item.uom || ""}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Default Make</Label>
                    <Input
                      placeholder="Manufacturer / make"
                      value={selectedItems[item.id]?.make || ""}
                      onChange={(e) =>
                        setSelectedItems((prev) => ({ ...prev, [item.id]: { ...prev[item.id], make: e.target.value } }))
                      }
                      className="h-8 text-sm"
                      disabled={!selectedItems[item.id]?.selected}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={loading || !sourceData}>
          {loading ? "Creating..." : "Create Inspection Prep"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/quality/inspection-prep/create/page.tsx
git commit -m "feat: add inspection prep create page with item selection"
```

---

## Task 11: InspectionPrep Detail Page (Tabs)

**Files:**
- Create: `src/app/(dashboard)/quality/inspection-prep/[id]/page.tsx`

This is the most complex page. It has 3 tabs: Items & Heats (Warehouse), MTC Documents (QA), Summary + Generate Offer.

- [ ] **Step 1: Create the file**

```typescript
"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronRight, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";

const QA_ROLES = ["QC", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"];

export default function InspectionPrepDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "";
  const isQA = QA_ROLES.includes(userRole);

  const [prep, setPrep] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  // Generate offer dialog state
  const [selectedHeats, setSelectedHeats] = useState<
    Record<string, { selected: boolean; piecesSelected: string }>
  >({});
  const [offerCustomerId, setOfferCustomerId] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchPrep();
    fetchCustomers();
  }, [id]);

  const fetchPrep = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quality/inspection-prep/${id}`);
      const data = await res.json();
      setPrep(data);
      // Auto-expand all items
      const expanded: Record<string, boolean> = {};
      (data.items || []).forEach((item: any) => { expanded[item.id] = true; });
      setExpandedItems(expanded);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    const res = await fetch("/api/customers?limit=200");
    const data = await res.json();
    setCustomers(data.customers || []);
  };

  // --- Heat Entry CRUD ---
  const addHeat = async (itemId: string, heatData: { heatNo: string; lengthMtr: string; pieces: string; make: string }) => {
    const res = await fetch(`/api/quality/inspection-prep/${id}/items/${itemId}/heats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(heatData),
    });
    if (!res.ok) { toast.error("Failed to add heat entry"); return; }
    toast.success("Heat entry added");
    fetchPrep();
  };

  const deleteHeat = async (itemId: string, heatId: string) => {
    const res = await fetch(`/api/quality/inspection-prep/${id}/items/${itemId}/heats/${heatId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete heat"); return; }
    toast.success("Heat entry removed");
    fetchPrep();
  };

  // --- MTC CRUD ---
  const addMTC = async (itemId: string, heatId: string, mtcData: { mtcNo: string; mtcDate: string }) => {
    const res = await fetch(`/api/quality/inspection-prep/${id}/items/${itemId}/heats/${heatId}/mtc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mtcData),
    });
    if (!res.ok) { toast.error("Failed to add MTC"); return; }
    toast.success("MTC document added");
    fetchPrep();
  };

  const deleteMTC = async (itemId: string, heatId: string, mtcId: string) => {
    const res = await fetch(`/api/quality/inspection-prep/${id}/items/${itemId}/heats/${heatId}/mtc/${mtcId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete MTC"); return; }
    toast.success("MTC removed");
    fetchPrep();
  };

  // --- Generate Offer ---
  const openGenerateDialog = () => {
    const init: Record<string, { selected: boolean; piecesSelected: string }> = {};
    (prep?.items || []).forEach((item: any) => {
      (item.heatEntries || []).forEach((heat: any) => {
        init[heat.id] = { selected: true, piecesSelected: String(heat.pieces || "") };
      });
    });
    setSelectedHeats(init);
    setShowGenerateDialog(true);
  };

  const generateOffer = async () => {
    if (!offerCustomerId) { toast.error("Select a customer"); return; }

    const selectedItems = (prep?.items || [])
      .map((item: any) => ({
        itemId: item.id,
        heats: (item.heatEntries || [])
          .filter((h: any) => selectedHeats[h.id]?.selected)
          .map((h: any) => ({
            heatId: h.id,
            piecesSelected: parseInt(selectedHeats[h.id]?.piecesSelected || "0") || null,
          })),
      }))
      .filter((item) => item.heats.length > 0);

    if (selectedItems.length === 0) { toast.error("Select at least one heat entry"); return; }

    setGenerating(true);
    try {
      const res = await fetch(`/api/quality/inspection-prep/${id}/generate-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedItems, customerId: offerCustomerId }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const offer = await res.json();
      toast.success(`Inspection Offer ${offer.offerNo} created`);
      setShowGenerateDialog(false);
      router.push(`/quality/inspection-offers/${offer.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;
  if (!prep) return <div className="p-6 text-muted-foreground">Not found</div>;

  const allItemsReady = prep.items.every((i: any) => i.status === "READY");

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/quality/inspection-prep")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{prep.prepNo}</h1>
            <Badge variant={prep.status === "OFFER_GENERATED" ? "outline" : prep.status === "READY" ? "default" : "secondary"}>
              {prep.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {prep.purchaseOrder ? `PO: ${prep.purchaseOrder.poNo}` : ""}
            {prep.warehouseIntimation ? `MPR: ${prep.warehouseIntimation.mprNo}` : ""}
            {" · "}Prepared by {prep.preparedBy?.name} · {format(new Date(prep.createdAt), "dd/MM/yyyy")}
          </p>
        </div>
      </div>

      <Tabs defaultValue="heats">
        <TabsList>
          <TabsTrigger value="heats">Items & Heat Details</TabsTrigger>
          <TabsTrigger value="mtc">MTC Documents</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        {/* TAB 1: Items & Heats (Warehouse fills) */}
        <TabsContent value="heats" className="space-y-4">
          {prep.items.map((item: any) => (
            <ItemHeatCard
              key={item.id}
              item={item}
              expanded={expandedItems[item.id]}
              onToggle={() => setExpandedItems((p) => ({ ...p, [item.id]: !p[item.id] }))}
              onAddHeat={(data) => addHeat(item.id, data)}
              onDeleteHeat={(heatId) => deleteHeat(item.id, heatId)}
              showMTCColumns={false}
              isQA={isQA}
            />
          ))}
        </TabsContent>

        {/* TAB 2: MTC Documents (QA fills) */}
        <TabsContent value="mtc" className="space-y-4">
          {!isQA && (
            <p className="text-sm text-muted-foreground border rounded p-3">
              MTC documents are filled by QA department only.
            </p>
          )}
          {prep.items.map((item: any) => (
            <ItemHeatCard
              key={item.id}
              item={item}
              expanded={expandedItems[item.id]}
              onToggle={() => setExpandedItems((p) => ({ ...p, [item.id]: !p[item.id] }))}
              onAddHeat={(data) => addHeat(item.id, data)}
              onDeleteHeat={(heatId) => deleteHeat(item.id, heatId)}
              onAddMTC={(heatId, data) => addMTC(item.id, heatId, data)}
              onDeleteMTC={(heatId, mtcId) => deleteMTC(item.id, heatId, mtcId)}
              showMTCColumns
              isQA={isQA}
            />
          ))}
        </TabsContent>

        {/* TAB 3: Summary */}
        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Total Length (m)</TableHead>
                    <TableHead>Total Pieces</TableHead>
                    <TableHead>Heat Entries</TableHead>
                    <TableHead>MTC Docs</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prep.items.map((item: any) => {
                    const totalLength = item.heatEntries.reduce((s: number, h: any) => s + parseFloat(h.lengthMtr || 0), 0);
                    const totalPieces = item.heatEntries.reduce((s: number, h: any) => s + (h.pieces || 0), 0);
                    const mtcCount = item.heatEntries.reduce((s: number, h: any) => s + h.mtcDocuments.length, 0);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>{item.description || "—"}<br /><span className="text-xs text-muted-foreground">{item.sizeLabel}</span></TableCell>
                        <TableCell>{totalLength.toFixed(3)}</TableCell>
                        <TableCell>{totalPieces}</TableCell>
                        <TableCell>{item.heatEntries.length}</TableCell>
                        <TableCell>{mtcCount}</TableCell>
                        <TableCell>
                          <Badge variant={item.status === "READY" ? "default" : "secondary"}>
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {isQA && prep.status !== "OFFER_GENERATED" && (
                <div className="mt-6 flex justify-end">
                  <Button onClick={openGenerateDialog}>
                    Generate Inspection Offer
                  </Button>
                </div>
              )}
              {prep.status === "OFFER_GENERATED" && (
                <p className="mt-4 text-sm text-muted-foreground text-right">
                  Inspection offer has been generated from this prep.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generate Offer Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Inspection Offer</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Customer *</Label>
              <select
                className="w-full border rounded px-3 py-2 text-sm mt-1"
                value={offerCustomerId}
                onChange={(e) => setOfferCustomerId(e.target.value)}
              >
                <option value="">Select customer...</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Select Items / Heats</Label>
              {(prep?.items || []).map((item: any) => (
                <div key={item.id} className="mb-3 border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 font-medium text-sm">
                    <Checkbox
                      checked={(item.heatEntries || []).every((h: any) => selectedHeats[h.id]?.selected)}
                      onCheckedChange={(v) => {
                        const update: Record<string, { selected: boolean; piecesSelected: string }> = {};
                        (item.heatEntries || []).forEach((h: any) => {
                          update[h.id] = { ...selectedHeats[h.id], selected: !!v };
                        });
                        setSelectedHeats((p) => ({ ...p, ...update }));
                      }}
                    />
                    {item.description || "Item"} — {item.sizeLabel}
                  </div>
                  {(item.heatEntries || []).map((heat: any) => (
                    <div key={heat.id} className="flex items-center gap-3 px-4 py-2 border-t text-sm">
                      <Checkbox
                        checked={selectedHeats[heat.id]?.selected ?? true}
                        onCheckedChange={(v) =>
                          setSelectedHeats((p) => ({ ...p, [heat.id]: { ...p[heat.id], selected: !!v } }))
                        }
                      />
                      <span className="flex-1">Heat: <strong>{heat.heatNo}</strong> · {heat.lengthMtr}m · {heat.pieces} pcs</span>
                      <div className="flex items-center gap-1">
                        <Label className="text-xs text-muted-foreground">Pcs:</Label>
                        <Input
                          type="number"
                          className="w-16 h-7 text-xs"
                          value={selectedHeats[heat.id]?.piecesSelected || ""}
                          onChange={(e) =>
                            setSelectedHeats((p) => ({ ...p, [heat.id]: { ...p[heat.id], piecesSelected: e.target.value } }))
                          }
                          disabled={!selectedHeats[heat.id]?.selected}
                        />
                        <span className="text-xs text-muted-foreground">of {heat.pieces}</span>
                      </div>
                      <div className="flex gap-1">
                        {(heat.mtcDocuments || []).map((m: any) => (
                          <Badge key={m.id} variant="outline" className="text-xs">{m.mtcNo}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
            <Button onClick={generateOffer} disabled={generating}>
              {generating ? "Generating..." : "Generate Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Sub-component: ItemHeatCard ----
interface ItemHeatCardProps {
  item: any;
  expanded: boolean;
  onToggle: () => void;
  onAddHeat: (data: { heatNo: string; lengthMtr: string; pieces: string; make: string }) => void;
  onDeleteHeat: (heatId: string) => void;
  onAddMTC?: (heatId: string, data: { mtcNo: string; mtcDate: string }) => void;
  onDeleteMTC?: (heatId: string, mtcId: string) => void;
  showMTCColumns: boolean;
  isQA: boolean;
}

function ItemHeatCard({ item, expanded, onToggle, onAddHeat, onDeleteHeat, onAddMTC, onDeleteMTC, showMTCColumns, isQA }: ItemHeatCardProps) {
  const [newHeat, setNewHeat] = useState({ heatNo: "", lengthMtr: "", pieces: "", make: item.make || "" });
  const [showAddHeat, setShowAddHeat] = useState(false);
  const [newMTCs, setNewMTCs] = useState<Record<string, { mtcNo: string; mtcDate: string }>>({});

  const handleAddHeat = () => {
    if (!newHeat.heatNo) { toast.error("Heat number required"); return; }
    onAddHeat(newHeat);
    setNewHeat({ heatNo: "", lengthMtr: "", pieces: "", make: item.make || "" });
    setShowAddHeat(false);
  };

  return (
    <Card>
      <CardHeader className="py-3 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span className="font-medium">{item.description || "Item"}</span>
          <span className="text-muted-foreground text-sm">{item.sizeLabel}</span>
          <Badge variant={item.status === "READY" ? "default" : "secondary"} className="ml-auto">
            {item.heatEntries.length} heats
          </Badge>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Heat No.</TableHead>
                <TableHead>Length (m)</TableHead>
                <TableHead>Pieces</TableHead>
                <TableHead>Make</TableHead>
                {showMTCColumns && <TableHead>MTC Documents</TableHead>}
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {item.heatEntries.map((heat: any) => (
                <TableRow key={heat.id}>
                  <TableCell className="font-medium">{heat.heatNo}</TableCell>
                  <TableCell>{heat.lengthMtr || "—"}</TableCell>
                  <TableCell>{heat.pieces || "—"}</TableCell>
                  <TableCell>{heat.make || item.make || "—"}</TableCell>
                  {showMTCColumns && (
                    <TableCell>
                      <div className="space-y-1">
                        {heat.mtcDocuments.map((mtc: any) => (
                          <div key={mtc.id} className="flex items-center gap-2 text-xs">
                            <span className="font-medium">{mtc.mtcNo}</span>
                            {mtc.mtcDate && <span className="text-muted-foreground">{format(new Date(mtc.mtcDate), "dd/MM/yyyy")}</span>}
                            {isQA && (
                              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => onDeleteMTC?.(heat.id, mtc.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {isQA && (
                          <MtcAddRow
                            value={newMTCs[heat.id] || { mtcNo: "", mtcDate: "" }}
                            onChange={(v) => setNewMTCs((p) => ({ ...p, [heat.id]: v }))}
                            onAdd={() => {
                              if (!newMTCs[heat.id]?.mtcNo) { toast.error("MTC number required"); return; }
                              onAddMTC?.(heat.id, newMTCs[heat.id]);
                              setNewMTCs((p) => ({ ...p, [heat.id]: { mtcNo: "", mtcDate: "" } }));
                            }}
                          />
                        )}
                        {!isQA && heat.mtcDocuments.length === 0 && (
                          <span className="text-xs text-muted-foreground italic">Pending QA</span>
                        )}
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDeleteHeat(heat.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {showAddHeat && (
                <TableRow>
                  <TableCell><Input placeholder="Heat No. *" value={newHeat.heatNo} onChange={(e) => setNewHeat((p) => ({ ...p, heatNo: e.target.value }))} className="h-8 text-sm" /></TableCell>
                  <TableCell><Input type="number" placeholder="Length (m)" value={newHeat.lengthMtr} onChange={(e) => setNewHeat((p) => ({ ...p, lengthMtr: e.target.value }))} className="h-8 text-sm" /></TableCell>
                  <TableCell><Input type="number" placeholder="Pieces" value={newHeat.pieces} onChange={(e) => setNewHeat((p) => ({ ...p, pieces: e.target.value }))} className="h-8 text-sm" /></TableCell>
                  <TableCell><Input placeholder="Make" value={newHeat.make} onChange={(e) => setNewHeat((p) => ({ ...p, make: e.target.value }))} className="h-8 text-sm" /></TableCell>
                  {showMTCColumns && <TableCell />}
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" className="h-8" onClick={handleAddHeat}>Add</Button>
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowAddHeat(false)}>✕</Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowAddHeat(true)}>
            <Plus className="w-3 h-3 mr-1" /> Add Heat Entry
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

function MtcAddRow({ value, onChange, onAdd }: { value: { mtcNo: string; mtcDate: string }; onChange: (v: { mtcNo: string; mtcDate: string }) => void; onAdd: () => void }) {
  return (
    <div className="flex gap-1 mt-1">
      <Input placeholder="MTC No." value={value.mtcNo} onChange={(e) => onChange({ ...value, mtcNo: e.target.value })} className="h-7 text-xs w-28" />
      <Input type="date" value={value.mtcDate} onChange={(e) => onChange({ ...value, mtcDate: e.target.value })} className="h-7 text-xs w-32" />
      <Button size="sm" className="h-7 text-xs px-2" onClick={onAdd}>+ MTC</Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/quality/inspection-prep/\[id\]/page.tsx
git commit -m "feat: add inspection prep detail page with heat/MTC management and offer generation dialog"
```

---

## Task 12: Extend InspectionOffer Detail Page (Approval UI)

**Files:**
- Modify: `src/app/(dashboard)/quality/inspection-offers/[id]/page.tsx`

- [ ] **Step 1: Add approval state and action buttons**

Open `src/app/(dashboard)/quality/inspection-offers/[id]/page.tsx`. Locate the existing component. Add:

1. Import `useSession` from `next-auth/react` at the top if not present:
```typescript
import { useSession } from "next-auth/react";
```

2. Add session and role inside the component (after existing state declarations):
```typescript
const { data: session } = useSession();
const userRole = (session?.user as any)?.role || "";
const isManager = ["MANAGEMENT", "ADMIN", "SUPER_ADMIN"].includes(userRole);
const isQA = ["QC", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"].includes(userRole);
```

3. Add rejection dialog state:
```typescript
const [showRejectDialog, setShowRejectDialog] = useState(false);
const [rejectionRemarks, setRejectionRemarks] = useState("");
const [actionLoading, setActionLoading] = useState(false);
```

4. Add the action handler function (before the return statement):
```typescript
const handleOfferAction = async (action: string, extra?: Record<string, string>) => {
  setActionLoading(true);
  try {
    const res = await fetch(`/api/quality/inspection-offers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    toast.success("Status updated");
    fetchOffer(); // call the existing fetch function
  } catch (err: any) {
    toast.error(err.message);
  } finally {
    setActionLoading(false);
  }
};
```

5. In the JSX, add this status+actions block after the existing PDF download buttons (or in the card header area):
```tsx
{/* Approval workflow actions */}
<div className="flex items-center gap-2 flex-wrap">
  <Badge variant={
    offer?.status === "APPROVED" ? "default" :
    offer?.status === "PENDING_APPROVAL" ? "secondary" :
    offer?.status === "DRAFT" ? "outline" : "default"
  }>
    {offer?.status?.replace(/_/g, " ")}
  </Badge>

  {offer?.status === "DRAFT" && isQA && (
    <Button size="sm" onClick={() => handleOfferAction("submit_for_approval")} disabled={actionLoading}>
      Submit for Approval
    </Button>
  )}
  {offer?.status === "PENDING_APPROVAL" && isManager && (
    <>
      <Button size="sm" onClick={() => handleOfferAction("approve")} disabled={actionLoading}>
        Approve
      </Button>
      <Button size="sm" variant="destructive" onClick={() => setShowRejectDialog(true)} disabled={actionLoading}>
        Reject
      </Button>
    </>
  )}
  {offer?.status === "APPROVED" && isQA && (
    <Button size="sm" onClick={() => handleOfferAction("mark_sent")} disabled={actionLoading}>
      Mark as Sent to TPI
    </Button>
  )}
  {offer?.status === "SENT" && isQA && (
    <Button size="sm" onClick={() => handleOfferAction("mark_tpi_signed")} disabled={actionLoading}>
      Mark TPI Sign-off Received
    </Button>
  )}
  {offer?.status === "INSPECTION_DONE" && isQA && (
    <Button size="sm" onClick={() => router.push(`/quality/inspections/create?offerId=${id}`)}>
      Create Inspection Report
    </Button>
  )}
</div>

{offer?.rejectionRemarks && (
  <p className="text-sm text-destructive mt-1">
    Rejection remarks: {offer.rejectionRemarks}
  </p>
)}

{/* Reject dialog */}
<Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
  <DialogContent>
    <DialogHeader><DialogTitle>Reject Inspection Offer</DialogTitle></DialogHeader>
    <div className="space-y-3">
      <Label>Rejection Remarks *</Label>
      <textarea
        className="w-full border rounded p-2 text-sm min-h-[80px]"
        value={rejectionRemarks}
        onChange={(e) => setRejectionRemarks(e.target.value)}
        placeholder="Explain why this offer is being rejected..."
      />
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
      <Button variant="destructive" onClick={() => {
        if (!rejectionRemarks.trim()) { toast.error("Remarks required"); return; }
        handleOfferAction("reject", { rejectionRemarks });
        setShowRejectDialog(false);
      }}>
        Reject
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

6. Add missing imports at the top of the file:
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/quality/inspection-offers/\[id\]/page.tsx
git commit -m "feat: add approval workflow UI to inspection offer detail page"
```

---

## Task 13: Add "Prepare for Inspection" Buttons on Entry Point Pages

**Files:**
- Modify: PO detail page (find with grep)
- Modify: Warehouse Intimation detail page (find with grep)

- [ ] **Step 1: Find the PO detail page**

```bash
grep -r "purchase-orders" src/app/\(dashboard\) --include="*.tsx" -l | grep "\[id\]"
```

Open the found file. Locate the action buttons section (look for existing PDF download buttons or action bar). Add a "Prepare for Inspection" button that only shows when PO status is approved:

```tsx
{/* Add after existing action buttons */}
{(po?.status === "APPROVED" || po?.status === "CONFIRMED") && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => router.push(`/quality/inspection-prep/create?poId=${id}`)}
  >
    Prepare for Inspection
  </Button>
)}
```

Make sure `useRouter` is imported and used. Add `import { useRouter } from "next/navigation"` if not present.

- [ ] **Step 2: Find the Warehouse Intimation detail page**

```bash
grep -r "intimation" src/app/\(dashboard\) --include="*.tsx" -l | grep "\[id\]"
```

Open the found file. Add similarly:

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => router.push(`/quality/inspection-prep/create?intimationId=${id}`)}
>
  Prepare for Inspection
</Button>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/purchase-orders/ src/app/\(dashboard\)/warehouse/
git commit -m "feat: add Prepare for Inspection button on PO and Warehouse Intimation pages"
```

---

## Task 14: Wire Inspection Report Create Page to Accept offerId

**Files:**
- Modify: `src/app/(dashboard)/quality/inspections/create/page.tsx`

- [ ] **Step 1: Read the file to understand current structure**

Read `src/app/(dashboard)/quality/inspections/create/page.tsx` to understand the existing form fields.

- [ ] **Step 2: Add offerId param support**

Add `useSearchParams` import if not present:
```typescript
import { useSearchParams } from "next/navigation";
```

Inside the component, add:
```typescript
const searchParams = useSearchParams();
const offerId = searchParams.get("offerId");
```

Add a `useEffect` to pre-fill from the offer when `offerId` is present:
```typescript
useEffect(() => {
  if (offerId) fetchFromOffer();
}, [offerId]);

const fetchFromOffer = async () => {
  const res = await fetch(`/api/quality/inspection-offers/${offerId}`);
  const offer = await res.json();
  // Pre-fill any matching fields, e.g.:
  setFormData((p: any) => ({
    ...p,
    inspectionOfferId: offer.id,
    offerNo: offer.offerNo,
    customerId: offer.customerId || "",
    // add other fields that map from offer to inspection report
  }));
};
```

Also add `inspectionOfferId` to the POST body when submitting:
```typescript
body: JSON.stringify({
  ...formData,
  inspectionOfferId: offerId || undefined,
}),
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/quality/inspections/create/page.tsx
git commit -m "feat: pre-fill inspection report create page from inspection offer"
```

---

## Task 15: Navigation Sidebar Links

**Files:**
- Modify: sidebar nav config (find with grep below)

- [ ] **Step 1: Find the sidebar nav config**

```bash
grep -r "inspection-offers" src --include="*.ts" --include="*.tsx" -l | grep -v "app/api" | grep -v "\[id\]"
```

This will find files that reference navigation items. Open the relevant nav config file.

- [ ] **Step 2: Add Inspection Prep nav item**

In the quality/inspection section of the nav config, add alongside the existing `inspection-offers` entry:

```typescript
{
  label: "Inspection Prep",
  href: "/quality/inspection-prep",
  icon: ClipboardList, // or whichever icon is used in that file
},
```

Import the icon at the top of the file if needed (check what icons are already imported).

- [ ] **Step 3: Commit**

```bash
git add src/  # only the nav file
git commit -m "feat: add Inspection Prep to sidebar navigation"
```

---

## Task 16: Data Migration for Existing WarehouseItemDetail Rows

**Files:**
- Create: `scripts/migrate-warehouse-details-to-heats.ts`

- [ ] **Step 1: Create migration script**

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting migration: WarehouseItemDetail → HeatEntry + MTCDocument");

  const details = await prisma.warehouseItemDetail.findMany({
    where: {
      heatNo: { not: null },
    },
    include: {
      warehouseIntimationItem: {
        include: {
          warehouseIntimation: true,
        },
      },
    },
  });

  console.log(`Found ${details.length} WarehouseItemDetail rows with heatNo set`);

  let created = 0;
  let skipped = 0;

  for (const detail of details) {
    // Find or create an InspectionPrep for the parent intimation
    const intimation = detail.warehouseIntimationItem.warehouseIntimation;

    let prep = await prisma.inspectionPrep.findFirst({
      where: { warehouseIntimationId: intimation.id },
    });

    if (!prep) {
      const prepNo = `MIGRATED-${intimation.id.slice(-6).toUpperCase()}`;
      prep = await prisma.inspectionPrep.create({
        data: {
          prepNo,
          companyId: intimation.companyId || null,
          warehouseIntimationId: intimation.id,
          status: "READY",
        },
      });
    }

    // Find or create InspectionPrepItem for this intimation item
    let prepItem = await prisma.inspectionPrepItem.findFirst({
      where: {
        inspectionPrepId: prep.id,
        poItemId: detail.warehouseIntimationItem.poItemId || undefined,
      },
    });

    if (!prepItem) {
      prepItem = await prisma.inspectionPrepItem.create({
        data: {
          inspectionPrepId: prep.id,
          poItemId: detail.warehouseIntimationItem.poItemId || null,
          make: detail.make || null,
          status: "READY",
        },
      });
    }

    // Create HeatEntry
    const heatEntry = await prisma.heatEntry.create({
      data: {
        inspectionPrepItemId: prepItem.id,
        heatNo: detail.heatNo!,
        lengthMtr: detail.lengthMtr ?? null,
        pieces: detail.pieces ?? null,
        make: detail.make ?? null,
      },
    });

    // Create MTCDocument if mtcNo exists
    if (detail.mtcNo) {
      await prisma.mTCDocument.create({
        data: {
          heatEntryId: heatEntry.id,
          mtcNo: detail.mtcNo,
          mtcDate: detail.mtcDate ?? null,
        },
      });
    }

    created++;
  }

  console.log(`Migration complete: ${created} heat entries created, ${skipped} skipped`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run migration (when ready)**

```bash
cd E:/freelance/erp-claude
npx ts-node scripts/migrate-warehouse-details-to-heats.ts
```

Expected: `Migration complete: N heat entries created, 0 skipped`

- [ ] **Step 3: Commit script**

```bash
git add scripts/migrate-warehouse-details-to-heats.ts
git commit -m "chore: add migration script for WarehouseItemDetail to HeatEntry+MTCDocument"
```

---

## Self-Review

### Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| Select PO as entry point | Task 13 (button), Task 10 (create page) |
| Select Warehouse Intimation as entry point | Task 13 (button), Task 10 (create page) |
| Select PO line items with make | Task 10 |
| Fill length, pieces, make, heat no per item | Task 11 (ItemHeatCard, Tab 1) |
| Multiple MTC no + date per heat (QA only) | Task 6 (API), Task 11 (Tab 2) |
| Inspection offer list from selection | Task 7 (API), Task 11 (generate dialog) |
| 3-level partial selection (item→heat→pieces) | Task 7 (API), Task 11 (dialog) |
| Generate Inspection Offer Letter | Task 7 (API) |
| Approval: QA submits → Manager approves | Task 8 (API), Task 12 (UI) |
| Rejection with remarks | Task 8 (API), Task 12 (UI) |
| Mark as Sent to TPI agency | Task 8 (API), Task 12 (UI) |
| Mark TPI sign-off received | Task 8 (API), Task 12 (UI) |
| Create Inspection Report from Offer | Task 12 (button), Task 14 (pre-fill) |
| Role-based MTC field locking | Task 6 (API role check), Task 11 (isQA guard) |
| Data migration for existing rows | Task 16 |
| Navigation sidebar | Task 15 |

All spec requirements covered. ✅
