# Supplier Quotations (Flexible) — Design Spec

**Date:** 2026-04-11
**Status:** Draft

---

## Overview

A standalone module to receive, store, and search vendor quotations with flexible/dynamic fields and document uploads. Supports varying pricing structures (per meter, per piece, per MT), toggleable optional charges, custom charges, and multiple document types (PDF, Excel, images). Can be linked to existing RFQ flow or used standalone for unsolicited quotes. Architecturally ready for future AI/OCR document parsing.

---

## 1. Schema

### SupplierQuotation Model

```prisma
model SupplierQuotation {
  id              String    @id @default(cuid())
  companyId       String?
  company         CompanyMaster? @relation(fields: [companyId], references: [id])
  sqNo            String    @unique
  sqDate          DateTime  @default(now())
  vendorId        String
  vendor          VendorMaster @relation("SQVendor", fields: [vendorId], references: [id])
  vendorRef       String?   // Vendor's own quotation reference number
  quotationDate   DateTime? // Date on vendor's document
  validUntil      DateTime?
  currency        String    @default("INR")
  paymentTerms    String?
  deliveryDays    Int?
  priceBasis      String?   // "EX_WORKS", "FOR", "CIF", "FOB", "DELIVERED"

  // Optional RFQ linkage
  rfqId           String?
  rfq             RFQ?      @relation("SQFromRFQ", fields: [rfqId], references: [id])
  rfqVendorId     String?
  prId            String?

  // Totals (calculated)
  subtotal        Decimal?  @db.Decimal(14, 2)
  totalCharges    Decimal?  @db.Decimal(14, 2)
  grandTotal      Decimal?  @db.Decimal(14, 2)

  // Status
  status          String    @default("RECEIVED")
  // RECEIVED → UNDER_REVIEW → COMPARED → ACCEPTED / REJECTED / EXPIRED

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
```

### SupplierQuotationItem Model

```prisma
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
  pricingUnit           String   @default("PER_MTR")  // PER_MTR, PER_PIECE, PER_MT, PER_KG, LUMPSUM
  unitRate              Decimal  @db.Decimal(12, 2)
  amount                Decimal  @db.Decimal(14, 2)
  deliveryDays          Int?
  remarks               String?

  @@index([supplierQuotationId])
}
```

### SupplierQuotationCharge Model

Flexible charges — standard toggleable + custom free-form.

```prisma
model SupplierQuotationCharge {
  id                    String   @id @default(cuid())
  supplierQuotationId   String
  supplierQuotation     SupplierQuotation @relation(fields: [supplierQuotationId], references: [id], onDelete: Cascade)
  chargeType            String   // FREIGHT, TESTING, TPI, PACKING, INSURANCE, TOOLING, DIE, COATING, MINIMUM_ORDER, CUSTOM
  label                 String   // Display label — auto-filled for standard types, user-entered for CUSTOM
  amount                Decimal  @db.Decimal(12, 2)
  taxApplicable         Boolean  @default(false)
  remarks               String?

  @@index([supplierQuotationId])
}
```

### SupplierQuotationDocument Model

```prisma
model SupplierQuotationDocument {
  id                    String   @id @default(cuid())
  supplierQuotationId   String
  supplierQuotation     SupplierQuotation @relation(fields: [supplierQuotationId], references: [id], onDelete: Cascade)
  fileName              String
  fileType              String   // PDF, EXCEL, WORD, IMAGE, OTHER
  filePath              String
  fileSize              Int?     // bytes
  uploadedAt            DateTime @default(now())
  uploadedById          String?
  uploadedBy            User?    @relation("SQDocUploadedBy", fields: [uploadedById], references: [id])

  @@index([supplierQuotationId])
}
```

### Reverse Relations
- `VendorMaster`: `supplierQuotations SupplierQuotation[] @relation("SQVendor")`
- `RFQ`: `supplierQuotations SupplierQuotation[] @relation("SQFromRFQ")`
- `User`: `supplierQuotationsCreated SupplierQuotation[] @relation("SQCreatedBy")`
- `User`: `sqDocsUploaded SupplierQuotationDocument[] @relation("SQDocUploadedBy")`
- `CompanyMaster`: `supplierQuotations SupplierQuotation[]`

### Constants: Charge Types

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

export const PRICING_UNITS = [
  { value: "PER_MTR", label: "Per Meter" },
  { value: "PER_PIECE", label: "Per Piece" },
  { value: "PER_MT", label: "Per Metric Ton" },
  { value: "PER_KG", label: "Per Kg" },
  { value: "LUMPSUM", label: "Lumpsum" },
] as const;
```

---

## 2. API Endpoints

### GET /api/purchase/supplier-quotations
List all SQs. Search by sqNo, vendor name, vendorRef. Filter by status, vendorId, date range. Paginated.

### POST /api/purchase/supplier-quotations
Create SQ with items, charges, and optional document references. Generate `sqNo` via `generateDocumentNumber("SUPPLIER_QUOTATION")`. Need to add to DocumentType.

Body:
```json
{
  "vendorId": "...",
  "vendorRef": "VQ/2026/001",
  "quotationDate": "2026-04-10",
  "validUntil": "2026-05-10",
  "currency": "INR",
  "paymentTerms": "30 days",
  "deliveryDays": 21,
  "priceBasis": "EX_WORKS",
  "rfqId": null,
  "remarks": "...",
  "items": [
    { "sNo": 1, "product": "...", "material": "...", "sizeLabel": "...", "quantity": 100, "uom": "MTR", "pricingUnit": "PER_MTR", "unitRate": 850, "amount": 85000 }
  ],
  "charges": [
    { "chargeType": "FREIGHT", "label": "Freight", "amount": 5000, "taxApplicable": true },
    { "chargeType": "CUSTOM", "label": "Special Coating Premium", "amount": 2500, "taxApplicable": false }
  ]
}
```

### GET /api/purchase/supplier-quotations/[id]
Fetch SQ with items, charges, documents, vendor details.

### PATCH /api/purchase/supplier-quotations/[id]
Update SQ fields, items, charges, status.

### POST /api/purchase/supplier-quotations/[id]/documents
Upload document file. Accept multipart/form-data.

### GET /api/purchase/supplier-quotations/[id]/documents
List documents.

### DELETE /api/purchase/supplier-quotations/[id]/documents/[docId]
Remove a document.

---

## 3. Pages

### /purchase/supplier-quotations — SQ Register
- Summary row: Total received, Under Review, This month's count
- Table: SQ No, Vendor, Vendor Ref, Date, Items, Grand Total, Status, Actions
- Filters: vendor, status, date range
- Search by SQ no, vendor name, vendor ref
- "Create" button

### /purchase/supplier-quotations/create — Create SQ (Side-by-Side)
**Left panel (40%):** Document viewer
- Drag & drop / click upload area
- Shows uploaded document (PDF via iframe, image inline, file info for Excel/other)
- Tabs for multiple documents
- Future: "Parse Document" button placeholder (disabled, tooltip "Coming soon — AI extraction")

**Right panel (60%):** Data entry form
- Section 1: Vendor & Reference — vendor select, vendor ref, quotation date, valid until, link to RFQ (optional)
- Section 2: Items table — add rows, product/material/size/qty/pricing unit/rate/amount
- Section 3: Charges — toggleable checkboxes for standard charges, each with amount + tax applicable toggle. "Add Custom Charge" button for free-form.
- Section 4: Terms — payment terms, delivery days, price basis, currency
- Section 5: Totals (auto-calculated) — subtotal (items), total charges, grand total
- Section 6: Remarks

**Mobile:** Stacked layout (documents on top, form below)

### /purchase/supplier-quotations/[id] — SQ Detail
- Header: SQ no, vendor name, status badge, dates
- Side-by-side: document viewer (left) + quote details (right)
- Items table (read-only)
- Charges breakdown
- Documents list with download
- Action buttons: Edit, Change Status, Link to RFQ

---

## 4. Integration with RFQ Flow

- When recording a vendor quotation via the existing RFQ detail dialog, add option: "Save as Supplier Quotation" — creates an SQ record linked to the RFQ via `rfqId` and `rfqVendorId`
- The Comparative Statement can reference `SupplierQuotation` records when calculating landed costs
- This integration is optional and can be added later — the SQ module works standalone first

---

## 5. Sidebar

Add under Purchase section:
```
Purchase
├── Dashboard
├── Purchase Requisitions
├── Create PR
├── RFQ Management
├── Supplier Quotations    → /purchase/supplier-quotations  (NEW)
├── Comparative Statements
├── Purchase Orders
└── Vendor Tracking
```

---

## 6. Future AI/OCR Readiness

The architecture supports future extraction:
- Documents are stored with `filePath` — accessible for processing
- The create form can receive pre-filled data via query params or state
- A future API endpoint `POST /api/purchase/supplier-quotations/parse` could accept a document, extract data, and return a pre-filled form payload
- The "Parse Document" button on the create page would call this endpoint and populate the form

No extraction logic is built now — just the hooks are in place.

---

## 7. Error Handling

- Vendor is required
- At least one item required
- Unit rate and quantity must be positive
- Custom charge requires a label
- File upload max: 10MB per file, max 10 files per quotation
- Valid document types: PDF, XLSX, XLS, DOC, DOCX, JPG, JPEG, PNG, WEBP
