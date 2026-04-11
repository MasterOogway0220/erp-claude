# Order Processing (3A) — Design Spec

**Date:** 2026-04-11
**Sub-system:** 3A of 4 (Sales Order Module Overhaul)
**Status:** Draft
**Dependencies:** Requires completed Sub-systems 1 & 2

---

## Overview

After PO Acceptance is ISSUED, the user creates a Sales Order (auto-populated from CPO with review/modify option). Then, via a wizard-style "Process Order" form, they configure each SO item with colour coding, additional specs, outsourced processes (galvanising, coating, TPI, lab testing, NDT, PMI), and TPI inspection parameters. Items are processed independently with flexible save-as-you-go.

---

## 1. Auto-Create Sales Order from CPO

### Trigger
When PO Acceptance status changes to ISSUED on the PO Acceptance detail page (`/po-acceptance/[id]`), a "Create Sales Order" button appears on the linked Client PO detail page.

### Create SO Dialog
Clicking "Create Sales Order" on the CPO detail page opens a modal:
- Pre-fills all CPO items (product, size, qty, rate, amount)
- User can review and modify quantities, rates, or remove items
- "Create as-is" shortcut button for quick creation
- "Create" button after modifications

### API
`POST /api/sales-orders/from-cpo`
- Body: `{ clientPurchaseOrderId, items?: [{ quotationItemId, qtyOrdered?, unitRate? }] }`
- If `items` is omitted, copies all CPO items as-is
- If `items` is provided, uses the overrides
- Creates SalesOrder linked to CPO via `clientPurchaseOrderId`
- Sets `status: "OPEN"`, `processingStatus: "UNPROCESSED"`
- Auto-generates SO number via `generateDocumentNumber("SALES_ORDER")`
- Returns created SO with items

### Schema Changes on SalesOrder
```prisma
  clientPurchaseOrderId String?
  clientPurchaseOrder   ClientPurchaseOrder? @relation("SOFromCPO", fields: [clientPurchaseOrderId], references: [id])
  processingStatus      String               @default("UNPROCESSED")  // UNPROCESSED, PROCESSING, PROCESSED
```

Add reverse relation on ClientPurchaseOrder:
```prisma
  salesOrders           SalesOrder[]          @relation("SOFromCPO")
```

---

## 2. Order Processing Data Model

### New Model: OrderProcessingItem

Stores all processing configuration per Sales Order item. One-to-one with SalesOrderItem.

```prisma
model OrderProcessingItem {
  id                    String    @id @default(cuid())
  salesOrderItemId      String    @unique
  salesOrderItem        SalesOrderItem @relation(fields: [salesOrderItemId], references: [id], onDelete: Cascade)

  // PO references
  poSlNo                String?
  poItemCode            String?

  // Colour coding
  colourCodingRequired  Boolean   @default(false)
  colourCode            String?

  // Additional spec to print/stencil on pipe
  additionalPipeSpec    String?

  // Outsourced processes
  hotDipGalvanising     Boolean   @default(false)
  screwedEnds           Boolean   @default(false)
  coatingRequired       Boolean   @default(false)
  coatingType           String?
  coatingSide           String?   // "INSIDE", "OUTSIDE", "BOTH"

  // Third Party Inspection
  tpiRequired           Boolean   @default(false)
  tpiType               String?   // "TPI_CLIENT_QA", "INHOUSE_QA"

  // Lab testing
  labTestingRequired    Boolean   @default(false)

  // PMI Inspection
  pmiRequired           Boolean   @default(false)
  pmiType               String?   // "INTERNAL", "UNDER_WITNESS", "BOTH"

  // NDT Inspection (multi-select)
  ndtRequired           Boolean   @default(false)
  ndtTests              Json?     // ["DP_TEST", "MP_TEST", "UT_TEST", "RADIOGRAPHY"]

  // TPI Inspection Parameters (only when tpiType = "TPI_CLIENT_QA")
  vdiRequired           Boolean   @default(false)
  vdiWitnessPercent     Int?
  hydroTestRequired     Boolean   @default(false)
  hydroWitnessPercent   Int?

  // Required lab tests (multi-select, JSON array)
  requiredLabTests      Json?     // ["CHEMICAL", "TENSILE", "BEND", "FLATTENING", "FLARING", "IGC_PRACTICE_E", "IGC_PRACTICE_E_MAG", "HARDNESS", "IMPACT", "MACRO_SEAMLESS", "MICRO"]

  // Status
  status                String    @default("PENDING")  // "PENDING", "PROCESSED"
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

### Reverse Relations
- `SalesOrderItem`: `orderProcessing OrderProcessingItem?`
- `User`: `orderProcessingItems OrderProcessingItem[] @relation("OrderProcessedBy")`
- `CompanyMaster`: `orderProcessingItems OrderProcessingItem[]`

### Lab Test Constants
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
```

---

## 3. Order Processing API

### GET /api/sales-orders/[id]/processing
Returns all OrderProcessingItem records for the SO, with item details.

Response:
```json
{
  "salesOrder": { "id", "soNo", "processingStatus" },
  "items": [
    {
      "salesOrderItem": { "id", "sNo", "product", "material", "sizeLabel", "qtyOrdered", "unitRate" },
      "processing": { ...OrderProcessingItem fields } | null
    }
  ]
}
```

### POST /api/sales-orders/[id]/processing
Creates or updates an OrderProcessingItem for a specific SO item.

Body:
```json
{
  "salesOrderItemId": "...",
  "poSlNo": "1",
  "poItemCode": "SS304-2NB-S40",
  "colourCodingRequired": true,
  "colourCode": "Blue band",
  "additionalPipeSpec": "NACE MR0175",
  "hotDipGalvanising": false,
  "screwedEnds": false,
  "coatingRequired": true,
  "coatingType": "Epoxy",
  "coatingSide": "BOTH",
  "tpiRequired": true,
  "tpiType": "TPI_CLIENT_QA",
  "labTestingRequired": false,
  "pmiRequired": true,
  "pmiType": "UNDER_WITNESS",
  "ndtRequired": true,
  "ndtTests": ["DP_TEST", "UT_TEST"],
  "vdiRequired": true,
  "vdiWitnessPercent": 100,
  "hydroTestRequired": true,
  "hydroWitnessPercent": 50,
  "requiredLabTests": ["CHEMICAL", "TENSILE", "HARDNESS"]
}
```

Uses upsert — creates if not exists, updates if exists. Does NOT change status (that's a separate action).

### PATCH /api/sales-orders/[id]/processing/[itemId]
Mark item as processed or reopen.

Body: `{ action: "PROCESS" | "REOPEN" }`

- PROCESS: Sets `status: "PROCESSED"`, `processedAt: now()`, `processedById: session.user.id`
- REOPEN: Sets `status: "PENDING"`, clears `processedAt` and `processedById`
- After each action, check if all items are processed → update SO `processingStatus` accordingly:
  - All items PROCESSED → SO processingStatus = "PROCESSED"
  - Some items PROCESSED → SO processingStatus = "PROCESSING"
  - No items PROCESSED → SO processingStatus = "UNPROCESSED"

---

## 4. Order Processing Wizard Page

### Route
`/sales/[id]/process` — new page at `src/app/(dashboard)/sales/[id]/process/page.tsx`

### Layout (Stepper/Wizard)
- **Top bar:** SO number, customer name, progress "Item X of Y", overall "Z of Y processed"
- **Step indicator:** Numbered circles — green check (processed), blue (current), gray (pending)
- **Current item context (read-only):** Product, material, size, qty, rate — shown as a compact info bar
- **Form sections:**
  1. **PO References:** S.No as per PO, Item Code as per PO (text inputs, side by side)
  2. **Colour Coding:** Checkbox "Colour coding required" + text input for colour (conditional)
  3. **Additional Spec:** Text input "Additional spec to print/stencil on pipe"
  4. **Outsourced Processes:** Checkbox grid (2 columns) with conditional sub-fields:
     - Hot Dip Galvanising (checkbox only)
     - Screwed Ends (checkbox only)
     - Coating → type input + inside/outside/both select
     - Third Party Inspection → TPI/Client QA or Inhouse QA dropdown
     - Lab Testing (checkbox only)
     - PMI Inspection → Internal / Under Witness / Both dropdown
     - NDT Inspection → multi-select checkboxes: DP, MP, UT, Radiography
  5. **TPI Parameters (conditional):** Yellow highlighted section, only visible when TPI type = TPI_CLIENT_QA
     - VDI Inspection: checkbox + witness % input
     - Hydro Test: checkbox + witness % input
     - Lab Tests Required: chip-style multi-select from 11 test types

### Navigation
- "← Previous" / "Next →" buttons
- "Save Draft" — saves current item without marking processed
- "Mark as Processed" — saves + marks item as PROCESSED (green badge, becomes view-only)
- "Reopen" button on processed items to allow re-editing
- Clicking step indicator circles jumps to that item

### Completion
- When last item is marked processed, SO `processingStatus` auto-updates to `PROCESSED`
- Success message with link to SO detail page
- "Proceed to Stock Allotment" button (placeholder for sub-system 3B)

---

## 5. SO Detail Page Changes

### File: `src/app/(dashboard)/sales/[id]/page.tsx`

**Header additions:**
- Processing Status badge (UNPROCESSED=secondary, PROCESSING=outline, PROCESSED=default) next to SO status
- "Process Order" button — visible when SO status is OPEN and processingStatus is not PROCESSED. Navigates to `/sales/[id]/process`

**New section: "Order Processing Summary"**
- Visible when processingStatus is PROCESSING or PROCESSED
- Card showing each item with:
  - Item description (product, size)
  - Status badge (Pending/Processed)
  - Outsourced processes as small badges (e.g. "Coating", "TPI", "NDT")
  - TPI type if applicable
- Clickable — navigates to wizard at that item's step

---

## 6. CPO Detail Page Changes

### File: `src/app/(dashboard)/client-purchase-orders/[id]/page.tsx`

**After PO Acceptance is ISSUED:**
- If no SO is linked to this CPO: Show "Create Sales Order" button
- If SO exists: Show link "Sales Order: SO-2026-00XXX →" navigating to SO detail page

**Create SO Dialog:**
- Triggered by "Create Sales Order" button
- Shows CPO items pre-filled in a review table (editable qty/rate)
- "Create as-is" button (quick path)
- "Create" button (after modifications)
- Calls `POST /api/sales-orders/from-cpo`
- On success, shows SO link and refreshes page

---

## 7. Files Summary

| Action | File |
|--------|------|
| Modify | `prisma/schema.prisma` — SalesOrder fields, OrderProcessingItem model, reverse relations |
| Create | `src/lib/constants/order-processing.ts` — LAB_TESTS, NDT_TESTS constants |
| Create | `src/app/api/sales-orders/from-cpo/route.ts` — POST to create SO from CPO |
| Create | `src/app/api/sales-orders/[id]/processing/route.ts` — GET + POST for processing items |
| Create | `src/app/api/sales-orders/[id]/processing/[itemId]/route.ts` — PATCH to mark processed/reopen |
| Create | `src/app/(dashboard)/sales/[id]/process/page.tsx` — Order processing wizard page |
| Modify | `src/app/(dashboard)/sales/[id]/page.tsx` — Processing status badge, Process Order button, processing summary |
| Modify | `src/app/(dashboard)/client-purchase-orders/[id]/page.tsx` — Create SO button/dialog, SO link |

---

## 8. Error Handling

- **Create SO from CPO:** Validate CPO exists, has ISSUED acceptance, no existing SO linked. If SO already exists, return 400 with "Sales Order already exists for this CPO."
- **Processing save:** Validate salesOrderItemId belongs to the SO. Validate conditional fields (e.g. coatingType required when coatingRequired is true).
- **Mark processed:** Validate all required fields are filled for the item before allowing PROCESSED status.
- **Reopen:** Only allowed when SO processingStatus is not used downstream (no stock allotment started for that item).
