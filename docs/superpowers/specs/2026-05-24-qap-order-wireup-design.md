# §7 QAP → Order Wire-up — Design

**Date:** 2026-05-24
**Status:** Approved (brainstorm complete) → writing-plans next
**PRD source:** `ORDER PROCESSING FLOW.docx` §7 (Quality Requirement Definition Module)
**Goal:** Close the §7 gap so per-order Quality Assurance Plan (QAP) data is captured during order processing **and flows into** the downstream Inspection Offer and Warehouse Intimation — instead of living in a disconnected `QualityRequirement` catalog.

---

## Context: the real gap (corrected from the initial audit)

Per-order QAP capture **already mostly exists**. `OrderProcessingItem` (1:1 with `SalesOrderItem`, `schema.prisma:2520-2558`) is filled in via the wizard `ProcessStep` and persisted by `POST /api/sales-orders/[id]/processing`. It already captures: colour-coding + code, `tpiRequired`/`tpiType` (the *kind* of TPI), `labTestingRequired`, `pmiRequired`, `ndtRequired`/`ndtTests`, `vdiRequired`, `hydroTestRequired`, `requiredLabTests`.

The genuine §7 gaps are four PRD fields the per-order record is missing, plus a disconnect downstream:

| PRD §7 field | Current state |
|---|---|
| Colour Coding Required | ✅ present (`OrderProcessingItem.colourCodingRequired`) |
| Testing Required + Test Type | ✅ present (granular: lab/PMI/NDT/VDI/hydro) |
| TPI Agency (dropdown) | ⚠️ only free-text `tpiType`; no FK to `InspectionAgencyMaster` |
| **Inspection Required (Yes/No)** | ❌ missing |
| **Inspection Location (Warehouse/Lab)** | ❌ missing |
| **QAP Document Upload** | ❌ missing |

Separately, the standalone `QualityRequirement` model (which *does* carry `inspectionRequired`, `inspectionLocation`, `tpiAgencyId`, `qapDocumentPath`) has only `companyId` + `tpiAgencyId` FKs — it is **not linked to any order/item**, yet the Inspection Offer criteria PDF reads from it. And the Inspection Offer's `inspectionLocation`/`tpiAgencyId` (`schema.prisma:1558-1564`) are typed manually at creation rather than derived from the order. The allotment route sets **no** inspection/testing flags on `WarehouseIntimationItem`, so the warehouse dashboard's Inspection/Testing columns don't reflect real requirements.

## Decision: "Full wire-up" (chosen over capture-only / repurpose-catalog)

Capture the missing fields **and** wire them downstream end-to-end. Keep the `QualityRequirement` catalog as an optional template (a "load defaults" source), not deleted and not the per-order store.

## Key modeling decision

Inspection *scope* (required / location / agency / QAP doc / proposed date) is **order-level** — one inspection event per PO, and the `InspectionOffer` it feeds is already order-level. Test requirements (hydro, NDT, colour-coding…) stay **per-item** where they already live.

---

## 1. Data model

**Add to `SalesOrder`** (order-level QAP header):
- `qapInspectionRequired Boolean @default(false)`
- `qapInspectionLocation String?` — values `WAREHOUSE` | `LAB`
- `qapTpiAgencyId String?` — FK → `InspectionAgencyMaster`
- `qapDocumentPath String?` — uploaded QAP file path
- `qapProposedInspectionDate DateTime?`
- `qapRemarks String? @db.Text`
- relation + `@@index([qapTpiAgencyId])`

**`OrderProcessingItem`** — unchanged. Per-item tests/colour-coding already complete. Existing `tpiRequired`/`tpiType` stay (they describe what kind of TPI each item needs; the new order-level `qapTpiAgencyId` is which agency performs it).

**`QualityRequirement`** — unchanged schema; repurposed in UI as an optional defaults template.

## 2. UI — `ProcessStep` (wizard Process step)

Add a compact **"Quality / QAP" header panel** above the per-item list:
- Inspection Required toggle → reveals: Inspection Location (Warehouse/Lab select), TPI Agency dropdown (from `InspectionAgencyMaster`), QAP document upload (via existing `/api/upload`), Proposed Inspection Date, Remarks.
- Persisted via the processing endpoint extended to accept order-level QAP fields, or a sibling `PUT /api/sales-orders/[id]/qap`. (Plan chooses the cleaner of the two.)
- Per-item testing form is untouched.

## 3. Downstream wiring

- **Inspection Offer creation** (`POST /api/quality/inspection-offers`): pre-fill `inspectionLocation`, `tpiAgencyId`, `proposedInspectionDate` from the order's QAP header (still user-editable). Offer criteria/items source heat/test data from `OrderProcessingItem`, not the disconnected catalog.
- **Warehouse Intimation** (allotment route, on `WarehouseIntimationItem` create): set `inspectionStatus` = `PENDING` vs `NA` from `qapInspectionRequired`; `testingStatus` = `PENDING` vs `NA` from each item's testing flags. Warehouse dashboard columns become meaningful.

## 4. Migration & testing

- **Migration:** manual MariaDB path (shadow DB blocked on Hostinger shared hosting) — hand-write `prisma/migrations/<ts>_qap_order_header/migration.sql`, run `npx prisma migrate deploy`, `npx prisma generate`, verify with raw `SHOW COLUMNS FROM SalesOrder`.
- **Tests (vitest):** pure mapping helpers — QAP-header → Inspection-Offer prefill, and QAP/item-flags → Warehouse inspection/testing status. Keep helpers pure (no DB) per existing `src/lib` test pattern.
- **Runtime verification:** browser/end-to-end against seeded data remains the known open item (requires a deploy to Hostinger or a safe local DB target); not closeable in the current environment.

## Non-goals

- No change to per-item `OrderProcessingItem` testing fields.
- No deletion of `QualityRequirement` (kept as optional template).
- No change to document numbering, RBAC keys, or unrelated modules.
- Does not address §2/§3/§5 gaps (separate follow-ups).

## Success criteria

1. A user can set Inspection Required + Location + TPI Agency + QAP doc + proposed date on an order in the Process step, and it persists.
2. Creating an Inspection Offer for that order pre-fills location/agency/date from the QAP header.
3. After allotment, Warehouse Intimation items show PENDING (not NA) inspection/testing where the QAP/item flags require it.
4. `tsc --noEmit` clean, `npm run build` clean, vitest green.
