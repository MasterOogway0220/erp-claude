# Sales Dashboard & Client PO Enhancements — Design Spec

**Date:** 2026-04-11
**Sub-system:** 1 of 4 (Sales Order Module Overhaul)
**Status:** Draft

---

## Overview

Three changes to the Sales module:
1. New Sales Dashboard page with KPIs and summaries
2. Client PO form enhancements — delivery date picker (PO-level + item-level) and rate negotiation with revision history
3. Sidebar navigation reorder

---

## 1. Sales Dashboard

### Route
`/sales/dashboard` — new page at `src/app/(dashboard)/sales/dashboard/page.tsx`

### Layout (Single Scrollable Page)

**Row 1 — 4 KPI Cards:**
| Card | Data Source | Subtitle |
|------|-----------|----------|
| Total Client POs | Count of all CPOs (current FY) | +X% this month vs last |
| Pending Acceptance | Count of CPOs with status REGISTERED and no ISSUED POAcceptance | X aging > 7 days |
| Order Value (Month) | Sum of `grandTotal` for CPOs created this month | +X% vs last month |
| Overdue Deliveries | Count of CPOs/items where `deliveryDate < today` and status not FULLY_FULFILLED/CANCELLED | Avg X days overdue |

**Row 2 — 4 KPI Cards:**
| Card | Data Source | Subtitle |
|------|-----------|----------|
| Pending Processing | Count of accepted CPOs not yet in order processing | — |
| Stock Allotment | Count of SO items with pending/partial stock reservation | X partial, Y pending |
| Quotation Conversion | (CPOs created / Quotations sent) × 100 for current quarter | +X% vs last quarter |
| Rate Negotiation Impact | Sum of (quotedRate - currentRate) × qty across all CPO items with rate changes this month | Avg X% discount |

**Middle Section (2 columns):**
- **Left (wider):** Deliveries Due This Week — list of SOs/CPOs with CDD in current week, sorted by date. Overdue items highlighted in red.
- **Right:** Top 5 Customers by order value this month.

**PO Aging Widget:**
- Horizontal bar or badge breakdown: < 3 days | 3-7 days | > 7 days — for CPOs pending acceptance.

**Quick Actions:**
- "Register New PO" button → navigates to `/client-purchase-orders/create`
- "View All Orders" link → navigates to `/client-purchase-orders`

**Recent Client POs Table (bottom):**
- Last 10 CPOs sorted by `cpoDate` desc
- Columns: CPO No, Customer, Client PO No, Value, Status (badge), CDD
- Each row clickable → navigates to `/client-purchase-orders/[id]`

### API Endpoint
`GET /api/sales/dashboard`

Returns aggregated data in a single response:
```json
{
  "kpis": {
    "totalCPOs": 47,
    "totalCPOsLastMonth": 42,
    "pendingAcceptance": 8,
    "pendingAcceptanceAging": { "lt3": 3, "3to7": 2, "gt7": 3 },
    "orderValueMonth": 24000000,
    "orderValueLastMonth": 20300000,
    "overdueDeliveries": 5,
    "avgDaysOverdue": 4,
    "pendingProcessing": 6,
    "stockAllotment": { "partial": 4, "pending": 8 },
    "quotationConversion": 34,
    "quotationConversionLastQuarter": 29,
    "rateNegotiationImpact": 320000,
    "avgDiscountPercent": 2.1
  },
  "deliveriesDueThisWeek": [
    { "id": "...", "soNo": "SO-2026-00142", "customerName": "ABC Pvt Ltd", "cdd": "2026-04-15", "isOverdue": false }
  ],
  "topCustomers": [
    { "customerId": "...", "customerName": "ABC Pvt Ltd", "orderValue": 8400000 }
  ],
  "recentCPOs": [
    { "id": "...", "cpoNo": "CPO-2026-00047", "customerName": "ABC Pvt Ltd", "clientPoNumber": "PO/2026/1234", "grandTotal": 1850000, "status": "REGISTERED", "deliveryDate": "2026-04-20" }
  ]
}
```

RBAC: `checkAccess("salesOrder", "read")` — accessible to SALES, PURCHASE, STORES, MANAGEMENT, ADMIN, SUPER_ADMIN.

---

## 2. Client PO Form — Delivery Date

### PO-Level Delivery Date
- **Field:** Replace `deliverySchedule` (text) with `deliveryDate` (date picker)
- **Schema change:** Add `deliveryDate DateTime?` to `ClientPurchaseOrder` model
- **Migration:** Keep `deliverySchedule` field for backward compat (existing data). New form only uses `deliveryDate`. Display pages show `deliveryDate` if set, fall back to `deliverySchedule`.
- **UI:** Standard date picker (shadcn Calendar/DatePicker component), labeled "Delivery Date (CDD)"

### Item-Level Delivery Date
- **Field:** Add `deliveryDate DateTime?` to `ClientPOItem` model
- **UI:** New date picker column in the items table, labeled "Item CDD"
- **Behavior:** Optional. If blank, the item inherits the PO-level delivery date. If set, overrides for that specific item.
- **Display:** On detail view, show item-level CDD if set, otherwise show PO-level CDD with "(inherited)" label.

---

## 3. Client PO Form — Rate Negotiation

### New Schema Model: RateRevision

```prisma
model RateRevision {
  id              String   @id @default(cuid())
  clientPOItemId  String
  clientPOItem    ClientPOItem @relation(fields: [clientPOItemId], references: [id])
  oldRate         Decimal  @db.Decimal(15, 2)
  newRate         Decimal  @db.Decimal(15, 2)
  remark          String
  overallRemark   String?
  changedById     String
  changedBy       User     @relation(fields: [changedById], references: [id])
  changedAt       DateTime @default(now())
  companyId       String
  company         CompanyMaster @relation(fields: [companyId], references: [id])

  @@index([clientPOItemId])
  @@index([companyId])
}
```

Add reverse relations:
- `ClientPOItem`: `rateRevisions RateRevision[]`
- `User`: `rateRevisions RateRevision[]`
- `CompanyMaster`: `rateRevisions RateRevision[]`

### Inline Per-Item Rate Edit

In the Client PO create/edit form, each item row displays:

| Quoted Rate (read-only) | Current Rate (editable) | Diff (auto-calc) | Remark (text, mandatory if rate changed) |
|---|---|---|---|

- **Quoted Rate:** Pulled from the linked quotation item. Read-only, shown for reference.
- **Current Rate:** Editable input. Defaults to quoted rate on initial creation.
- **Diff:** `quotedRate - currentRate`. Shown as amount and %. Green if positive (markup), red if negative (discount).
- **Remark:** Text input. Mandatory when current rate differs from quoted rate. Validation prevents save without remark.
- **History icon:** Small clock icon next to the rate field. Clicking opens a popover/dialog showing all `RateRevision` records for that item, sorted newest first. Each entry shows: date, user, old rate → new rate, remark.

### Bulk Rate Negotiation Section

Collapsible section below the items table, labeled "Rate Negotiation Summary".

**Summary table:**
| Item Description | Quoted Rate | Current Rate | Diff (amt) | Diff (%) | Item Remark |
|---|---|---|---|---|---|

All columns except Quoted Rate and Diff are editable inline.

**Bulk actions row:**
- "Apply % Discount" — numeric input + "Apply" button. Applies flat percentage discount to ALL items. E.g., entering 5 reduces each item's current rate by 5%.
- "Overall Remark" — text field for the bulk action justification (e.g., "5% volume discount per email dated 10-Apr").

**On save:**
- For each item whose rate changed, create a `RateRevision` record with `oldRate`, `newRate`, per-item `remark`, and the shared `overallRemark`.
- Recalculate item subtotals and PO grand total.

### API Changes

**POST/PATCH `/api/client-purchase-orders`:**
- Accept `deliveryDate` at PO level
- Accept `deliveryDate` per item in the items array
- Accept `rateRemark` per item
- When rate changes on an existing CPO (PATCH), create `RateRevision` records

**GET `/api/client-purchase-orders/[id]`:**
- Include `rateRevisions` in the item response (with `changedBy` user name)

**New endpoint: `POST /api/client-purchase-orders/[id]/bulk-rate-update`:**
- Body: `{ discountPercent?: number, items?: [{ itemId, newRate, remark }], overallRemark: string }`
- Creates `RateRevision` records for each changed item
- Recalculates subtotals and grand total

---

## 4. Sidebar Navigation

### Current
```
Sales
├── Client P.O. Register    → /client-purchase-orders
├── Register Client P.O.    → /client-purchase-orders/create
├── P.O. Acceptance          → /po-acceptance
├── Sales Orders             → /sales
├── Order Tracking           → /po-tracking
└── Customer PO Review       → /sales
```

### New
```
Sales
├── Dashboard                → /sales/dashboard          (NEW)
├── Register Client P.O.    → /client-purchase-orders/create
├── Client P.O. Register    → /client-purchase-orders    (moved down)
├── P.O. Acceptance          → /po-acceptance
├── Sales Orders             → /sales
├── Order Tracking           → /po-tracking
└── Customer PO Review       → /sales
```

---

## 5. Error Handling

- **Rate remark validation:** Form prevents submission if any item has a rate different from quoted rate but no remark. Error message: "Remark is required when rate differs from quoted rate."
- **Delivery date validation:** `deliveryDate` must be today or in the future. Item-level dates must be >= PO-level date if both are set.
- **Dashboard API:** If aggregation queries fail, return partial data with null fields rather than 500. Frontend shows "—" for unavailable metrics.

## 6. Testing Considerations

- Dashboard KPI calculations: verify counts, sums, and percentages against known data
- Rate revision history: verify multiple revisions per item are tracked correctly
- Bulk discount: verify percentage applied correctly across all items, rounding to 2 decimal places
- Delivery date inheritance: verify item shows PO-level date when item date is null
- RBAC: verify dashboard API respects moduleAccess enforcement
