# Incoming Tender Management — Design Spec

**Date:** 2026-04-11
**Status:** Draft

---

## Overview

Track tenders the company bids on — from identification through bid submission to outcome. Stores tender documents (NIT, BOQ, drawings, corrigenda), EMD details, items, and bid preparation status.

---

## 1. Schema

### Tender Model

```prisma
model Tender {
  id                String    @id @default(cuid())
  companyId         String?
  company           CompanyMaster? @relation(fields: [companyId], references: [id])
  tenderNo          String    @unique
  tenderDate        DateTime  @default(now())
  closingDate       DateTime?
  openingDate       DateTime?
  tenderSource      String?   // "GeM", "BHEL", "NTPC", "IOCL", "Private", etc.
  tenderRef         String?   // Client's/organization's tender reference number
  organization      String?   // Who issued the tender
  projectName       String?
  location          String?
  estimatedValue    Decimal?  @db.Decimal(14, 2)
  currency          String    @default("INR")

  // EMD
  emdRequired       Boolean   @default(false)
  emdAmount         Decimal?  @db.Decimal(14, 2)
  emdType           String?   // "BG", "DD", "ONLINE", "FDR"
  emdSubmitted      Boolean   @default(false)
  emdReturnDate     DateTime?

  // Status
  status            String    @default("IDENTIFIED")
  // IDENTIFIED → DOCUMENT_PURCHASED → BID_PREPARATION → SUBMITTED → OPENED → WON / LOST / NO_BID

  remarks           String?   @db.Text
  customerId        String?   // If the tendering org is an existing customer
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
```

### TenderItem Model

```prisma
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
```

### TenderDocument Model

```prisma
model TenderDocument {
  id          String   @id @default(cuid())
  tenderId    String
  tender      Tender   @relation(fields: [tenderId], references: [id], onDelete: Cascade)
  fileName    String
  fileType    String   // "PDF", "EXCEL", "WORD", "IMAGE", "OTHER"
  filePath    String
  fileSize    Int?     // bytes
  category    String   // "TENDER_DOCUMENT", "BOQ", "DRAWING", "NIT", "CORRIGENDUM", "BID_SUBMISSION", "OTHER"
  uploadedAt  DateTime @default(now())
  uploadedById String?
  uploadedBy  User?    @relation("TenderDocUploadedBy", fields: [uploadedById], references: [id])

  @@index([tenderId])
}
```

Reverse relations on User, CustomerMaster, CompanyMaster.

---

## 2. API Endpoints

### GET /api/tenders
List tenders with search (tenderNo, organization, projectName), filter by status, sort by closingDate.

### POST /api/tenders
Create tender with items. Generate `tenderNo` via `generateDocumentNumber("TENDER")`. Need to add "TENDER" to DocumentType.

### GET /api/tenders/[id]
Fetch tender with items, documents, customer, createdBy.

### PATCH /api/tenders/[id]
Update tender fields, status transitions, EMD details.

### POST /api/tenders/[id]/documents
Upload document file. Store file locally or return path for external storage. Accept multipart/form-data with file + category.

### GET /api/tenders/[id]/documents
List documents for a tender.

### DELETE /api/tenders/[id]/documents/[docId]
Remove a document.

---

## 3. Pages

### /tenders — Tender Register
- Summary cards: Total, Upcoming Deadlines (closing within 7 days), Submitted, Won/Lost
- Table: Tender No, Organization, Project, Closing Date, EMD, Estimated Value, Status, Actions
- Filters: status, source, date range
- "Create Tender" button

### /tenders/create — Create Tender
- Form sections: Basic Info (source, organization, ref, dates), Project Details (name, location, value), EMD Details, Items table, Document uploads
- Multi-file upload area with category selection per file

### /tenders/[id] — Tender Detail
- Header with status badge, key dates, EMD status
- Timeline showing status progression
- Items table
- Documents list with download/preview
- Action buttons: status transitions, edit

---

## 4. Sidebar

New "Tenders" section:
```
Tenders
├── Tender Register    → /tenders
└── Create Tender      → /tenders/create
```

Roles: SALES, MANAGEMENT, ADMIN, SUPER_ADMIN

---

## 5. Error Handling

- Closing date must be in the future when creating
- EMD amount required when emdRequired is true
- File upload max size: 10MB per file
- Status transitions validated (can't go backward except NO_BID from any pre-SUBMITTED state)
