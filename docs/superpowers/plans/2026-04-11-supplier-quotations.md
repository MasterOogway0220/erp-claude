# Supplier Quotations (Flexible) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Supplier Quotation module to capture vendor quotes with flexible charges (standard toggleable + custom free-form), varying pricing units, multiple document uploads, and a side-by-side create form ready for future AI/OCR extraction.

**Architecture:** New `SupplierQuotation`, `SupplierQuotationItem`, `SupplierQuotationCharge`, `SupplierQuotationDocument` Prisma models. Standard CRUD APIs with document upload. Three pages (register, create with side-by-side layout, detail). Constants file for charge types and pricing units. Optional RFQ linkage.

**Tech Stack:** Next.js 16, Prisma, PostgreSQL, shadcn/ui, Tailwind CSS, date-fns

**Spec:** `docs/superpowers/specs/2026-04-11-supplier-quotations-design.md`

---

## File Map

### New Files
| File | Purpose |
|------|---------|
| `src/lib/constants/supplier-quotations.ts` | CHARGE_TYPES, PRICING_UNITS, SQ_STATUSES constants |
| `src/app/api/purchase/supplier-quotations/route.ts` | GET list + POST create |
| `src/app/api/purchase/supplier-quotations/[id]/route.ts` | GET detail + PATCH update |
| `src/app/api/purchase/supplier-quotations/[id]/documents/route.ts` | POST upload + GET list |
| `src/app/api/purchase/supplier-quotations/[id]/documents/[docId]/route.ts` | DELETE document |
| `src/app/(dashboard)/purchase/supplier-quotations/page.tsx` | SQ register page |
| `src/app/(dashboard)/purchase/supplier-quotations/create/page.tsx` | Create SQ with side-by-side layout |
| `src/app/(dashboard)/purchase/supplier-quotations/[id]/page.tsx` | SQ detail page |

### Modified Files
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | 4 new models + reverse relations |
| `src/lib/document-numbering.ts` | Add "SUPPLIER_QUOTATION" type |
| `src/lib/rbac.ts` | Add "supplierQuotation" module to RBAC |
| `src/components/layout/sidebar.tsx` | Add Supplier Quotations under Purchase |

---

## Task 1: Schema — SupplierQuotation Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add all 4 models**

Add at the end of the schema:

```prisma
model SupplierQuotation {
  id              String    @id @default(cuid())
  companyId       String?
  company         CompanyMaster? @relation("SQCompany", fields: [companyId], references: [id])
  sqNo            String    @unique
  sqDate          DateTime  @default(now())
  vendorId        String
  vendor          VendorMaster @relation("SQVendor", fields: [vendorId], references: [id])
  vendorRef       String?
  quotationDate   DateTime?
  validUntil      DateTime?
  currency        String    @default("INR")
  paymentTerms    String?
  deliveryDays    Int?
  priceBasis      String?
  rfqId           String?
  rfq             RFQ?      @relation("SQFromRFQ", fields: [rfqId], references: [id])
  rfqVendorId     String?
  prId            String?
  subtotal        Decimal?  @db.Decimal(14, 2)
  totalCharges    Decimal?  @db.Decimal(14, 2)
  grandTotal      Decimal?  @db.Decimal(14, 2)
  status          String    @default("RECEIVED")
  remarks         String?   @db.Text
  createdById     String?
  createdBy       User?     @relation("SQCreatedBy", fields: [createdById], references: [id])
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  items           SupplierQuotationItem[]
  charges         SupplierQuotationCharge[]
  documents       SupplierQuotationDocument[]

  @@index([companyId])
  @@index([sqNo])
  @@index([vendorId])
  @@index([rfqId])
  @@index([status])
}

model SupplierQuotationItem {
  id                    String   @id @default(cuid())
  supplierQuotationId   String
  supplierQuotation     SupplierQuotation @relation(fields: [supplierQuotationId], references: [id], onDelete: Cascade)
  sNo                   Int
  product               String?
  material              String?
  additionalSpec        String?
  sizeLabel             String?
  quantity              Decimal  @db.Decimal(10, 3)
  uom                   String?
  pricingUnit           String   @default("PER_MTR")
  unitRate              Decimal  @db.Decimal(12, 2)
  amount                Decimal  @db.Decimal(14, 2)
  deliveryDays          Int?
  remarks               String?

  @@index([supplierQuotationId])
}

model SupplierQuotationCharge {
  id                    String   @id @default(cuid())
  supplierQuotationId   String
  supplierQuotation     SupplierQuotation @relation(fields: [supplierQuotationId], references: [id], onDelete: Cascade)
  chargeType            String
  label                 String
  amount                Decimal  @db.Decimal(12, 2)
  taxApplicable         Boolean  @default(false)
  remarks               String?

  @@index([supplierQuotationId])
}

model SupplierQuotationDocument {
  id                    String   @id @default(cuid())
  supplierQuotationId   String
  supplierQuotation     SupplierQuotation @relation(fields: [supplierQuotationId], references: [id], onDelete: Cascade)
  fileName              String
  fileType              String
  filePath              String
  fileSize              Int?
  uploadedAt            DateTime @default(now())
  uploadedById          String?
  uploadedBy            User?    @relation("SQDocUploadedBy", fields: [uploadedById], references: [id])

  @@index([supplierQuotationId])
}
```

- [ ] **Step 2: Add reverse relations**

In `CompanyMaster`:
```prisma
  supplierQuotations    SupplierQuotation[] @relation("SQCompany")
```

In `VendorMaster`:
```prisma
  supplierQuotations    SupplierQuotation[] @relation("SQVendor")
```

In `RFQ`:
```prisma
  supplierQuotations    SupplierQuotation[] @relation("SQFromRFQ")
```

In `User`:
```prisma
  supplierQuotationsCreated  SupplierQuotation[] @relation("SQCreatedBy")
  sqDocsUploaded             SupplierQuotationDocument[] @relation("SQDocUploadedBy")
```

- [ ] **Step 3: Validate and push**

```bash
npx prisma validate
npx prisma db push
```

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add SupplierQuotation models with items, charges, and documents"
```

---

## Task 2: Constants + Document Numbering + RBAC + Sidebar

**Files:**
- Create: `src/lib/constants/supplier-quotations.ts`
- Modify: `src/lib/document-numbering.ts`
- Modify: `src/lib/rbac.ts`
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Create constants file**

Create `src/lib/constants/supplier-quotations.ts`:

```typescript
export const CHARGE_TYPES = [
  { value: "FREIGHT", label: "Freight" },
  { value: "TESTING", label: "Testing Charges" },
  { value: "TPI", label: "TPI Charges" },
  { value: "PACKING", label: "Packing & Forwarding" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "TOOLING", label: "Tooling Charges" },
  { value: "DIE", label: "Die Charges" },
  { value: "COATING", label: "Coating Charges" },
  { value: "MINIMUM_ORDER", label: "Minimum Order Surcharge" },
  { value: "CUSTOM", label: "Custom" },
] as const;

export const STANDARD_CHARGES = CHARGE_TYPES.filter((c) => c.value !== "CUSTOM");

export const PRICING_UNITS = [
  { value: "PER_MTR", label: "Per Meter" },
  { value: "PER_PIECE", label: "Per Piece" },
  { value: "PER_MT", label: "Per Metric Ton" },
  { value: "PER_KG", label: "Per Kg" },
  { value: "LUMPSUM", label: "Lumpsum" },
] as const;

export const PRICE_BASIS_OPTIONS = [
  { value: "EX_WORKS", label: "Ex-Works" },
  { value: "FOR", label: "FOR (Free on Rail)" },
  { value: "CIF", label: "CIF" },
  { value: "FOB", label: "FOB" },
  { value: "DELIVERED", label: "Delivered" },
] as const;

export const SQ_STATUSES = [
  { value: "RECEIVED", label: "Received" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "COMPARED", label: "Compared" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
] as const;
```

- [ ] **Step 2: Add SUPPLIER_QUOTATION to document numbering**

In `src/lib/document-numbering.ts`, add to DocumentType:
```typescript
  | "TENDER"
  | "SUPPLIER_QUOTATION";
```

Add to PREFIXES:
```typescript
  SUPPLIER_QUOTATION: "SQ",
```

- [ ] **Step 3: Add supplierQuotation to RBAC**

In `src/lib/rbac.ts`, add to `MODULE_ACCESS`:
```typescript
  supplierQuotation: {
    read: ["PURCHASE", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"],
    write: ["PURCHASE", "ADMIN", "SUPER_ADMIN"],
    delete: ["ADMIN", "SUPER_ADMIN"],
    approve: ["MANAGEMENT", "ADMIN", "SUPER_ADMIN"],
  },
```

Add to `MODULE_TO_ACCESS_KEY`:
```typescript
  supplierQuotation: "purchase",
```

- [ ] **Step 4: Add Supplier Quotations to sidebar**

In `src/components/layout/sidebar.tsx`, find the Purchase section children. Add "Supplier Quotations" after "RFQ Management":

```typescript
{ title: "Supplier Quotations", href: "/purchase/supplier-quotations" },
```

- [ ] **Step 5: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/constants/supplier-quotations.ts src/lib/document-numbering.ts src/lib/rbac.ts src/components/layout/sidebar.tsx
git commit -m "feat: add supplier quotation constants, document numbering, RBAC, and sidebar nav"
```

---

## Task 3: API — Supplier Quotation List + Create

**Files:**
- Create: `src/app/api/purchase/supplier-quotations/route.ts`

- [ ] **Step 1: Create the endpoint**

Create `src/app/api/purchase/supplier-quotations/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("supplierQuotation", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const vendorId = searchParams.get("vendorId") || "";
    const cFilter = companyFilter(companyId);

    const where: any = { ...cFilter };

    if (search) {
      where.OR = [
        { sqNo: { contains: search } },
        { vendorRef: { contains: search } },
        { vendor: { name: { contains: search } } },
      ];
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    const quotations = await prisma.supplierQuotation.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true, city: true } },
        createdBy: { select: { name: true } },
        _count: { select: { items: true, documents: true, charges: true } },
      },
      orderBy: { sqDate: "desc" },
    });

    return NextResponse.json(
      quotations.map((sq) => ({
        ...sq,
        subtotal: sq.subtotal ? Number(sq.subtotal) : null,
        totalCharges: sq.totalCharges ? Number(sq.totalCharges) : null,
        grandTotal: sq.grandTotal ? Number(sq.grandTotal) : null,
      }))
    );
  } catch (error) {
    console.error("Error fetching supplier quotations:", error);
    return NextResponse.json({ error: "Failed to fetch supplier quotations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("supplierQuotation", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const {
      vendorId, vendorRef, quotationDate, validUntil,
      currency, paymentTerms, deliveryDays, priceBasis,
      rfqId, rfqVendorId, prId, remarks, items, charges,
    } = body;

    if (!vendorId) {
      return NextResponse.json({ error: "Vendor is required" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    const sqNo = await generateDocumentNumber("SUPPLIER_QUOTATION", companyId);

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.amount) || 0);
    }, 0);

    const totalCharges = (charges || []).reduce((sum: number, c: any) => {
      return sum + (parseFloat(c.amount) || 0);
    }, 0);

    const grandTotal = subtotal + totalCharges;

    const sq = await prisma.supplierQuotation.create({
      data: {
        companyId,
        sqNo,
        vendorId,
        vendorRef: vendorRef || null,
        quotationDate: quotationDate ? new Date(quotationDate) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        currency: currency || "INR",
        paymentTerms: paymentTerms || null,
        deliveryDays: deliveryDays ? parseInt(deliveryDays) : null,
        priceBasis: priceBasis || null,
        rfqId: rfqId || null,
        rfqVendorId: rfqVendorId || null,
        prId: prId || null,
        subtotal,
        totalCharges,
        grandTotal,
        status: "RECEIVED",
        remarks: remarks || null,
        createdById: session.user.id,
        items: {
          create: items.map((item: any, idx: number) => ({
            sNo: idx + 1,
            product: item.product || null,
            material: item.material || null,
            additionalSpec: item.additionalSpec || null,
            sizeLabel: item.sizeLabel || null,
            quantity: parseFloat(item.quantity) || 0,
            uom: item.uom || null,
            pricingUnit: item.pricingUnit || "PER_MTR",
            unitRate: parseFloat(item.unitRate) || 0,
            amount: parseFloat(item.amount) || 0,
            deliveryDays: item.deliveryDays ? parseInt(item.deliveryDays) : null,
            remarks: item.remarks || null,
          })),
        },
        charges: charges && charges.length > 0 ? {
          create: charges.map((c: any) => ({
            chargeType: c.chargeType,
            label: c.label || c.chargeType,
            amount: parseFloat(c.amount) || 0,
            taxApplicable: c.taxApplicable || false,
            remarks: c.remarks || null,
          })),
        } : undefined,
      },
      include: {
        vendor: { select: { name: true } },
        items: { orderBy: { sNo: "asc" } },
        charges: true,
        createdBy: { select: { name: true } },
      },
    });

    createAuditLog({
      companyId,
      userId: session.user.id,
      action: "CREATE",
      tableName: "SupplierQuotation",
      recordId: sq.id,
      newValue: JSON.stringify({ sqNo, vendorId, itemCount: items.length }),
    }).catch(console.error);

    return NextResponse.json(
      {
        ...sq,
        subtotal: sq.subtotal ? Number(sq.subtotal) : null,
        totalCharges: sq.totalCharges ? Number(sq.totalCharges) : null,
        grandTotal: sq.grandTotal ? Number(sq.grandTotal) : null,
        items: sq.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitRate: Number(item.unitRate),
          amount: Number(item.amount),
        })),
        charges: sq.charges.map((c) => ({
          ...c,
          amount: Number(c.amount),
        })),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating supplier quotation:", error);
    return NextResponse.json({ error: "Failed to create supplier quotation" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx prisma generate && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/purchase/supplier-quotations/route.ts
git commit -m "feat: add supplier quotation list and create API endpoints"
```

---

## Task 4: API — SQ Detail + Update

**Files:**
- Create: `src/app/api/purchase/supplier-quotations/[id]/route.ts`

- [ ] **Step 1: Create the endpoint**

Create `src/app/api/purchase/supplier-quotations/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("supplierQuotation", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const sq = await prisma.supplierQuotation.findUnique({
      where: { id },
      include: {
        vendor: { select: { id: true, name: true, city: true, contactPerson: true, email: true, phone: true } },
        rfq: { select: { id: true, rfqNo: true } },
        createdBy: { select: { name: true } },
        items: { orderBy: { sNo: "asc" } },
        charges: true,
        documents: {
          orderBy: { uploadedAt: "desc" },
          include: { uploadedBy: { select: { name: true } } },
        },
      },
    });

    if (!sq) {
      return NextResponse.json({ error: "Supplier Quotation not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...sq,
      subtotal: sq.subtotal ? Number(sq.subtotal) : null,
      totalCharges: sq.totalCharges ? Number(sq.totalCharges) : null,
      grandTotal: sq.grandTotal ? Number(sq.grandTotal) : null,
      items: sq.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitRate: Number(item.unitRate),
        amount: Number(item.amount),
      })),
      charges: sq.charges.map((c) => ({
        ...c,
        amount: Number(c.amount),
      })),
    });
  } catch (error) {
    console.error("Error fetching supplier quotation:", error);
    return NextResponse.json({ error: "Failed to fetch supplier quotation" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("supplierQuotation", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.supplierQuotation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Supplier Quotation not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (body.vendorRef !== undefined) updateData.vendorRef = body.vendorRef || null;
    if (body.quotationDate !== undefined) updateData.quotationDate = body.quotationDate ? new Date(body.quotationDate) : null;
    if (body.validUntil !== undefined) updateData.validUntil = body.validUntil ? new Date(body.validUntil) : null;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.paymentTerms !== undefined) updateData.paymentTerms = body.paymentTerms || null;
    if (body.deliveryDays !== undefined) updateData.deliveryDays = body.deliveryDays ? parseInt(body.deliveryDays) : null;
    if (body.priceBasis !== undefined) updateData.priceBasis = body.priceBasis || null;
    if (body.remarks !== undefined) updateData.remarks = body.remarks || null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.rfqId !== undefined) updateData.rfqId = body.rfqId || null;

    const updated = await prisma.supplierQuotation.update({
      where: { id },
      data: updateData,
    });

    if (body.status && body.status !== existing.status) {
      createAuditLog({
        companyId,
        userId: session.user.id,
        action: "STATUS_CHANGE",
        tableName: "SupplierQuotation",
        recordId: id,
        fieldName: "status",
        oldValue: existing.status,
        newValue: body.status,
      }).catch(console.error);
    }

    return NextResponse.json({
      ...updated,
      subtotal: updated.subtotal ? Number(updated.subtotal) : null,
      totalCharges: updated.totalCharges ? Number(updated.totalCharges) : null,
      grandTotal: updated.grandTotal ? Number(updated.grandTotal) : null,
    });
  } catch (error) {
    console.error("Error updating supplier quotation:", error);
    return NextResponse.json({ error: "Failed to update supplier quotation" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/purchase/supplier-quotations/\[id\]/route.ts
git commit -m "feat: add supplier quotation detail GET and PATCH API endpoints"
```

---

## Task 5: API — Document Upload + List + Delete

**Files:**
- Create: `src/app/api/purchase/supplier-quotations/[id]/documents/route.ts`
- Create: `src/app/api/purchase/supplier-quotations/[id]/documents/[docId]/route.ts`

- [ ] **Step 1: Create documents list + upload endpoint**

Create `src/app/api/purchase/supplier-quotations/[id]/documents/route.ts`. Follow the same pattern as the tender documents API (`src/app/api/tenders/[id]/documents/route.ts`), but:
- Use `checkAccess("supplierQuotation", ...)` instead of `"tender"`
- Save files to `public/uploads/supplier-quotations/{id}/`
- Use `supplierQuotationDocument` Prisma model
- Link to `supplierQuotationId` instead of `tenderId`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("supplierQuotation", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const documents = await prisma.supplierQuotationDocument.findMany({
      where: { supplierQuotationId: id },
      include: { uploadedBy: { select: { name: true } } },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response } = await checkAccess("supplierQuotation", "write");
    if (!authorized) return response!;

    const { id } = await params;

    const sq = await prisma.supplierQuotation.findUnique({ where: { id } });
    if (!sq) {
      return NextResponse.json({ error: "Supplier Quotation not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    let fileType = "OTHER";
    if (["pdf"].includes(ext)) fileType = "PDF";
    else if (["xlsx", "xls", "csv"].includes(ext)) fileType = "EXCEL";
    else if (["doc", "docx"].includes(ext)) fileType = "WORD";
    else if (["jpg", "jpeg", "png", "webp"].includes(ext)) fileType = "IMAGE";

    const uploadDir = path.join(process.cwd(), "public", "uploads", "supplier-quotations", id);
    await mkdir(uploadDir, { recursive: true });

    const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = path.join(uploadDir, uniqueName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const relativePath = `/uploads/supplier-quotations/${id}/${uniqueName}`;

    const doc = await prisma.supplierQuotationDocument.create({
      data: {
        supplierQuotationId: id,
        fileName: file.name,
        fileType,
        filePath: relativePath,
        fileSize: file.size,
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create document delete endpoint**

Create `src/app/api/purchase/supplier-quotations/[id]/documents/[docId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("supplierQuotation", "delete");
    if (!authorized) return response!;

    const { id, docId } = await params;

    const doc = await prisma.supplierQuotationDocument.findFirst({
      where: { id: docId, supplierQuotationId: id },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    try {
      const fullPath = path.join(process.cwd(), "public", doc.filePath);
      await unlink(fullPath);
    } catch (err) {
      console.error("Failed to delete file from disk:", err);
    }

    await prisma.supplierQuotationDocument.delete({ where: { id: docId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/purchase/supplier-quotations/\[id\]/documents/
git commit -m "feat: add supplier quotation document upload, list, and delete API endpoints"
```

---

## Task 6: SQ Register Page

**Files:**
- Create: `src/app/(dashboard)/purchase/supplier-quotations/page.tsx`

- [ ] **Step 1: Create the register page**

**Imports:**
```typescript
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye } from "lucide-react";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/page-loading";
import { SQ_STATUSES } from "@/lib/constants/supplier-quotations";
```

**Layout:**
1. PageHeader "Supplier Quotations" with "Create" button → `/purchase/supplier-quotations/create`
2. Summary row: Total, Received this month, Under Review
3. Search + status filter + vendor filter (optional)
4. Table: SQ No, Vendor, Vendor Ref, Date, Items count, Grand Total, Status (badge), Actions (Eye)
5. Clickable rows → `/purchase/supplier-quotations/{id}`

**Status badge colors:**
- RECEIVED: default
- UNDER_REVIEW: outline
- COMPARED: outline
- ACCEPTED: default (green)
- REJECTED: destructive
- EXPIRED: secondary

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/purchase/supplier-quotations/page.tsx
git commit -m "feat: add supplier quotation register page with status filters"
```

---

## Task 7: Create SQ Page (Side-by-Side)

**Files:**
- Create: `src/app/(dashboard)/purchase/supplier-quotations/create/page.tsx`

- [ ] **Step 1: Create the side-by-side form page**

This is the key page with a split layout.

**Imports:**
```typescript
"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Plus, Trash2, Upload, FileText, Image, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { CHARGE_TYPES, STANDARD_CHARGES, PRICING_UNITS, PRICE_BASIS_OPTIONS } from "@/lib/constants/supplier-quotations";
```

**Layout (responsive):**
- On desktop (lg+): `flex` with left panel 40% (document viewer) and right panel 60% (form)
- On mobile: stacked (document area on top, form below)

**Left Panel — Document Viewer:**
- Upload area (drag & drop style or click to upload via hidden input)
- After upload, shows: iframe for PDF, img tag for images, file info card for Excel/other
- Tabs if multiple documents uploaded
- Disabled "Parse Document" button with tooltip "Coming soon — AI extraction"
- Uploads go to `/api/purchase/supplier-quotations/{id}/documents` AFTER the SQ is created. For the create flow, hold files in local state and upload after SQ creation.

Actually — simpler approach: show the upload area but only enable it AFTER saving. Show a message "Save the quotation first, then upload documents" if trying to upload before save. Or even simpler: make the create flow a two-step:
1. Fill form → Save → redirects to detail page
2. On detail page, upload documents

For the create page, just show a placeholder in the left panel saying "Documents can be uploaded after saving the quotation."

**Right Panel — Form:**
- Section 1: Vendor & Reference — vendor select (fetch from /api/masters/vendors), vendor ref, quotation date, valid until
- Section 2: Items table — editable rows with: S.No (auto), Product, Material, Size, Qty, UOM, Pricing Unit (select from PRICING_UNITS), Unit Rate, Amount (auto-calc), Delete
  - "Add Item" button
- Section 3: Charges — grid of standard charge checkboxes with amount input. Each standard charge is a row with: checkbox, label (from STANDARD_CHARGES), amount input, tax applicable switch. Plus "Add Custom Charge" button that adds a row with editable label + amount + tax switch.
- Section 4: Terms — payment terms, delivery days, price basis (select from PRICE_BASIS_OPTIONS), currency
- Section 5: Totals (auto-calculated, read-only) — subtotal, total charges, grand total
- Section 6: Remarks — textarea, optional RFQ link (select from /api/purchase/rfq?status=SENT,PARTIALLY_RESPONDED,ALL_RESPONDED)

**Submit:** POST to `/api/purchase/supplier-quotations`, redirect to detail page.

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/purchase/supplier-quotations/create/page.tsx
git commit -m "feat: add create supplier quotation page with side-by-side layout and flexible charges"
```

---

## Task 8: SQ Detail Page

**Files:**
- Create: `src/app/(dashboard)/purchase/supplier-quotations/[id]/page.tsx`

- [ ] **Step 1: Create the detail page**

**Props:** `params: Promise<{ id: string }>`

**Imports:**
```typescript
"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Upload, Download, Trash2, FileText, Image, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";
import { SQ_STATUSES, PRICING_UNITS } from "@/lib/constants/supplier-quotations";
```

**Layout (side-by-side on desktop):**

**Left panel (40%):** Document viewer
- Upload area at top (FormData POST to `/api/purchase/supplier-quotations/{id}/documents`)
- Tabs for multiple documents
- PDF shown in iframe, images inline, Excel/other as file info cards
- Each document has download link (href to filePath) and delete button

**Right panel (60%):** Quote details
- **Header:** SQ No, vendor name, status badge, status change select + button
- **Details card:** Vendor ref, quotation date, valid until, currency, payment terms, delivery days, price basis, RFQ link (if any)
- **Items table:** S.No, Product, Material, Size, Qty, UOM, Pricing Unit (badge), Rate, Amount
- **Charges table:** Type (badge), Label, Amount, Tax Applicable (yes/no badge)
- **Totals:** Subtotal, Total Charges, Grand Total
- **Remarks**

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/purchase/supplier-quotations/\[id\]/page.tsx
git commit -m "feat: add supplier quotation detail page with document viewer and charges breakdown"
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

Expected: Build succeeds with `/purchase/supplier-quotations`, `/purchase/supplier-quotations/create`, `/purchase/supplier-quotations/[id]` in output.

- [ ] **Step 3: Commit if fixes needed**

```bash
git add -A && git commit -m "fix: address issues found during verification"
```
