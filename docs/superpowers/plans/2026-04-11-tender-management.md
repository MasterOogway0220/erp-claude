# Tender Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Tender Management module to track incoming tenders from identification through bid submission to outcome, with document uploads, EMD tracking, and item management.

**Architecture:** New `Tender`, `TenderItem`, `TenderDocument` Prisma models. Standard CRUD API endpoints. Three pages (register, create, detail). New sidebar section. Document upload via multipart form or base64. Follows existing module patterns (similar to Quotation module structure).

**Tech Stack:** Next.js 16, Prisma, PostgreSQL, shadcn/ui, Tailwind CSS, date-fns

**Spec:** `docs/superpowers/specs/2026-04-11-tender-management-design.md`

---

## File Map

### New Files
| File | Purpose |
|------|---------|
| `src/app/api/tenders/route.ts` | GET list + POST create |
| `src/app/api/tenders/[id]/route.ts` | GET detail + PATCH update |
| `src/app/api/tenders/[id]/documents/route.ts` | POST upload + GET list |
| `src/app/api/tenders/[id]/documents/[docId]/route.ts` | DELETE document |
| `src/app/(dashboard)/tenders/page.tsx` | Tender register with summary cards |
| `src/app/(dashboard)/tenders/create/page.tsx` | Create tender form |
| `src/app/(dashboard)/tenders/[id]/page.tsx` | Tender detail view |

### Modified Files
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Tender, TenderItem, TenderDocument models + reverse relations |
| `src/lib/document-numbering.ts` | Add "TENDER" to DocumentType and PREFIXES |
| `src/components/layout/sidebar.tsx` | Add Tenders section |
| `src/lib/rbac.ts` | Add "tender" module to MODULE_ACCESS matrix |

---

## Task 1: Schema — Tender, TenderItem, TenderDocument Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add Tender model**

Add at the end of the schema:

```prisma
model Tender {
  id                String    @id @default(cuid())
  companyId         String?
  company           CompanyMaster? @relation(fields: [companyId], references: [id])
  tenderNo          String    @unique
  tenderDate        DateTime  @default(now())
  closingDate       DateTime?
  openingDate       DateTime?
  tenderSource      String?
  tenderRef         String?
  organization      String?
  projectName       String?
  location          String?
  estimatedValue    Decimal?  @db.Decimal(14, 2)
  currency          String    @default("INR")
  emdRequired       Boolean   @default(false)
  emdAmount         Decimal?  @db.Decimal(14, 2)
  emdType           String?
  emdSubmitted      Boolean   @default(false)
  emdReturnDate     DateTime?
  status            String    @default("IDENTIFIED")
  remarks           String?   @db.Text
  customerId        String?
  customer          CustomerMaster? @relation("TenderCustomer", fields: [customerId], references: [id])
  createdById       String?
  createdBy         User?     @relation("TenderCreatedBy", fields: [createdById], references: [id])
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  items             TenderItem[]
  documents         TenderDocument[]

  @@index([companyId])
  @@index([tenderNo])
  @@index([status])
  @@index([closingDate])
}

model TenderItem {
  id            String   @id @default(cuid())
  tenderId      String
  tender        Tender   @relation(fields: [tenderId], references: [id], onDelete: Cascade)
  sNo           Int
  product       String?
  material      String?
  additionalSpec String?
  sizeLabel     String?
  quantity      Decimal  @db.Decimal(10, 3)
  uom           String?
  estimatedRate Decimal? @db.Decimal(12, 2)
  amount        Decimal? @db.Decimal(14, 2)
  remarks       String?

  @@index([tenderId])
}

model TenderDocument {
  id           String   @id @default(cuid())
  tenderId     String
  tender       Tender   @relation(fields: [tenderId], references: [id], onDelete: Cascade)
  fileName     String
  fileType     String
  filePath     String
  fileSize     Int?
  category     String
  uploadedAt   DateTime @default(now())
  uploadedById String?
  uploadedBy   User?    @relation("TenderDocUploadedBy", fields: [uploadedById], references: [id])

  @@index([tenderId])
}
```

- [ ] **Step 2: Add reverse relations**

In `CompanyMaster`, add:
```prisma
  tenders              Tender[]
```

In `CustomerMaster`, add:
```prisma
  tenders              Tender[]  @relation("TenderCustomer")
```

In `User`, add:
```prisma
  tendersCreated       Tender[]  @relation("TenderCreatedBy")
  tenderDocsUploaded   TenderDocument[] @relation("TenderDocUploadedBy")
```

- [ ] **Step 3: Validate and push**

```bash
npx prisma validate
npx prisma db push
```

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add Tender, TenderItem, TenderDocument models"
```

---

## Task 2: Document Numbering + RBAC

**Files:**
- Modify: `src/lib/document-numbering.ts`
- Modify: `src/lib/rbac.ts`

- [ ] **Step 1: Add TENDER to DocumentType**

In `src/lib/document-numbering.ts`, add `"TENDER"` to the `DocumentType` union type:

```typescript
  | "MTC_CERTIFICATE"
  | "TENDER";
```

Add to `PREFIXES`:

```typescript
  TENDER: "TND",
```

- [ ] **Step 2: Add tender module to RBAC**

In `src/lib/rbac.ts`, find the `MODULE_ACCESS` record. Add the `tender` module:

```typescript
  tender: {
    read: ["SALES", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"],
    write: ["SALES", "ADMIN", "SUPER_ADMIN"],
    delete: ["ADMIN", "SUPER_ADMIN"],
    approve: ["MANAGEMENT", "ADMIN", "SUPER_ADMIN"],
  },
```

Also add the mapping in `MODULE_TO_ACCESS_KEY`:

```typescript
  tender: "sales",
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/document-numbering.ts src/lib/rbac.ts
git commit -m "feat: add TENDER document type and tender RBAC module"
```

---

## Task 3: API — Tender List + Create

**Files:**
- Create: `src/app/api/tenders/route.ts`

- [ ] **Step 1: Create the endpoint**

Create `src/app/api/tenders/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("tender", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const source = searchParams.get("source") || "";
    const cFilter = companyFilter(companyId);

    const where: any = { ...cFilter };

    if (search) {
      where.OR = [
        { tenderNo: { contains: search } },
        { organization: { contains: search } },
        { projectName: { contains: search } },
        { tenderRef: { contains: search } },
      ];
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (source) {
      where.tenderSource = source;
    }

    const tenders = await prisma.tender.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        createdBy: { select: { name: true } },
        _count: { select: { items: true, documents: true } },
      },
      orderBy: { closingDate: "asc" },
    });

    return NextResponse.json(
      tenders.map((t) => ({
        ...t,
        estimatedValue: t.estimatedValue ? Number(t.estimatedValue) : null,
        emdAmount: t.emdAmount ? Number(t.emdAmount) : null,
      }))
    );
  } catch (error) {
    console.error("Error fetching tenders:", error);
    return NextResponse.json({ error: "Failed to fetch tenders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("tender", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const {
      tenderSource, tenderRef, organization, projectName, location,
      closingDate, openingDate, estimatedValue, currency,
      emdRequired, emdAmount, emdType,
      customerId, remarks, items,
    } = body;

    const tenderNo = await generateDocumentNumber("TENDER", companyId);

    const tender = await prisma.tender.create({
      data: {
        companyId,
        tenderNo,
        tenderSource: tenderSource || null,
        tenderRef: tenderRef || null,
        organization: organization || null,
        projectName: projectName || null,
        location: location || null,
        closingDate: closingDate ? new Date(closingDate) : null,
        openingDate: openingDate ? new Date(openingDate) : null,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
        currency: currency || "INR",
        emdRequired: emdRequired || false,
        emdAmount: emdRequired && emdAmount ? parseFloat(emdAmount) : null,
        emdType: emdRequired ? emdType || null : null,
        customerId: customerId || null,
        remarks: remarks || null,
        status: "IDENTIFIED",
        createdById: session.user.id,
        items: items && items.length > 0 ? {
          create: items.map((item: any, idx: number) => ({
            sNo: idx + 1,
            product: item.product || null,
            material: item.material || null,
            additionalSpec: item.additionalSpec || null,
            sizeLabel: item.sizeLabel || null,
            quantity: parseFloat(item.quantity) || 0,
            uom: item.uom || null,
            estimatedRate: item.estimatedRate ? parseFloat(item.estimatedRate) : null,
            amount: item.estimatedRate && item.quantity
              ? parseFloat(item.quantity) * parseFloat(item.estimatedRate)
              : null,
            remarks: item.remarks || null,
          })),
        } : undefined,
      },
      include: {
        items: { orderBy: { sNo: "asc" } },
        customer: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    });

    createAuditLog({
      companyId,
      userId: session.user.id,
      action: "CREATE",
      tableName: "Tender",
      recordId: tender.id,
      newValue: JSON.stringify({ tenderNo, organization, projectName }),
    }).catch(console.error);

    return NextResponse.json(
      {
        ...tender,
        estimatedValue: tender.estimatedValue ? Number(tender.estimatedValue) : null,
        emdAmount: tender.emdAmount ? Number(tender.emdAmount) : null,
        items: tender.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          estimatedRate: item.estimatedRate ? Number(item.estimatedRate) : null,
          amount: item.amount ? Number(item.amount) : null,
        })),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating tender:", error);
    return NextResponse.json({ error: "Failed to create tender" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tenders/route.ts
git commit -m "feat: add tender list and create API endpoints"
```

---

## Task 4: API — Tender Detail + Update

**Files:**
- Create: `src/app/api/tenders/[id]/route.ts`

- [ ] **Step 1: Create the endpoint**

Create `src/app/api/tenders/[id]/route.ts`:

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
    const { authorized, response } = await checkAccess("tender", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const tender = await prisma.tender.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, city: true } },
        createdBy: { select: { name: true } },
        items: { orderBy: { sNo: "asc" } },
        documents: {
          orderBy: { uploadedAt: "desc" },
          include: { uploadedBy: { select: { name: true } } },
        },
      },
    });

    if (!tender) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...tender,
      estimatedValue: tender.estimatedValue ? Number(tender.estimatedValue) : null,
      emdAmount: tender.emdAmount ? Number(tender.emdAmount) : null,
      items: tender.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        estimatedRate: item.estimatedRate ? Number(item.estimatedRate) : null,
        amount: item.amount ? Number(item.amount) : null,
      })),
    });
  } catch (error) {
    console.error("Error fetching tender:", error);
    return NextResponse.json({ error: "Failed to fetch tender" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("tender", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.tender.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }

    // Valid status transitions
    const validTransitions: Record<string, string[]> = {
      IDENTIFIED: ["DOCUMENT_PURCHASED", "NO_BID"],
      DOCUMENT_PURCHASED: ["BID_PREPARATION", "NO_BID"],
      BID_PREPARATION: ["SUBMITTED", "NO_BID"],
      SUBMITTED: ["OPENED"],
      OPENED: ["WON", "LOST"],
    };

    if (body.status && body.status !== existing.status) {
      const allowed = validTransitions[existing.status] || [];
      if (!allowed.includes(body.status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${existing.status} to ${body.status}` },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (body.tenderSource !== undefined) updateData.tenderSource = body.tenderSource || null;
    if (body.tenderRef !== undefined) updateData.tenderRef = body.tenderRef || null;
    if (body.organization !== undefined) updateData.organization = body.organization || null;
    if (body.projectName !== undefined) updateData.projectName = body.projectName || null;
    if (body.location !== undefined) updateData.location = body.location || null;
    if (body.closingDate !== undefined) updateData.closingDate = body.closingDate ? new Date(body.closingDate) : null;
    if (body.openingDate !== undefined) updateData.openingDate = body.openingDate ? new Date(body.openingDate) : null;
    if (body.estimatedValue !== undefined) updateData.estimatedValue = body.estimatedValue ? parseFloat(body.estimatedValue) : null;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.emdRequired !== undefined) updateData.emdRequired = body.emdRequired;
    if (body.emdAmount !== undefined) updateData.emdAmount = body.emdAmount ? parseFloat(body.emdAmount) : null;
    if (body.emdType !== undefined) updateData.emdType = body.emdType || null;
    if (body.emdSubmitted !== undefined) updateData.emdSubmitted = body.emdSubmitted;
    if (body.emdReturnDate !== undefined) updateData.emdReturnDate = body.emdReturnDate ? new Date(body.emdReturnDate) : null;
    if (body.customerId !== undefined) updateData.customerId = body.customerId || null;
    if (body.remarks !== undefined) updateData.remarks = body.remarks || null;
    if (body.status) updateData.status = body.status;

    const updated = await prisma.tender.update({
      where: { id },
      data: updateData,
    });

    if (body.status && body.status !== existing.status) {
      createAuditLog({
        companyId,
        userId: session.user.id,
        action: "STATUS_CHANGE",
        tableName: "Tender",
        recordId: id,
        fieldName: "status",
        oldValue: existing.status,
        newValue: body.status,
      }).catch(console.error);
    }

    return NextResponse.json({
      ...updated,
      estimatedValue: updated.estimatedValue ? Number(updated.estimatedValue) : null,
      emdAmount: updated.emdAmount ? Number(updated.emdAmount) : null,
    });
  } catch (error) {
    console.error("Error updating tender:", error);
    return NextResponse.json({ error: "Failed to update tender" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tenders/\[id\]/route.ts
git commit -m "feat: add tender detail GET and PATCH API endpoints"
```

---

## Task 5: API — Document Upload + List + Delete

**Files:**
- Create: `src/app/api/tenders/[id]/documents/route.ts`
- Create: `src/app/api/tenders/[id]/documents/[docId]/route.ts`

- [ ] **Step 1: Create documents list + upload endpoint**

Create `src/app/api/tenders/[id]/documents/route.ts`:

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
    const { authorized, response } = await checkAccess("tender", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const documents = await prisma.tenderDocument.findMany({
      where: { tenderId: id },
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
    const { authorized, session, response } = await checkAccess("tender", "write");
    if (!authorized) return response!;

    const { id } = await params;

    const tender = await prisma.tender.findUnique({ where: { id } });
    if (!tender) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "OTHER";

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 });
    }

    // Determine file type
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    let fileType = "OTHER";
    if (["pdf"].includes(ext)) fileType = "PDF";
    else if (["xlsx", "xls", "csv"].includes(ext)) fileType = "EXCEL";
    else if (["doc", "docx"].includes(ext)) fileType = "WORD";
    else if (["jpg", "jpeg", "png", "webp"].includes(ext)) fileType = "IMAGE";

    // Save file
    const uploadDir = path.join(process.cwd(), "public", "uploads", "tenders", id);
    await mkdir(uploadDir, { recursive: true });

    const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = path.join(uploadDir, uniqueName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const relativePath = `/uploads/tenders/${id}/${uniqueName}`;

    const doc = await prisma.tenderDocument.create({
      data: {
        tenderId: id,
        fileName: file.name,
        fileType,
        filePath: relativePath,
        fileSize: file.size,
        category,
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

Create `src/app/api/tenders/[id]/documents/[docId]/route.ts`:

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
    const { authorized, response } = await checkAccess("tender", "delete");
    if (!authorized) return response!;

    const { id, docId } = await params;

    const doc = await prisma.tenderDocument.findFirst({
      where: { id: docId, tenderId: id },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Delete file from disk
    try {
      const fullPath = path.join(process.cwd(), "public", doc.filePath);
      await unlink(fullPath);
    } catch (err) {
      console.error("Failed to delete file from disk:", err);
    }

    await prisma.tenderDocument.delete({ where: { id: docId } });

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
git add src/app/api/tenders/\[id\]/documents/
git commit -m "feat: add tender document upload, list, and delete API endpoints"
```

---

## Task 6: Sidebar — Add Tenders Section

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Add Tenders section to sidebar**

Find the nav sections array in `sidebar.tsx`. Add a new section after the Sales section (or wherever appropriate). Use the `FileText` icon from lucide-react (or add it to imports):

```typescript
{
  title: "Tenders",
  icon: <FileText className="h-5 w-5" />,
  iconColorClass: "text-orange-500",
  roles: ["SALES", "MANAGEMENT", "ADMIN", "SUPER_ADMIN"],
  moduleKey: "sales",
  children: [
    { title: "Tender Register", href: "/tenders" },
    { title: "Create Tender", href: "/tenders/create" },
  ],
},
```

Add `FileText` to the lucide-react imports if not already present.

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: add Tenders section to sidebar navigation"
```

---

## Task 7: Tender Register Page

**Files:**
- Create: `src/app/(dashboard)/tenders/page.tsx`

- [ ] **Step 1: Create the register page**

A client-side page that fetches from `/api/tenders` and displays:

**Imports:**
```typescript
"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Clock, AlertTriangle, Trophy, FileText } from "lucide-react";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/page-loading";
```

**Layout:**
- PageHeader with "Create Tender" button
- 4 summary cards: Total Tenders, Upcoming Deadlines (closing within 7 days), Submitted, Won
- Search + status filter
- Table: Tender No, Organization, Project, Source, Closing Date, EMD, Estimated Value, Status, Actions (Eye icon to view)
- Status badges with colors: IDENTIFIED=secondary, DOCUMENT_PURCHASED=outline, BID_PREPARATION=outline, SUBMITTED=default, OPENED=default, WON=default (green), LOST=destructive, NO_BID=secondary

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/tenders/page.tsx
git commit -m "feat: add tender register page with summary cards and status filters"
```

---

## Task 8: Create Tender Page

**Files:**
- Create: `src/app/(dashboard)/tenders/create/page.tsx`

- [ ] **Step 1: Create the form page**

A client-side form page with sections:

**Imports:**
```typescript
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
```

**Form sections:**
1. **Basic Info:** Tender source (select: GeM, BHEL, NTPC, IOCL, Private, Other), organization, tender ref, closing date, opening date
2. **Project:** Project name, location, estimated value, currency, customer (optional select)
3. **EMD:** Toggle switch "EMD Required", if on: EMD amount, EMD type (BG/DD/Online/FDR)
4. **Items:** Editable table — S.No, Product, Material, Size, Qty, UOM, Estimated Rate, Amount (auto-calc). "Add Item" button.
5. **Remarks:** Textarea

**Submit:** POST to `/api/tenders`, redirect to `/tenders/{id}` on success.

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/tenders/create/page.tsx
git commit -m "feat: add create tender page with items and EMD tracking"
```

---

## Task 9: Tender Detail Page

**Files:**
- Create: `src/app/(dashboard)/tenders/[id]/page.tsx`

- [ ] **Step 1: Create the detail page**

A client-side page that fetches from `/api/tenders/{id}` and displays:

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
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Upload, Download, Trash2, FileText, Image, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";
```

**Layout:**
- PageHeader with tender number, status badge
- Action buttons based on status: "Advance Status" button showing next valid status, "Edit" button
- **Details card:** Organization, source, ref, dates, project, location, estimated value
- **EMD card:** Required/not, amount, type, submitted status, return date
- **Items table:** S.No, Product, Material, Size, Qty, UOM, Rate, Amount
- **Documents section:**
  - Upload area with drag & drop + category select (TENDER_DOCUMENT, BOQ, DRAWING, NIT, CORRIGENDUM, BID_SUBMISSION, OTHER)
  - Documents list with: icon (based on fileType), filename, category badge, uploaded by, date, download/delete buttons
- **Status timeline:** Visual progression showing each status step

**Document upload:** Uses a hidden file input + FormData POST to `/api/tenders/{id}/documents`.

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/tenders/\[id\]/page.tsx
git commit -m "feat: add tender detail page with documents, EMD tracking, and status timeline"
```

---

## Task 10: Final Verification

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Build check**

```bash
npx next build 2>&1 | tail -15
```

Expected: Build succeeds with `/tenders`, `/tenders/create`, `/tenders/[id]` in output.

- [ ] **Step 3: Commit if fixes needed**

```bash
git add -A && git commit -m "fix: address issues found during verification"
```
