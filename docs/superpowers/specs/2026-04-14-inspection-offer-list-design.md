# Inspection Offer List — Design Spec
**Date:** 2026-04-14  
**Status:** Approved

---

## Overview

Implement a complete Inspection Offer workflow that supports:
- Two entry points: direct from PO, or via Warehouse Intimation (MPR)
- Multiple heat numbers per PO line item, with multiple MTC documents per heat
- 3-level partial item selection (line item → heat → piece count) when generating an Inspection Offer Letter
- Approval workflow: QA submits → Manager approves → Sent to TPI → Inspection Report

---

## What Already Exists (do not rebuild)

- `InspectionOffer` + `InspectionOfferItem` models
- `WarehouseItemDetail` model (single mtcNo/mtcDate — to be migrated)
- `/quality/inspection-offers` list + detail + PDF pages
- `/quality/inspections/create` + detail pages
- `/warehouse/intimation/[id]/prepare` stepper page
- `POST /api/warehouse/intimation/[id]/generate-inspection-offer` API (accepts `itemIds`)

---

## Data Model

### New Models

#### `InspectionPrep`
Central hub that both entry points converge to.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| prepNo | String | Auto-generated, unique |
| poId | String? | FK → PurchaseOrder (optional) |
| warehouseIntimationId | String? | FK → WarehouseIntimation (optional) |
| status | Enum | DRAFT, READY, OFFER_GENERATED |
| preparedBy | String | FK → User |
| companyId | String | FK → Company |
| createdAt / updatedAt | DateTime | |

At least one of `poId` or `warehouseIntimationId` must be set.

#### `InspectionPrepItem`
One per PO line item in the prep.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| inspectionPrepId | String | FK → InspectionPrep |
| poItemId | String | FK → POItem |
| description | String | |
| sizeLabel | String | |
| totalLength | Decimal | Computed from heat entries |
| totalPieces | Int | Computed from heat entries |
| uom | String | |
| make | String | Default make for item |
| status | Enum | PENDING, READY |

#### `HeatEntry`
One per heat number per item. Filled by Warehouse staff.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| inspectionPrepItemId | String | FK → InspectionPrepItem |
| heatNo | String | |
| lengthMtr | Decimal | |
| pieces | Int | |
| make | String? | Overrides item-level make if set |
| addedBy | String | FK → User (Warehouse role) |
| createdAt / updatedAt | DateTime | |

#### `MTCDocument`
One-to-many per heat. Filled by QA only.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| heatEntryId | String | FK → HeatEntry |
| mtcNo | String | |
| mtcDate | DateTime | |
| fileUrl | String? | Optional uploaded certificate |
| addedBy | String | FK → User (QA role only) |
| createdAt / updatedAt | DateTime | |

### Existing Model Migrations

#### `WarehouseItemDetail` → migration
For each existing row, create:
- One `HeatEntry` using the existing `heatNo`, `lengthMtr`, `pieces`, `make`
- One `MTCDocument` using the existing `mtcNo`, `mtcDate` (if set)

Keep original `WarehouseItemDetail` fields intact. Add `heatEntryId` FK as nullable.

#### `InspectionOffer` — add fields
| New Field | Type | Notes |
|---|---|---|
| inspectionPrepId | String? | FK → InspectionPrep |
| status | Enum | DRAFT, PENDING_APPROVAL, APPROVED, SENT, INSPECTION_DONE, COMPLETED |
| approvedBy | String? | FK → User |
| approvedAt | DateTime? | |
| rejectedBy | String? | FK → User |
| rejectedAt | DateTime? | |
| rejectionRemarks | String? | |
| tpiAgencyId | String? | FK → InspectionAgencyMaster |
| sentAt | DateTime? | |
| tpiSignedAt | DateTime? | |

#### `InspectionOfferItem` — add fields
| New Field | Type | Notes |
|---|---|---|
| piecesSelected | Int? | For partial piece-level selection |

#### New join model: `InspectionOfferItemHeat`
Links selected heat entries to an offer item (replaces `heatEntryIds` array).

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| inspectionOfferItemId | String | FK → InspectionOfferItem |
| heatEntryId | String | FK → HeatEntry |
| piecesSelected | Int? | Override pieces for this specific heat |

---

## API Routes

### New Routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/quality/inspection-prep` | List all preps |
| POST | `/api/quality/inspection-prep` | Create new prep (body: poId or intimationId) |
| GET | `/api/quality/inspection-prep/[id]` | Get prep with items, heats, MTCs |
| PATCH | `/api/quality/inspection-prep/[id]` | Update status |
| POST | `/api/quality/inspection-prep/[id]/items` | Add item to prep |
| POST | `/api/quality/inspection-prep/[id]/items/[itemId]/heats` | Add heat entry |
| PATCH | `/api/quality/inspection-prep/[id]/items/[itemId]/heats/[heatId]` | Edit heat |
| DELETE | `/api/quality/inspection-prep/[id]/items/[itemId]/heats/[heatId]` | Remove heat |
| POST | `/api/quality/inspection-prep/[id]/items/[itemId]/heats/[heatId]/mtc` | Add MTC doc (QA only) |
| PATCH | `/api/quality/inspection-prep/[id]/items/[itemId]/heats/[heatId]/mtc/[mtcId]` | Edit MTC |
| DELETE | `/api/quality/inspection-prep/[id]/items/[itemId]/heats/[heatId]/mtc/[mtcId]` | Remove MTC |
| POST | `/api/quality/inspection-prep/[id]/generate-offer` | Generate offer letter from selected items/heats |

### Extended Routes (existing)

| Method | Path | Change |
|---|---|---|
| PATCH | `/api/quality/inspection-offers/[id]` | Add: submit-approval, approve, reject, mark-sent, mark-tpi-signed actions |
| POST | `/api/quality/inspections` | Accept `inspectionOfferId` to pre-fill from offer |

---

## Frontend Pages

### New Pages

#### `/quality/inspection-prep` — List Page
- Table of all InspectionPrep records
- Columns: Prep No., PO No., Status, Prepared By, Date
- "New Inspection Prep" button

#### `/quality/inspection-prep/create` — Create Page
- Accepts `?poId=X` or `?intimationId=X` query params
- If poId: loads PO line items for selection
- If intimationId: loads MPR items (pre-fills existing detail where available)
- User selects which items to include, sets default make per item
- Submits → creates InspectionPrep + InspectionPrepItems → redirects to detail page

#### `/quality/inspection-prep/[id]` — Detail Page
Three tabs:

**Tab 1: Items & Heat Details** (Warehouse role edits, QA can view)
- Expandable table: one row per InspectionPrepItem
- Expand → heat entry rows with: heatNo, lengthMtr, pieces, make
- "+ Add Heat" button per item
- MTC columns visible but locked (greyed, tooltip: "Filled by QA")
- "Mark Item Ready" button when all heats filled
- Progress indicator: X of Y items ready

**Tab 2: MTC Documents** (QA role edits)
- Same expandable table
- Heat rows expanded by default
- Per heat: mtcNo, mtcDate columns editable
- "+ Add MTC" button per heat → inline new row
- File upload button per MTC row

**Tab 3: Summary**
- Totals per item: total length, total pieces, no. of heats, no. of MTCs
- Status overview
- "Generate Inspection Offer" button (enabled when status = READY, QA/Manager only)

### Modified Pages

#### `/purchase-orders/[id]` — add button
- "Prepare for Inspection" button on approved POs
- Links to `/quality/inspection-prep/create?poId=[id]`

#### `/warehouse/intimation/[id]` — add button
- "Prepare for Inspection" button
- Links to `/quality/inspection-prep/create?intimationId=[id]`

#### `/quality/inspection-offers/[id]` — extend
- Add status badge with full status flow
- Add action buttons based on role + current status:
  - QA: "Submit for Approval" (DRAFT → PENDING_APPROVAL)
  - Manager: "Approve" / "Reject with Remarks" (PENDING_APPROVAL → APPROVED/DRAFT)
  - QA/Manager: "Mark as Sent to TPI" + agency selector (APPROVED → SENT)
  - QA/Manager: "Mark TPI Sign-off Received" (SENT → INSPECTION_DONE)
  - QA/Manager: "Create Inspection Report" button (INSPECTION_DONE → links to /quality/inspections/create?offerId=[id])

---

## Item Selection Dialog (Generate Offer)

Triggered from Tab 3 of Prep Detail page. Modal with 3-level checkbox tree:

```
☑ Line Item 1 — 20" CS Pipe · 100m · 20 pcs
    ☑ Heat: ABC-001 · 60m · 12 pcs  [MTC-001] [MTC-002]
    ☑ Heat: ABC-002 · 40m · 8 pcs   [MTC-003]  Pieces: [5] of 8
☑ Line Item 2 — 16" CS Pipe · 50m · 10 pcs
    ☐ Heat: XYZ-007 · 50m · 10 pcs  (deselected)
```

Rules:
- Selecting a line item auto-selects all its heats
- Deselecting a line item deselects all its heats
- Individual heats can be toggled independently (partial deselection)
- Each selected heat shows a piece count input (default = full count, editable for partial)
- "Generate" button enabled only when at least one heat is selected
- On submit: creates InspectionOffer + InspectionOfferItems with selected heatEntryIds and piecesSelected

---

## Approval Workflow

### Status Transitions

| From | To | Actor | Condition |
|---|---|---|---|
| DRAFT | PENDING_APPROVAL | QA / Manager | At least one item selected |
| PENDING_APPROVAL | APPROVED | Manager only | — |
| PENDING_APPROVAL | DRAFT | Manager only | Rejection remarks required |
| APPROVED | SENT | QA / Manager | TPI agency selected |
| SENT | INSPECTION_DONE | QA / Manager | TPI sign-off date recorded |
| INSPECTION_DONE | COMPLETED | QA / Manager | Inspection report created |

### Notifications (using existing alert system)

| Trigger | Recipient | Message |
|---|---|---|
| Submitted for approval | Manager | "Inspection Offer [No.] submitted for approval" |
| Approved | Submitting QA user | "Inspection Offer [No.] approved" |
| Rejected | Submitting QA user | "Inspection Offer [No.] rejected: [remarks]" |
| TPI sign-off received | Assigned QA | "TPI sign-off received for Offer [No.] — ready for inspection" |

---

## Role Permissions Summary

| Action | Warehouse | QA | Manager | Admin |
|---|---|---|---|---|
| Create InspectionPrep | ✅ | ✅ | ✅ | ✅ |
| Fill Heat Entries | ✅ | ✅ | ✅ | ✅ |
| Add/Edit MTC Documents | ❌ | ✅ | ✅ | ✅ |
| Generate Inspection Offer | ❌ | ✅ | ✅ | ✅ |
| Submit for Approval | ❌ | ✅ | ✅ | ✅ |
| Approve / Reject | ❌ | ❌ | ✅ | ✅ |
| Mark Sent to TPI | ❌ | ✅ | ✅ | ✅ |
| Mark TPI Sign-off | ❌ | ✅ | ✅ | ✅ |
| Fill Test Results | ❌ | ✅ | ✅ | ✅ |
| Generate Report PDF | ❌ | ✅ | ✅ | ✅ |

---

## Data Migration

Single migration script to run once:

1. For each `WarehouseItemDetail` row where `heatNo` is set:
   - Find or create the parent `InspectionPrepItem` (via `warehouseIntimationItemId` → `POItem`)
   - Create one `HeatEntry` with `heatNo`, `lengthMtr`, `pieces`, `make`
   - If `mtcNo` is set: create one `MTCDocument` with `mtcNo`, `mtcDate`
   - Set `WarehouseItemDetail.heatEntryId` to the new HeatEntry

2. Existing `InspectionOffer` records: set `status = DRAFT`, leave new fields null

---

## Out of Scope

- Email sending to TPI agency (in-app only for now)
- Bulk PDF download of multiple offer letters
- Integration with external inspection agency portals
