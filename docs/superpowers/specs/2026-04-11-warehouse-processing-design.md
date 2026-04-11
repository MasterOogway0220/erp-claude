# Warehouse Processing (3C) — Design Spec

**Date:** 2026-04-11
**Sub-system:** 3C of 4 (Sales Order Module Overhaul)
**Status:** Draft
**Dependencies:** Requires completed Sub-systems 3A (Order Processing) and 3B (Stock Allotment)

---

## Overview

When stock is allocated to warehouse via MPR (from sub-system 3B), the warehouse team processes the material: filling per-pipe details (length, make, heat no) as sub-rows, QA links MTCs later, and inspection offers are auto-generated from ready items. The existing warehouse intimation list page becomes a dashboard with KPI cards and status filters.

---

## 1. Schema Changes

### New Model: WarehouseItemDetail

Per-pipe/per-heat sub-rows under each WarehouseIntimationItem.

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
  status                    String    @default("PENDING")  // PENDING, READY, INSPECTED
  createdAt                 DateTime  @default(now())
  updatedAt                 DateTime  @updatedAt

  @@index([warehouseIntimationItemId])
  @@index([inventoryStockId])
}
```

### Reverse Relations
- `WarehouseIntimationItem`: `details WarehouseItemDetail[]`
- `InventoryStock`: `warehouseItemDetails WarehouseItemDetail[] @relation("DetailStock")`

---

## 2. Warehouse Intimation List Page — Dashboard Enhancement

### File: `src/app/(dashboard)/warehouse/intimation/page.tsx`

Add summary cards at the top:
- **Total MPRs** — count all non-cancelled
- **Pending** — status PENDING
- **In Progress** — status IN_PROGRESS
- **Material Ready** — status MATERIAL_READY
- **Dispatched** — status DISPATCHED

Add quick-filter buttons below the cards to filter the list by status. Cards are also clickable to filter.

---

## 3. MPR Detail Page — Expandable Items + Inline Editing

### File: `src/app/(dashboard)/warehouse/intimation/[id]/page.tsx`

**Each item row becomes expandable** (click to toggle):

**Collapsed view:** Item #, product, size, required qty, prepared qty (sum of sub-row lengths), status badge

**Expanded view:** Sub-rows table:
| # | Length (MTR) | Pieces | Make | Heat No | MTC No | MTC Date | Status | Actions |
|---|---|---|---|---|---|---|---|---|

- Length, Pieces, Make, Heat No: editable by warehouse team (STORES role)
- MTC No, MTC Date: editable by QA team only (QC role) — disabled/grayed out for other roles
- "Add Detail" button to add another sub-row
- Delete button per sub-row (only if status is PENDING)
- Prepared qty auto-calculated from sum of detail lengths

**New buttons in header (when status is PENDING or IN_PROGRESS):**
- "Prepare Material" → navigates to `/warehouse/intimation/[id]/prepare`

**New button (when any items are READY):**
- "Generate Inspection Offer" → opens dialog to select ready items, then calls generate IO API

**Status auto-update logic:**
- When details are saved for an item: item status → `IN_PROGRESS`, MPR status → `IN_PROGRESS`
- When all details for an item have MTC filled: item status → `READY`
- When all items are READY: MPR status → `MATERIAL_READY`

---

## 4. Prepare Material Page (Wizard)

### Route: `/warehouse/intimation/[id]/prepare`
### File: `src/app/(dashboard)/warehouse/intimation/[id]/prepare/page.tsx`

**Layout (stepper, item by item):**
- Step indicator showing items with status badges
- Current item info bar: product, material, size, required qty (read-only)

**Pipe Details section:**
- Table of detail sub-rows for current item
- Editable columns: Length (MTR), Pieces, Make, Heat No
- MTC No / MTC Date: visible but disabled (QA fills later)
- "Add Row" button
- Delete button per row
- Running total: progress bar showing `sum(lengthMtr) / requiredQty`

**Stock Picker (optional helper):**
- "Select from Stock" button
- Opens dialog showing available InventoryStock matching the item (product, material, size — same matching logic as allotment analyze)
- Selecting a stock record auto-fills: lengthMtr from stock quantityMtr, make, heatNo
- Links the detail to `inventoryStockId`

**Navigation:** Previous / Next item
**"Mark Item Ready"** button — validates total length >= required qty, sets item to READY status

---

## 5. QA MTC Linking

QA team fills MTC details directly on sub-rows via:
- MPR detail page (expanded item view) — MTC columns editable for QC/ADMIN/SUPER_ADMIN roles
- Prepare material page — same table, MTC columns enabled for QA role

**RBAC:** MTC fields controlled by checking `session.user.role` on the frontend. API endpoint for updating details (`PATCH`) checks role before allowing MTC field updates.

**Status auto-updates on MTC fill:**
- When a detail sub-row gets both mtcNo and mtcDate filled: detail status → `READY`
- When all details for an item are READY: item status → `READY`
- When all items are READY: MPR status → `MATERIAL_READY`

---

## 6. Auto-Generate Inspection Offer

### Trigger 1: Automatic
When MPR status changes to `MATERIAL_READY`:
- Auto-create a draft `InspectionOffer` linked to the SO
- Each `WarehouseItemDetail` with status READY becomes an `InspectionOfferItem`
- Fields mapped: sNo, product (from parent item), material, sizeLabel, heatNo (from detail), quantity (from lengthMtr), uom ("MTR")
- If the SO item has an `OrderProcessingItem` with `tpiRequired: true`:
  - Pre-fill TPI agency from order processing data
  - Include inspection parameters (VDI, hydro test witness %)
  - Include required lab tests
- InspectionOffer status: `DRAFT`
- Create Alert for QC role: "Inspection offer ready for review"

### Trigger 2: Manual
"Generate Inspection Offer" button on MPR detail page:
- Visible when at least one item has READY details
- Opens dialog with checkboxes to select which items/details to include (partial inspection)
- Creates IO with only selected items
- If draft IO already exists for this MPR, option to add items to existing IO

### API: `POST /api/warehouse/intimation/[id]/generate-inspection-offer`
Body: `{ itemIds?: string[], addToExisting?: string }` (optional item filter, optional existing IO id)

---

## 7. API Endpoints

### GET /api/warehouse/intimation/[id]/details
Returns all MPR items with their detail sub-rows. Includes parent item info and inventory stock reference.

### POST /api/warehouse/intimation/[id]/details
Upsert detail sub-rows for a specific item.
Body: `{ warehouseIntimationItemId, details: [{ sNo, lengthMtr, pieces, make, heatNo, inventoryStockId?, remarks? }] }`
- Creates new details or updates existing by id
- Auto-updates item preparedQty and status
- Auto-updates MPR status

### PATCH /api/warehouse/intimation/[id]/details/[detailId]
Update a single detail — primarily for QA MTC entry.
Body: `{ mtcNo?, mtcDate?, lengthMtr?, pieces?, make?, heatNo?, remarks? }`
- QC/ADMIN/SUPER_ADMIN roles can update mtcNo/mtcDate
- STORES role can update length/pieces/make/heatNo
- Auto-updates detail status, item status, MPR status

### DELETE /api/warehouse/intimation/[id]/details/[detailId]
Remove a detail sub-row. Only allowed if detail status is PENDING.
Auto-recalculates item preparedQty.

### POST /api/warehouse/intimation/[id]/generate-inspection-offer
Generate inspection offer from ready items. See Section 6 for details.

---

## 8. Files Summary

| Action | File |
|--------|------|
| Modify | `prisma/schema.prisma` — WarehouseItemDetail model, reverse relations |
| Create | `src/app/api/warehouse/intimation/[id]/details/route.ts` — GET + POST |
| Create | `src/app/api/warehouse/intimation/[id]/details/[detailId]/route.ts` — PATCH + DELETE |
| Create | `src/app/api/warehouse/intimation/[id]/generate-inspection-offer/route.ts` — POST |
| Create | `src/app/(dashboard)/warehouse/intimation/[id]/prepare/page.tsx` — Prepare Material wizard |
| Modify | `src/app/(dashboard)/warehouse/intimation/page.tsx` — Summary cards + status filters |
| Modify | `src/app/(dashboard)/warehouse/intimation/[id]/page.tsx` — Expandable items, inline details, Prepare + Generate IO buttons |
| Modify | `src/app/api/warehouse/intimation/[id]/route.ts` — Include details in GET, status auto-update in PUT |

---

## 9. Error Handling

- **Add detail when item is READY:** Allow — status reverts to IN_PROGRESS (new detail without MTC)
- **Delete last detail for an item:** Allowed — item status reverts to PENDING, preparedQty drops to 0
- **Generate IO with no READY items:** Return 400 "No items ready for inspection"
- **MTC entry by non-QA role:** Return 403 "Only QA team can update MTC details"
- **Mark item ready when total length < required:** Return 400 "Prepared quantity (X) is less than required quantity (Y)"
