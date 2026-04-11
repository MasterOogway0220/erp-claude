# Stock Allotment / Procurement Routing (3B) — Design Spec

**Date:** 2026-04-11
**Sub-system:** 3B of 4 (Sales Order Module Overhaul)
**Status:** Draft
**Dependencies:** Requires completed Sub-system 3A (Order Processing)

---

## Overview

After order processing, each SO item needs to be routed to either stock (warehouse) or procurement (purchase), or split between both. The system auto-analyzes stock availability, suggests allotment, and lets users confirm or override. On confirmation, it auto-creates Warehouse Intimations (for stock) and Purchase Requisitions (for procurement), and sends in-app alerts to the relevant teams.

---

## 1. Schema Changes

### SalesOrderItem — new allotment fields

```prisma
  allotmentSource       String?   // "STOCK", "PROCUREMENT", "SPLIT", null = unallocated
  stockAllocQty         Decimal?  @db.Decimal(10, 3)
  procurementAllocQty   Decimal?  @db.Decimal(10, 3)
  allotmentStatus       String    @default("PENDING")  // "PENDING", "ALLOCATED", "PARTIALLY_ALLOCATED"
```

### SalesOrder — new allotment status

```prisma
  allotmentStatus       String    @default("PENDING")  // "PENDING", "IN_PROGRESS", "COMPLETED"
```

### New Model: Alert

```prisma
model Alert {
  id              String    @id @default(cuid())
  companyId       String
  company         CompanyMaster @relation(fields: [companyId], references: [id])
  title           String
  message         String    @db.Text
  type            String    // "STOCK_ALLOTMENT", "PROCUREMENT_REQUIRED", "ORDER_PROCESSED"
  targetRole      String    // "STORES", "PURCHASE", "SALES", "QC", etc.
  referenceType   String    // "SalesOrder", "WarehouseIntimation", "PurchaseRequisition"
  referenceId     String
  isRead          Boolean   @default(false)
  createdById     String?
  createdBy       User?     @relation("AlertCreatedBy", fields: [createdById], references: [id])
  createdAt       DateTime  @default(now())

  @@index([companyId])
  @@index([targetRole])
  @@index([isRead])
}
```

Reverse relations:
- `CompanyMaster`: `alerts Alert[]`
- `User`: `alertsCreated Alert[] @relation("AlertCreatedBy")`

---

## 2. Auto-Analyze Stock Availability

### API: `GET /api/sales-orders/[id]/allotment/analyze`

Auth: `checkAccess("salesOrder", "read")`

Query param: `?itemId=xxx` (optional, analyze single item; omit for all items)

For each SO item (or specific item):
1. Find matching inventory stock: product match + material/specification match + sizeLabel match + status `ACCEPTED` + quantityMtr > 0
2. Order by mtcDate ASC (FIFO)
3. Sum total available quantity
4. Compare with SO item ordered quantity minus any existing stock reservations
5. Suggest allotment source:
   - If available >= remaining needed → `"STOCK"` (full stock)
   - If available > 0 but < remaining → `"SPLIT"` (partial stock + partial procurement)
   - If available == 0 → `"PROCUREMENT"` (full procurement)

Response:
```json
{
  "items": [
    {
      "salesOrderItemId": "...",
      "sNo": 1,
      "product": "SS 304 Seamless Pipe",
      "sizeLabel": "2\" NB Sch 40",
      "orderedQty": 100,
      "existingReservations": 0,
      "remainingQty": 100,
      "availableStockQty": 60,
      "availableStockItems": [
        { "id": "...", "heatNo": "H12345", "quantityMtr": 40, "mtcDate": "2026-03-01", "make": "ISMT" },
        { "id": "...", "heatNo": "H12346", "quantityMtr": 20, "mtcDate": "2026-03-15", "make": "MSL" }
      ],
      "suggestedSource": "SPLIT",
      "suggestedStockQty": 60,
      "suggestedProcurementQty": 40,
      "currentAllotment": null
    }
  ]
}
```

---

## 3. Confirm Allotment

### API: `POST /api/sales-orders/[id]/allotment`

Auth: `checkAccess("salesOrder", "write")`

Body:
```json
{
  "items": [
    {
      "salesOrderItemId": "...",
      "source": "STOCK" | "PROCUREMENT" | "SPLIT",
      "stockAllocQty": 60,
      "procurementAllocQty": 40
    }
  ]
}
```

Validations:
- Each item must belong to the SO
- Item's order processing status must be "PROCESSED"
- stockAllocQty + procurementAllocQty must equal item's ordered quantity
- If source is "STOCK", procurementAllocQty must be 0
- If source is "PROCUREMENT", stockAllocQty must be 0
- stockAllocQty must not exceed available stock

Actions on confirm:
1. Update SalesOrderItem: set `allotmentSource`, `stockAllocQty`, `procurementAllocQty`, `allotmentStatus: "ALLOCATED"`
2. **If stock qty > 0:** Auto-create Warehouse Intimation (MPR) for stock items
   - Use existing `generateDocumentNumber("WAREHOUSE_INTIMATION")`
   - Set priority based on delivery date urgency
   - Create MPR items for each stock-allocated SO item
   - Create Alert for STORES role: "Stock allotment for SO-XXXX — X items pending warehouse processing"
3. **If procurement qty > 0:** Auto-create Purchase Requisition
   - Use existing PR generation logic from `auto-pr-generation.ts` or create directly
   - Create Alert for PURCHASE role: "Procurement required for SO-XXXX — X items need purchasing"
4. Update SO `allotmentStatus` based on all items:
   - All items ALLOCATED → `"COMPLETED"`
   - Some items ALLOCATED → `"IN_PROGRESS"`
   - No items ALLOCATED → `"PENDING"`

---

## 4. Wizard Integration (Order Processing Page)

### Changes to `src/app/(dashboard)/sales/[id]/process/page.tsx`

After an item is marked as "Processed", an **Allotment Section** appears below the processed confirmation:

- Auto-fetches `/api/sales-orders/[id]/allotment/analyze?itemId=xxx`
- Shows:
  - "Available Stock: X meters (from Y items)" or "No stock available"
  - Radio buttons: Stock / Procurement / Split
  - Pre-selected based on suggestion
  - If Split: two number inputs (stock qty + procurement qty) with validation
- "Confirm Allotment" button → calls POST allotment API for that single item
- After confirmation: shows green "Allocated" badge with source details
- If item is already allocated, shows current allotment (read-only) with "Change" button

The allotment section is optional — user can skip it in the wizard and handle it later from the dedicated page.

---

## 5. Dedicated Allotment Page

### Route: `/sales/[id]/allotment`

### Layout:
- **Header:** "Stock Allotment — {soNo}", customer name, overall allotment status badge
- **Summary cards (4):** Total Items, Allocated to Stock, Allocated to Procurement, Pending
- **Items table columns:**
  - Item #, Product, Size, Ordered Qty
  - Available Stock (live from analyze API)
  - Source (badge: STOCK/PROCUREMENT/SPLIT or "Pending")
  - Stock Qty, Procurement Qty
  - Status badge
  - Action: "Allocate" or "Change" button
- **Allocate/Change action:** Opens a row-expansion or dialog with Stock/Procurement/Split selection (same UI as wizard allotment section)
- **Bulk action:** "Auto-Allocate All Pending" button
  - Calls analyze for all pending items
  - Applies suggested allotments
  - Shows confirmation dialog: "X items → Stock, Y items → Procurement, Z items → Split. Confirm?"
  - On confirm, calls POST allotment for all items at once

### Visibility
"Stock Allotment" button on SO detail page — visible when `processingStatus` is `PROCESSING` or `PROCESSED`.

---

## 6. SO Detail Page Changes

- Add `allotmentStatus` badge next to processing status badge
- Add "Stock Allotment" button — visible when processingStatus is PROCESSING or PROCESSED
- In the Order Processing Summary card, add allotment info per item: source badge + allocated quantities

---

## 7. Notification Bell (Topbar)

### Changes to `src/components/layout/topbar.tsx`

- Add a bell icon (from lucide-react) with unread count badge
- On click, opens a dropdown showing last 10 unread alerts
- Each alert shows: title, message preview, time ago, type icon
- Clicking an alert navigates to the referenced record (e.g. `/warehouse/intimation/[id]` or `/purchase/requisitions/[id]`)
- "Mark all as read" button at the bottom
- Alerts filtered by current user's role (from session)

### API: `GET /api/alerts`
- Returns alerts for current user's role + company
- Query params: `?unreadOnly=true&limit=10`

### API: `PATCH /api/alerts/[id]`
- Mark single alert as read

### API: `PATCH /api/alerts/mark-all-read`
- Mark all alerts for current user's role as read

---

## 8. Files Summary

| Action | File |
|--------|------|
| Modify | `prisma/schema.prisma` — allotment fields on SalesOrderItem/SalesOrder, Alert model |
| Create | `src/app/api/sales-orders/[id]/allotment/analyze/route.ts` — GET analyze stock availability |
| Create | `src/app/api/sales-orders/[id]/allotment/route.ts` — POST confirm allotment |
| Create | `src/app/api/alerts/route.ts` — GET alerts for user role |
| Create | `src/app/api/alerts/[id]/route.ts` — PATCH mark as read |
| Create | `src/app/api/alerts/mark-all-read/route.ts` — PATCH mark all read |
| Create | `src/app/(dashboard)/sales/[id]/allotment/page.tsx` — dedicated allotment page |
| Modify | `src/app/(dashboard)/sales/[id]/process/page.tsx` — add allotment section after processed |
| Modify | `src/app/(dashboard)/sales/[id]/page.tsx` — allotment status badge, Stock Allotment button |
| Modify | `src/components/layout/topbar.tsx` — notification bell with alerts dropdown |

---

## 9. Error Handling

- **Insufficient stock for allotment:** Allow partial — suggest SPLIT with available qty for stock and remainder for procurement.
- **Stock reserved between analyze and confirm:** Re-validate stock availability at confirm time. If stock qty decreased, return error asking user to re-analyze.
- **PR generation failure:** Log error, still mark allotment but flag PR creation as failed. User can retry from the allotment page.
- **MPR creation failure:** Same approach — mark allotment, flag MPR creation failed, retry available.
