# Sales Module PRD — Design Spec

**Date:** 2026-05-23
**Source PRD:** Sales Module change requests from meetings on 18-Apr-2026 and 19-Apr-2026
**Status:** Design approved, ready for implementation plan
**Scope:** Foundation (international client + currency) · Step 1 Register Client P.O. · Step 2 P.O. Acceptance · Step 3 Order Processing · Warehouse Stock Allotment

---

## 1. Brainstorming decisions

These are the design choices made during brainstorming. They constrain what the implementation can do.

| # | Decision area | Choice |
|---|---|---|
| D1 | Spec scope | One bundled spec covering all PRD sections (not decomposed into sub-specs) |
| D2 | Pending PRD questions | Spec end-to-end with explicit "AWAITING CONFIRMATION" placeholders |
| D3 | Data state | Pre-launch / test data only — schema changes are destructive, drop & reseed |
| D4 | International flag location | On `Customer` only; currency fully derived (not editable per PO) |
| D5 | FX rate source | Live API fetch with daily cache; rate frozen on each PO at creation |
| D6 | Material-code past-data lookup | Same customer only (no global fallback) |
| D7 | "Solver backtracking" (§3.6) | Wizard step navigation — Back/Next between steps with preserved state |
| D8 | Outsourced-process storage (§4.4/§4.5) | Hybrid — top-level booleans + `Json` for parameters |
| D9 | PO Acceptance PDF + email (§3.5) | Auto-generate PDF on submit → Preview Drawer → explicit Send Email |
| D10 | Stock split UX (§4.6) | Stepped wizard — intent first (full/partial/procure), then quantities |
| D11 | Per-piece data model (§5.2) | New `WarehouseIntimationItemPiece` table; one row per physical piece |
| D12 | Architectural approach | Extend existing schema in place + new normalized child tables for genuinely 1-to-many concepts |
| D13 | Branching strategy | Direct commits to `master` (solo dev) |

---

## 2. Architecture overview

### 2.1 Layout

```
src/app/(dashboard)/
  client-purchase-orders/         ← extended in place
    page.tsx                        ← page title renamed to "Dashboard" (PRD §1)
    create/page.tsx                 ← form rewrite (§2.1–2.9)
    [id]/page.tsx
  po-acceptance/                  ← extended in place
    create/page.tsx                 ← wizardized (§3.6) + consolidated charges (§3.4)
    [id]/page.tsx                   ← Preview Drawer for PDF + email send
  sales/                          ← extended in place
    [id]/process/page.tsx           ← outsourced processes + TPI parameters (§4.1–4.5)
    [id]/allotment/page.tsx         ← stepped wizard (§4.6)
  warehouse/intimation/           ← extended in place
    page.tsx                        ← "Pending for Processing" tab (§5.1)
    [id]/prepare/page.tsx           ← per-piece details (§5.2)
  masters/customers/              ← extended: International Client toggle

src/lib/
  fx/get-rate.ts                  ← NEW: USD↔INR via frankfurter.app, day-cached
  notifications/dispatch.ts       ← NEW: thin wrapper over existing Alert model
  calc/po-totals.ts               ← NEW (extracted): pure totals calculation
  pdf/po-acceptance-template.ts   ← extended for new acceptance fields
```

### 2.2 Data flow

```
Customer (isInternational)
   ↓ drives currency + GST gate
ClientPurchaseOrder (currency, exchangeRate, isDomesticDelivery, shipmentAddress?)
   ↓ §3 Start Order Processing
POAcceptance (acceptance fields, CDD, wizard state) ── auto-PDF ── Preview Drawer ── Send Email
   ↓
SalesOrder + SalesOrderItem (process flags + JSON params, colour code, stencil spec)
   ↓ allotment wizard
   ├─ Stock decision  → Alert(role=STORES) → WarehouseIntimation
   └─ Procurement     → Alert(role=PURCHASE) → PurchaseRequisition (existing)
WarehouseIntimationItem → WarehouseIntimationItemPiece × N → auto Inspection Offer List
```

### 2.3 Carried principles

- One Prisma migration set; drop & reseed.
- New normalized child tables only where data is genuinely 1-to-many (`WarehouseIntimationItemPiece`).
- Hybrid storage on `SalesOrderItem` for processes: top-level booleans + `Json` parameters.
- FX rate resolved at PO creation and frozen on the row — no historical drift.
- Notifications reuse `Alert` + `assignedToRole` — no new infra.

---

## 3. Schema changes

### 3.1 Modified models

```prisma
// NOTE: Implemented field is CustomerMaster (existing model). Fields below
// already exist in schema — no migration needed for customer-side wiring.
model CustomerMaster {
  // Existing — re-confirmed during Plan 01 Foundation
  customerType       String   @default("DOMESTIC")   // "DOMESTIC" | "INTERNATIONAL"
  defaultCurrency    String   @default("INR")        // "INR" | "USD"
  currency           String   @default("INR")
}

model ClientPurchaseOrder {
  // ADD
  committedDeliveryDate    DateTime?
  isDomesticDelivery       Boolean   @default(false)
  shipmentAddress          String?   @db.Text
  exchangeRate             Decimal?  @db.Decimal(12,6)
  // REMOVE (columns backing §2.1, if present on header)
}

model ClientPOItem {
  // RENAME
  quotedRate    → negotiatedRate          // §2.2
  // ADD
  poSlNo            String?               // §2.8 Sl. No. as per P.O.
  poItemCode        String?               // §2.8 Item Code as per P.O.
  rateRemark        String?   @db.Text    // §2.7
  // REMOVE
  qtyQuoted         // §2.1
  alreadyOrdered    // §2.1
  balance           // §2.1
}

model POAcceptance {
  // ADD
  acceptanceDetails    String?    @db.Text     // §3.1
  clientContactId      String?                  // §3.1 (CustomerContact FK)
  departmentContactId  String?                  // §3.1
  emailSentAt          DateTime?                // §3.5
  emailSentTo          String?                  // §3.5
  pdfGeneratedAt       DateTime?                // §3.5
  wizardStep           Int        @default(1)   // §3.6 backtrackable state
  // REMOVE
  signedPoCopyPath     // §3.2
  // (committedDeliveryDate, generatedPath, emailLogs already exist)
}

model SalesOrder {
  // (no changes — most flows are item-level)
}

model SalesOrderItem {
  // ADD
  colourCode        String?                       // §4.2 — values AWAITING CONFIRMATION
  stencilSpec       String?   @db.Text            // §4.3
  hasHotDipGalv     Boolean   @default(false)     // §4.4
  hasScrewedEnds    Boolean   @default(false)     // §4.4
  hasCoating        Boolean   @default(false)     // §4.4
  hasTpi            Boolean   @default(false)     // §4.4
  hasLabTesting     Boolean   @default(false)     // §4.4
  hasPmi            Boolean   @default(false)     // §4.4
  hasNdt            Boolean   @default(false)     // §4.4
  processParams     Json?                         // §4.4/§4.5 detailed params
  allotmentIntent   AllotmentIntent @default(PENDING)   // §4.6
  stockQty          Decimal?  @db.Decimal(14,3)
  procureQty        Decimal?  @db.Decimal(14,3)
}

model WarehouseIntimationItem {
  // ADD relation
  pieces  WarehouseIntimationItemPiece[]
}
```

### 3.2 New table

```prisma
model WarehouseIntimationItemPiece {                          // §5.2
  id                          String   @id @default(cuid())
  warehouseIntimationItemId   String
  length                      Decimal  @db.Decimal(10,2)
  make                        String?
  heatNo                      String?
  mtcNo                       String?
  mtcDate                     DateTime?
  mtcRepositoryId             String?

  warehouseIntimationItem     WarehouseIntimationItem  @relation(fields: [warehouseIntimationItemId], references: [id], onDelete: Cascade)
  mtcCertificate              MTCCertificate?          @relation(fields: [mtcRepositoryId], references: [id])

  @@index([warehouseIntimationItemId])
  @@index([mtcRepositoryId])
}
```

### 3.3 New enums

```prisma
// Currency is NOT an enum — uses the existing CurrencyMaster table (data-driven).
// USD is already seeded by prisma/seed.ts.
enum AllotmentIntent { PENDING  STOCK_FULL  STOCK_PARTIAL  PROCURE }
```

### 3.4 Enum additions to existing

```prisma
enum AlertType {
  // ... existing values
  STOCK_ALLOTMENT       // NEW — for §4.6 stock branch
  PROCUREMENT_REQUEST   // NEW — for §4.6 procure branch
}
```

### 3.5 Migration

Single Prisma migration set. Run `prisma migrate dev --name sales-prd-2026-05-23`. Drop & reseed all sales-related data (no production data exists per D3). Update seed scripts to populate the new `isInternational` flag on at least one demo customer to enable testing of international flows.

---

## 4. UI surfaces (page-by-page)

### 4.1 Masters

- `/masters/customers/create` + `/[id]/edit`: add **International Client** toggle. Toggling on sets `isInternational=true`, auto-sets `defaultCurrency=USD`.

### 4.2 Step 1 — Register Client P.O. (`/client-purchase-orders`)

**`page.tsx` (list)**
- Page title reads **"Dashboard"** (PRD §1).
- *Note: AWAITING CONFIRMATION on the sidebar label rename — default is to rename sidebar to "Client PO Dashboard" to avoid collision with the top-level Dashboard route.*

**`create/page.tsx` (header section)**
- **Currency** is read-only, derived from selected customer's `isInternational` (INR or USD).
- When customer is international:
  - **Domestic Delivery** toggle appears (§2.4).
  - Toggle ON → reveal Shipment Address textarea; GST inputs re-enable; `isDomesticDelivery=true` persisted.
  - Toggle OFF → GST inputs hidden; calculations done in USD only.
- **Exchange Rate** field appears when currency = USD. Auto-filled from `getRate()` on customer select; editable; locked once items are added to prevent retroactive recalculation drift.
- **Committed Delivery Date** date picker (§2.6) below the existing Delivery Schedule section, writes `committedDeliveryDate`.

**`create/page.tsx` (items table)**
- Remove columns: *Already Ordered*, *Balance*, *Qty Quoted* (§2.1).
- Rename column header: *Quoted Rate* → **Negotiated Rate** (§2.2).
- Add columns: *Sl. No. as per P.O.*, *Item Code as per P.O.* (§2.8).
- Rate cell gains a small edit affordance that opens a popover: *New Rate* input + *Remark* textarea. Save writes `negotiatedRate` + `rateRemark` and creates a `RateRevision` (§2.7).
- On **Material Code** selection: fire `GET /api/masters/material-codes/[id]/customer-history?customerId=…`. Response auto-fills *Past Quote*, *Past P.O.*, *Past P.O. Price*, *Remarks* into a read-only side panel below the row (§2.9). Latest quote price takes precedence when multiple exist (ordered by `createdAt DESC`).
- When currency = USD, GST columns hide. Subtotal labelled "USD Subtotal" with derived INR equivalent shown read-only beneath.

### 4.3 Step 2 — P.O. Acceptance (`/po-acceptance`)

**`create/page.tsx` becomes a 3-step wizard** (§3.6) with Back / Next / Save Draft. `wizardStep` persists position; user can navigate freely between completed steps without losing state.

1. **Acceptance Details** — Acceptance Date, Committed Delivery Date, Remarks, Client Contact (CustomerContact dropdown), Department Contact (§3.1). *Upload Signed P.O. Copy* removed (§3.2).
2. **Charges & Commercials** — **single consolidated card** merging the old Additional Charges box and Commercial Calculations box (§3.4). Layout: left side = charge line items with per-row tax flags; right side = totals breakdown (Subtotal, Charges, GST, Grand Total).
3. **Review & Submit** — read-only summary. Primary button reads **"Start Order Processing"** (§3.3).

**On submit:**
- Call new `POST /api/po-acceptance/[id]/finalize` → writes wizard final state, calls existing PDF generator, stores path + `pdfGeneratedAt`.
- Opens right-side **Preview Drawer** with `<iframe src={pdfUrl}>` and editable To / CC / Subject fields.
- Defaults: To = customer's primary email; Subject = `"P.O. Acceptance Letter — {acceptanceNo}"`.
- **Send Email** button hits the existing `/api/po-acceptance/[id]/email` (nodemailer + `POAcceptanceEmailLog`).

### 4.4 Step 3 — Order Processing (`/sales/[id]/process`)

- Top of page: order-picker dropdown if user lands without `[id]` (§4.1); otherwise direct entry.
- Per-item card additions:
  - **Colour Code** swatch picker. Default enum `{ RED, GREEN, YELLOW, BLUE, BLACK }` — AWAITING CONFIRMATION on actual scheme.
  - **Stencil / Additional Spec** textarea (§4.3) → `stencilSpec`.
  - **Outsourced Processes** group (§4.4):
    - Checkboxes: Hot Dip Galvanising, Screwed Ends, Lab Testing → `hasHotDipGalv`, `hasScrewedEnds`, `hasLabTesting`.
    - *Coating* checkbox + (Type input, Inside/Outside radio) → `hasCoating=true`, `processParams.coating = { type, side }`.
    - *Third Party Inspection* dropdown — values `{ NONE, INTERNAL, TPI_CLIENT_QA }` (AWAITING CONFIRMATION). On `TPI_CLIENT_QA`: reveal §4.5 panel:
      - VDI Witness % (number)
      - Hydro Test Witness % (number)
      - Check Tests at Lab — multi-select of: Chemical, Tensile, Bend, Flattening, Flaring, IGC Practice E, IGC Practice E with 20X–250X Mag, Hardness, Impact, Macro (Seamless), Micro.
      - Persisted as `processParams.tpi = { vdiWitnessPct, hydroWitnessPct, labTests: [...] }`.
    - *PMI Inspection* dropdown `{ INTERNAL, UNDER_WITNESS, BOTH }` → `processParams.pmi`.
    - *NDT Inspection* multi-select `{ DP, MP, UT, RADIOGRAPHY }` → `processParams.ndt`.
- **Save** writes top-level `has*` flags + full `processParams` JSON. After save, if any `hasLabTesting || (tpi labTests not empty)`: create a draft Lab Letter via existing `/quality/lab-letters/create` pre-filled with selected tests, surface toast "Lab letter draft created — review and send".

### 4.5 Step 3 (cont.) — Allotment wizard (`/sales/[id]/allotment`)

Per-item card becomes a **stepped wizard** (option C selected in brainstorming):

- **Step 1 — Intent:** three large buttons — *Yes — full stock* / *Yes — partial* / *No — procure*. Writes `allotmentIntent` enum.
- **Step 2 — Quantities:** reveals fields based on intent:
  - `STOCK_FULL`: single read-only "From Stock" row equal to ordered qty. Soft-warn banner if available stock < ordered: *"Available: Xm, you've committed to Ym from stock"* with explicit "Proceed anyway" checkbox.
  - `STOCK_PARTIAL`: two editable inputs — From Stock (default = available) and From Procurement (default = balance). Validate `stockQty + procureQty === orderedQty`.
  - `PROCURE`: single read-only "Procurement" row equal to ordered qty.

**On submit:**
- For items with `STOCK_FULL` or `STOCK_PARTIAL` (stockQty > 0): create/extend `WarehouseIntimation` row and dispatch `Alert({ type: 'STOCK_ALLOTMENT', assignedToRole: 'STORES', relatedModule: 'warehouse-intimation', relatedId: <intimationId> })`.
- For items with `STOCK_PARTIAL` or `PROCURE` (procureQty > 0): invoke existing `POST /api/sales-orders/[id]/generate-pr` and dispatch `Alert({ type: 'PROCUREMENT_REQUEST', assignedToRole: 'PURCHASE', relatedModule: 'sales-orders', relatedId: <salesOrderId> })`.

### 4.6 Warehouse — Stock Allotment (`/warehouse/intimation`)

**`page.tsx`** — filter chips include **"Pending for Processing"** as default tab. Filter criterion: intimations with status `PENDING` (§5.1).

**`[id]/prepare/page.tsx`** (per-piece entry, §5.2):
- For each P.O. Item: a **Pieces** table with columns *Length / Make / Heat No. / MTC No. / MTC Date*.
- "Add Piece" button appends rows. Multiple pieces per item; multiple MTC entries per item supported by row multiplicity (§5.2 note).
- MTC No. / MTC Date inputs visually flagged "QA fill" (§5.2 note) but editable by warehouse if pre-known.
- Save writes `WarehouseIntimationItemPiece` rows.

**Generate Inspection Offer** action (§5.3) now pulls from the `pieces` rows. Output template is AWAITING CONFIRMATION — default reuses existing `/api/warehouse/intimation/[id]/generate-inspection-offer` with a new "Pieces" section appended.

### 4.7 Sidebar

No sidebar nav changes. The PRD §1 rename affects the **page title** on `/client-purchase-orders/page.tsx`, not the sidebar entry. (Sidebar label rename is flagged in Open Questions.)

---

## 5. Integrations

### 5.1 FX API — `src/lib/fx/get-rate.ts`

- **Source:** frankfurter.app (free, no key, ECB-backed). Endpoint: `https://api.frankfurter.app/latest?from=USD&to=INR`.
- **Cache:** module-level `Map<string, { rate, fetchedAt }>` keyed by `${from}-${to}-YYYY-MM-DD`. Effectively daily.
- **Public API:**
  ```ts
  export async function getRate(
    from: 'USD' | 'INR',
    to: 'USD' | 'INR'
  ): Promise<{ rate: number; source: 'live' | 'cache' | 'fallback' } | null>
  ```
- **Failure handling:** if API throws, fall back to most-recent cached rate (any date) tagged `source: 'fallback'`. If no cache exists at all, return `null`; the form surfaces an inline error asking the user to enter the rate manually.
- **Called from:** `POST /api/client-purchase-orders` (to seed `exchangeRate` on creation) and the create form `useEffect` (to populate the default field value).

### 5.2 PDF + Email flow

- **New:** `POST /api/po-acceptance/[id]/finalize` (thin orchestrator). Writes wizard final state → calls existing PDF generator → stores path on `POAcceptance.generatedPath` + `pdfGeneratedAt` → returns `{ pdfUrl, suggestedRecipient, suggestedSubject }`.
- **Existing:** `POST /api/po-acceptance/[id]/email` (already wraps nodemailer + writes `POAcceptanceEmailLog` + stamps `emailSentAt` / `emailSentTo`).
- **SMTP:** no changes. Env vars `SMTP_USER`, `SMTP_PASS` already present.

### 5.3 Alert dispatch — `src/lib/notifications/dispatch.ts`

Single helper:
```ts
export async function dispatch(opts: {
  type: AlertType;
  title: string;
  message: string;
  assignedToRole: UserRole;
  relatedModule: string;
  relatedId: string;
  severity?: AlertSeverity;
  companyId: string;
}): Promise<Alert>;
```

Wraps `prisma.alert.create`. No new schema beyond the two new `AlertType` enum values.

### 5.4 Material-code history lookup

- **New:** `GET /api/masters/material-codes/[id]/customer-history?customerId=…`
- **Returns:** `{ lastQuote: { rate, quoteNo, quotedAt } | null, lastPO: { rate, poNo, orderedAt, remark } | null }`
- **Implementation:** two scoped Prisma queries (latest `QuotationItem` and latest `ClientPOItem` for the `customerId` + `materialCodeId` combination, ordered by `createdAt DESC`).

---

## 6. Testing

**Current state:** no test framework in repo. This spec does NOT introduce a full test harness; that's a separate decision. Testing here is **pragmatic** — small targeted unit coverage for pure logic plus a manual test checklist for flows.

### 6.1 Minimal new harness

- Add `vitest` + `@vitest/coverage-v8` for pure-function tests only.
- Run via `npm test`. Test files colocated next to source as `*.test.ts`.

### 6.2 Unit tests (must-have)

| File | Coverage |
|---|---|
| `src/lib/fx/get-rate.test.ts` | live fetch happy path · cache hit · API failure → fallback · no-cache → null |
| `src/lib/calc/po-totals.test.ts` | domestic INR with GST · international USD no GST · international USD with domestic delivery (GST re-enabled) |
| `src/lib/notifications/dispatch.test.ts` | Alert created with correct role + relatedModule for STOCK_ALLOTMENT and PROCUREMENT_REQUEST branches |

### 6.3 Manual test checklist

To run on dev server after each part of the implementation lands. Numbered for traceability.

1. **Customer master** — toggle `isInternational`, save, reload. Verify `defaultCurrency` flips.
2. **Client P.O. — domestic** — pick INR customer. Currency locked INR. GST inputs visible. Domestic Delivery toggle disabled. Add item, verify totals + GST.
3. **Client P.O. — international, foreign delivery** — pick USD customer. Currency locked USD. Exchange rate auto-fills from FX API. GST hidden. Verify USD subtotal + INR-equivalent display.
4. **Client P.O. — international, domestic delivery** — same customer, toggle Domestic Delivery on. Shipment Address textarea appears. GST inputs re-enable. Totals show CGST/SGST.
5. **Material code lookup** — select customer with prior history, pick a material → side panel populates with last quote, last PO, price, remarks. Pick material with no history → "no prior history" empty state.
6. **PO Acceptance wizard** — step 1→2→3, click Back from 3 → state preserved. Submit → Preview Drawer opens with PDF, recipient defaults to customer email, Send button writes EmailLog row.
7. **Order Processing** — open `/sales/[id]/process`. Toggle each process. Select TPI option → §4.5 panel appears. Save → reload → verify `has*` flags + `processParams` JSON persisted.
8. **Allotment wizard** — *Yes — partial* → enter qty split → Submit → verify Alert(STORES) + WarehouseIntimation created. *No — procure* → verify Alert(PURCHASE) + PR generated.
9. **Warehouse pending dashboard** — confirm new intimation appears in "Pending for Processing" tab by default.
10. **Warehouse piece entry** — add 3 pieces with different heat/MTC → save → reload → verify all 3 persist. Generate Inspection Offer → verify pieces feed in (output format AWAITING CONFIRMATION).

### 6.4 Out of scope

- E2E browser tests (Playwright).
- Visual regression for wizard layouts.
- Load testing for the FX cache.

---

## 7. Open questions

### 7.1 From PRD §6 (will appear as "AWAITING CONFIRMATION" in code)

| # | Item | Default applied |
|---|---|---|
| OQ1 | **Currency Toggle placement** when international + domestic delivery (PRD §2.4 / §6.1) | Currency stays USD for invoicing; a derived "GST calculated on INR equivalent at frozen rate" line appears in the totals block |
| OQ2 | **Colour-coding scheme** per item (§4.2 / §6.2) | Placeholder enum `{ RED, GREEN, YELLOW, BLUE, BLACK }`. Migrate to data-driven `/masters/colour-codes` later if needed |
| OQ3 | **Inspection Offer List format** (§5.3 / §6.3) | Reuse existing `/api/warehouse/intimation/[id]/generate-inspection-offer` with new "Pieces" section appended |

### 7.2 Brainstorming judgment calls

| # | Item | Default applied |
|---|---|---|
| OQ4 | **Sidebar label rename** (PRD §1) — sidebar entry currently "Client P.O. Register" | Rename to "Client PO Dashboard" to avoid collision with top-level Dashboard |
| OQ5 | **"Latest" definition** for material-code lookup | `createdAt DESC` (handles backdated entries correctly) |
| OQ6 | **TPI dropdown values** (PRD §4.4 only names one) | `{ NONE, INTERNAL, TPI_CLIENT_QA }` — §4.5 panel reveals only on `TPI_CLIENT_QA` |
| OQ7 | **STOCK_FULL with insufficient stock** | Soft warn with explicit "Proceed anyway" checkbox; logged on the SO |
| OQ8 | **Wizard save behavior** | Auto-save on Next (draft status); explicit Submit on step 3 marks complete |
| OQ9 | **Lab Letter auto-generation** (§4.5 note) | Create draft on Process Save with toast "Lab letter draft created — review and send"; user finalizes manually |

### 7.3 Parked / out of spec

- E2E browser test harness (Playwright).
- Multi-currency beyond USD/INR.
- Customer-facing portal or self-service order tracking.
- Exchange-rate history reporting (only per-PO rate is persisted; no master table).

---

## 8. Acceptance criteria

The implementation is complete when:

1. All 10 items in the manual test checklist (§6.3) pass on the dev server.
2. All three unit test files (§6.2) exist and pass.
3. A demo international customer can be created, used to register a USD P.O. with FX auto-fill, taken through PO Acceptance with PDF preview + email send, processed with at least one outsourced process selected, and routed through partial stock split to both Warehouse and Purchase notifications.
4. A demo domestic customer can be created and a P.O. with GST calculations works end-to-end through Warehouse piece entry.
5. The nine open-question defaults (OQ1–OQ9) are either confirmed or explicitly overridden by the user before code referencing those defaults ships.
6. `prisma migrate dev --name sales-prd-2026-05-23` runs cleanly on a fresh database and seed scripts populate at least one demo international customer.

---

## 9. Implementation order (preview — full plan to be produced by writing-plans skill)

This spec authorizes the work. The implementation order will be detailed in the plan, but the expected sequence is:

1. **Foundation** — `Customer` flag, `Currency` enum, FX lib, totals calc extraction, migration set.
2. **Step 1** — Client P.O. form rewrite, material-code lookup endpoint.
3. **Step 2** — PO Acceptance wizard, charges consolidation, finalize endpoint, Preview Drawer.
4. **Step 3** — Order Processing per-item process selection, allotment wizard, alert dispatch.
5. **Warehouse** — pending dashboard tab, per-piece entry, inspection-offer extension.
6. **Tests + manual verification** — vitest unit tests, walk the §6.3 checklist.

---

*End of design spec.*

---

## Spec Patch Log

- **2026-05-23 (Plan 01)** — Removed proposed `Customer.isInternational` field and `Currency` enum. The existing `CustomerMaster.customerType` (`"DOMESTIC"` / `"INTERNATIONAL"`), `CustomerMaster.defaultCurrency`, and `CurrencyMaster` table already cover the requirement. Customer form UI at `src/app/(dashboard)/masters/customers/create/page.tsx:436-447` already auto-derives currency from customer type. No customer-side schema migration is needed.
