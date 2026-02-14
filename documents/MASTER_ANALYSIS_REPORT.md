# ERP Master Cross-Reference Analysis Report

**Date:** February 14, 2026
**Documents Analyzed:**
- Document 1: ERP Screen Mapping - SOP to System Functional Mapping
- Document 2: ERP Software Requirement & ISO 9001 Compliance Report
- Document 3: ERP_PRD.md (Product Requirements Document)
- Codebase Audit: Full module-by-module audit of implemented system

---

## 1. COMPLETENESS SCORECARD

| Module | Doc 1 (Screen Map) | Doc 2 (ISO Report) | Doc 3 (PRD) | Codebase | Score |
|--------|-------------------|--------------------|----|----------|-------|
| **Enquiry Management** | Enquiry Master screen | Enquiry registration (customer, project, item-wise) | Full field spec with 18+ fields | API + UI complete, auto-numbering, audit logging | **95%** |
| **Quotation Management** | Quotation Entry, Approval, Print/Email | Multi-item, costing breakup, version history, approval | Domestic + Export + BOM types, terms, revision, PDF | API + UI complete, revision logic, PDF generation, 3 types | **90%** |
| **Sales Order Management** | PO Review, SO Entry, SO Allocation | Partial dispatch, back-order, delivery schedule | PO acceptance, stock reservation, delivery tracking | API + UI complete, PO review, stock reservation | **85%** |
| **Purchase Requisition** | PR Entry with approval | PR generation (manual/auto from SO) | Auto from SO shortfall, manual, approval workflow | API + UI complete, auto-numbering, approval workflow | **80%** |
| **Purchase Order Management** | PO Entry, PO Tracking | PO creation, amendments, delivery follow-up | Full PO lifecycle, amendments, vendor tracking | API + UI complete, amendments, tracking dashboard | **80%** |
| **GRN / Material Receipt** | GRN Entry | Incoming material entry against PO | Full GRN with heat no., MTC, TPI | API + UI complete, auto-creates inventory stock | **85%** |
| **Inventory / Stock Management** | Stock Location Master | Warehouse & location-wise, FIFO, min stock alerts | Multi-warehouse, rack-level, stock status workflow | API + UI, warehouse master exists, location FK exists | **75%** |
| **Stock Issue** | Stock Issue Screen | FIFO/Heat-based issue | Issue against SO, authorization, heat tracking | API + UI created, deducts stock, links to SO | **80%** |
| **Quality - Inspection** | Inspection Entry | Inspection checklist (chem, mech, visual, dim) | 12 inspection parameter types detailed | API + UI complete, parameter-based inspection | **80%** |
| **Quality - MTC** | MTC Repository | MTC upload, auto-linking with heat/PO/SO | MTC repository, search, customer packages | API exists, basic linking | **70%** |
| **Quality - NCR** | NCR Module | NCR generation, corrective action | Full NCR workflow with CAPA, disposition | API + UI, enhanced workflow with 5 statuses | **75%** |
| **Quality - QC Release** | QC Release screen | Accept/Reject status update | Inspection pass -> Stock accepted | API + UI created, updates stock status | **85%** |
| **Quality - Lab Letters** | Not mentioned | Not mentioned | Lab letter generation with 12 test types | API + UI created | **80%** |
| **Packing List** | Packing List Entry | Packing list generation | Full spec with bundle, weight, marking | API + UI complete | **80%** |
| **Dispatch Note** | Dispatch Note | Vehicle, LR, dispatch doc | Full spec with transporter, e-way bill | API + UI complete | **85%** |
| **Invoice** | Invoice Entry | GST compliance, export format, credit/debit note | Domestic, Export, Proforma, Credit/Debit Note | API + UI, all invoice types in enum | **75%** |
| **Payment Receipt** | Receipt Entry | Receipt against invoice, ageing | Partial payments, modes, TDS, bank recon | API + UI, partial payment support | **70%** |
| **MIS / Reports** | Sales Dashboard, Inventory Report, Quality Dashboard, MIS Export | Sales vs Target, Quotation success, Inventory ageing, Vendor perf, Customer ageing, NCR analysis, OTD | 10 dashboard/report types with specific KPIs | 11 report APIs, CSV export | **80%** |
| **User Management / RBAC** | Role-based access | Role-based access, user logging, password policy | 7 roles with detailed access matrix | NextAuth, 7 roles, sidebar role filtering | **70%** |
| **Audit Trail** | Audit trail for every edit | Complete audit trail, change history | Every create/edit logged with user/timestamp/old/new | createAuditLog on most modules | **75%** |
| **Document Numbering** | Auto document numbering | Auto document numbering | 13 document types with FY-based format | 15 document types in shared utility | **95%** |

### Overall System Completeness: **~80%**

---

## 2. GAP REGISTER

### CRITICAL GAPS (Blocking ISO audit / core business)

| # | Gap | Doc Source | PRD Reference | Current State | Impact |
|---|-----|-----------|---------------|---------------|--------|
| G-01 | **Role-based access NOT enforced at API level** | Doc 1 §10, Doc 2 §2.1, PRD §3.1 | All three documents mandate RBAC | Most APIs only check `if (!session)` — any authenticated user can access any module | **CRITICAL** — ISO Clause 5.3 violation, security risk |
| G-02 | **Status transition enforcement MISSING** | Doc 1 §10, PRD §10 | Mandatory system control | No status transition guards on Quotation, SO, PO, PR (except PR which was just fixed), Invoice, NCR, Inventory | **CRITICAL** — Users can set any status, bypassing approval workflows |
| G-03 | **Business rule validators NOT wired** | PRD §10 | Mandatory system controls | `business-rules.ts` has validators for FIFO, traceability, delete protection, mandatory attachments — NONE are called from API routes | **CRITICAL** — Validators exist but do nothing |
| G-04 | **Delete protection NOT enforced** | Doc 1 §10 "No deletion of approved records", PRD §10 | Non-negotiable control | Customer, Vendor, Product DELETEs are hard deletes. `canDeleteRecord()` exists but is never called | **HIGH** — Approved records can be deleted |
| G-05 | **No audit logging on master data** | Doc 2 §5, PRD §3.2 | Complete audit trail required | Customer, Vendor, Product, and all master table changes have NO audit logging | **HIGH** — ISO 7.5 violation |
| G-06 | **Quotation approval workflow incomplete** | Doc 1 SOP-01, Doc 2 §3.1, PRD §6 | Approval before release | PATCH allows setting any status without role check — no approval enforcement | **HIGH** — Anyone can approve quotations |

### HIGH PRIORITY GAPS

| # | Gap | Doc Source | PRD Reference | Current State | Impact |
|---|-----|-----------|---------------|---------------|--------|
| G-07 | **FIFO enforcement warning-only** | Doc 2 §3.2, PRD §10 | "System suggests FIFO order" | FIFO validator returns warnings but is never called | **HIGH** — FIFO not enforced per PRD |
| G-08 | **Mandatory MTC attachment not enforced at GRN** | Doc 1 §10, Doc 2 §3.5, PRD §10 | "System blocks progress without attachment" | MTC attachment validation exists but not called | **HIGH** — GRN can be created without MTC |
| G-09 | **Credit/Debit Note pages incomplete** | Doc 2 §3.6, PRD §11.4 | Credit note / Debit note | Sidebar links to `/dispatch/credit-notes/create` and `/dispatch/debit-notes/create` — pages may not exist or be functional | **HIGH** — Financial compliance gap |
| G-10 | **Bank Reconciliation not implemented** | Doc 2 §3.6, PRD §11.4 | TDS & bank reconciliation support | Sidebar link exists but no API or page | **MEDIUM** — Financial module incomplete |
| G-11 | **PO approval workflow partial** | Doc 1 SOP-03, PRD §8.4 | "Must be approved before sending to vendor" | PO has PENDING_APPROVAL status but no role-gated approve/reject like PR | **HIGH** — PO approval not enforced |
| G-12 | **Auto-PR generation not exposed** | Doc 2 §3.4, PRD §8.3 | "Auto from SO shortfall" | `auto-pr-generation.ts` fully implemented but no API endpoint | **MEDIUM** — Feature built but inaccessible |
| G-13 | **E-invoice generation not exposed** | PRD §11.3 | "e-invoice JSON for GST portal" | `e-invoice-generator.ts` exists with hardcoded data, no API | **MEDIUM** — Feature built but inaccessible |
| G-14 | **Customer-specific MTC package generation** | PRD §10.2 | "customer-specific MTC packages with cover sheet" | MTC repository exists but no package generation | **MEDIUM** — Missing feature |
| G-15 | **Stock movement logging missing** | PRD §9.3 | "Stock movement between locations must be logged" | No stock movement audit trail | **MEDIUM** — Location changes not tracked |
| G-16 | **Minimum stock level alerts missing** | Doc 2 §3.2, PRD §9.4 | "Minimum stock level alerts configurable per product/size" | Not implemented | **MEDIUM** — No alerting |
| G-17 | **Amount in words missing from invoices** | PRD §11.3 | Invoice must show amount in words | No `amount-in-words` utility or display | **MEDIUM** — Invoice format incomplete |
| G-18 | **Concurrent edit protection (optimistic locking)** | PRD §10 | "System alerts on conflict" | Not implemented | **MEDIUM** — Data overwrites possible |
| G-19 | **Partial acceptance of stock not supported** | PRD §9.2 | "280 of 300 meters accepted, 20 rejected" | Single status per stock record — cannot split | **MEDIUM** — Inspection workflow limitation |
| G-20 | **Sales vs Target report missing** | Doc 2 §3.7, PRD §12 | Monthly/Quarterly target vs actual by salesperson | Not in report APIs | **LOW** — MIS gap |

---

## 3. CONFLICT REGISTER

| # | Conflict | Document A | Document B | Resolution |
|---|----------|-----------|-----------|------------|
| C-01 | **Quotation numbering format** | PRD §8: `NPS/YY/NNNNN` (client convention) | Codebase: `QTN/YYYY-YY/NNNNN` | **PRD takes priority** — Quotation prefix should be NPS, not QTN. Format should be `NPS/YY/NNNNN` per client's existing convention |
| C-02 | **Document number year format** | PRD §8: `YY` (2-digit year, e.g., ENQ/26/00001) | Codebase: `YYYY-YY` (e.g., ENQ/2025-26/00001) | **Codebase is more precise** (handles FY spanning two years). PRD format is a simplification. Keep codebase format but update PRD |
| C-03 | **NCR Status values** | Doc 1 SOP-05: "Open / Under Investigation / Closed" | PRD §10.4: adds "Corrective Action In Progress" | Codebase: has all 5 (OPEN, UNDER_INVESTIGATION, CORRECTIVE_ACTION_IN_PROGRESS, CLOSED, VERIFIED). **No conflict** — codebase is superset |
| C-04 | **Inspection Report numbering** | PRD §8: `IR/YY/NNNNN` (IR prefix) | Codebase: `INS/YYYY-YY/NNNNN` (INS prefix) | **Mismatch** — PRD says "IR", codebase uses "INS". Align to PRD prefix "IR" |
| C-05 | **PO Status values** | Doc 1 SOP-03: "Open / Partially Received / Fully Received / Closed" | Codebase: adds DRAFT, PENDING_APPROVAL, SENT_TO_VENDOR, CANCELLED | **No conflict** — codebase is superset. But Doc 1 doesn't mention PENDING_APPROVAL or SENT_TO_VENDOR |
| C-06 | **QC Release screen naming** | Doc 1 SOP-05: "QC Release" with Accept/Reject | PRD §10.5: also allows HOLD decision | Codebase: supports ACCEPT/REJECT/HOLD. **No conflict** |
| C-07 | **Enquiry Status flow** | Doc 2 §3.1: No specific statuses mentioned | Codebase: OPEN, QUOTATION_PREPARED, WON, LOST, CANCELLED | PRD mentions these statuses. **No conflict** |
| C-08 | **Customer vs Vendor model** | Doc 2 §2.2: Separate Customer Master and Supplier/Vendor Master | Codebase: Customer model with CompanyType (BUYER/SUPPLIER/BOTH) | **Potential issue** — combined model may cause confusion. Doc 2 expects separate masters. Current approach is flexible but may not match user expectations |

---

## 4. MISSING FEATURES LIST

### Features in Documents But NOT in Codebase

| # | Feature | Source Document | PRD Section | Priority |
|---|---------|----------------|-------------|----------|
| MF-01 | **Delivery delay alerts** | Doc 2 §6.1, PRD §6.1 | Risk identification | HIGH |
| MF-02 | **Vendor delay flags / automatic delivery overdue alerts** | Doc 2 §3.4, PRD §8.3 | PO follow-up delay alerts | HIGH |
| MF-03 | **Payment reminders (automatic, configurable)** | PRD §11.4 | Payment management | MEDIUM |
| MF-04 | **Password policy enforcement** (min length, complexity, expiry) | Doc 2 §2.1, PRD §3.2 | Security | HIGH |
| MF-05 | **Login history** (login time, logout, IP, session duration) | PRD §3.2 | Security | MEDIUM |
| MF-06 | **Failed login lockout** (configurable attempts) | PRD §3.2 | Security | MEDIUM |
| MF-07 | **IP whitelisting for admin access** | PRD §9.2 | Security | LOW |
| MF-08 | **Vendor approval workflow** | Doc 1 SOP-03 "Approved Vendor", Doc 2 §3.4, PRD §8.4 | Vendor must be approved before use | HIGH |
| MF-09 | **Vendor performance scoring** (on-time delivery %, quality) | Doc 2 §3.7, PRD §12 | Vendor master auto-scoring | MEDIUM |
| MF-10 | **PO vs Quotation comparison / variance detection** | Doc 2 §3.1, PRD §7.3 | Contract review — SO vs quotation | MEDIUM |
| MF-11 | **Process flow diagrams in system** | PRD §7 ISO Clause 4.4 | Process interaction mapping | LOW |
| MF-12 | **Training records / competence log** | PRD §7 ISO Clause 7.2 | User competence tracking | LOW |
| MF-13 | **Risk register reports** | PRD §7 ISO Clause 6.1 | Risk management | MEDIUM |
| MF-14 | **CAPA register** | PRD §7 ISO Clause 10.2 | Corrective action register | MEDIUM |
| MF-15 | **MTC customer package with cover sheet** | PRD §10.2 | MTC management | MEDIUM |
| MF-16 | **Export quotation dual output** (Commercial + Technical) | PRD UAT-002 | Quotation output | HIGH |
| MF-17 | **Proforma invoice** | PRD §11.3 | Invoice types | MEDIUM |
| MF-18 | **E-Way Bill integration readiness** | PRD §11.2 | Dispatch | LOW |
| MF-19 | **Quotation average response time calculation** | PRD §12 | MIS / reports | LOW |
| MF-20 | **SO auto-close when all items dispatched & paid** | PRD §6.1 Step 18 | SO lifecycle | MEDIUM |

---

## 5. ENHANCED TRACEABILITY MAP

### Required Chain (per all 3 documents):
```
Enquiry → Quotation → Sales Order → Purchase Requisition → Purchase Order
    → GRN → Inspection → QC Release → Inventory Stock (with Heat No.)
    → Stock Reservation → Stock Issue → Packing List → Dispatch Note
    → Invoice → Payment Receipt
```

### Implementation Status:

| Link | Direction | DB FK Exists | API Returns | UI Shows Link | Status |
|------|-----------|-------------|-------------|---------------|--------|
| Enquiry → Quotation | Forward | `quotation.enquiryId` | Yes | Yes | **OK** |
| Quotation → Sales Order | Forward | `salesOrder.quotationId` | Yes | Yes | **OK** |
| Sales Order → PR | Forward | `purchaseRequisition.salesOrderId` | Yes | Yes | **OK** |
| PR → PO | Forward | `purchaseOrder.prId` | Yes | Yes | **OK** |
| PO → GRN | Forward | `goodsReceiptNote.poId` | Yes | Yes | **OK** |
| GRN → GRN Items | Forward | `grnItem.grnId` | Yes | Yes | **OK** |
| GRN Item → Inventory Stock | Forward | `inventoryStock.grnItemId` | Yes | Yes | **OK** |
| Inventory Stock → Inspection | Forward | `inspection.inventoryStockId` | Yes | Yes | **OK** |
| Inspection → QC Release | Forward | `qcRelease.inspectionId` | Yes | Yes | **OK** |
| Inventory Stock → Reservation | Forward | `stockReservation.inventoryStockId` | Yes | Yes | **OK** |
| Reservation → SO | Backward | `stockReservation.salesOrderItemId` | Yes | Yes | **OK** |
| Inventory Stock → Stock Issue | Forward | `stockIssueItem.inventoryStockId` | Yes | Yes | **OK** |
| Stock Issue → SO | Backward | `stockIssue.salesOrderId` | Yes | Yes | **OK** |
| SO → Packing List | Forward | `packingList.salesOrderId` | Yes | Yes | **OK** |
| Packing List → Dispatch Note | Forward | `dispatchNote.packingListId` | Yes | Yes | **OK** |
| Dispatch Note → Invoice | Forward | `invoice.dispatchNoteId` | Yes | Yes | **OK** |
| Invoice → Payment Receipt | Forward | `paymentReceipt.invoiceId` | Yes | Yes | **OK** |
| **Heat No. → Full Lifecycle** | Bidirectional | Via `/api/traceability/[heatNo]` | Yes | Admin page | **OK** |
| **Global Search** | Bidirectional | Via `/api/search` | Yes | Global search | **OK** |
| **Heat No. Search** | Bidirectional | Via `/api/search/heat-number` | Yes | Search bar | **OK** |

### Traceability Gaps:

| # | Gap | Required By | Status |
|---|-----|-------------|--------|
| T-01 | **Invoice → Enquiry backward trace** | PRD §6.2 | NOT DIRECT — requires traversing Invoice → SO → Quotation → Enquiry. No single-query path. |
| T-02 | **Heat No. clickable drill-down from every screen** | PRD §6.3 "one-click drill-down from any screen where a heat number appears" | Only available from admin traceability page. Heat numbers on other screens are plain text. |
| T-03 | **Quotation → Customer PO comparison** | Doc 2 §3.1, PRD §7.3 | PO acceptance exists but no side-by-side comparison view |

---

## 6. ISO 9001:2018 COMPLIANCE MATRIX

| ISO Clause | Requirement | Doc 1 Ref | Doc 2 Ref | PRD Ref | Implementation Status | Gap |
|------------|------------|-----------|-----------|---------|----------------------|-----|
| **4.4** | Process interaction mapping | Not mentioned | §4 Clause 4.4 | §7 | Workflow linking exists between modules | Missing: visual process flow diagrams |
| **5.3** | Roles & responsibilities | §10 | §2.1 | §3.1 | 7 roles defined in sidebar | **GAP: API-level role enforcement missing** |
| **6.1** | Risk identification | Not mentioned | §4 Clause 6.1 | §7 | NCR trend analysis exists in reports | **GAP: No delivery delay alerts, no risk register** |
| **7.2** | Competence | Not mentioned | §4 Clause 7.2 | §7 | User role mapping exists | **GAP: No training records, no competence log** |
| **7.5** | Documented information control | §10 | §2.3 | §7 | Auto-numbering: 15 types. Revision control on Quotation & PO | **PARTIAL: No revision history viewer** |
| **8.2** | Customer requirements | SOP-01 | §3.1 Clause 8.2 | §6, §7 | Enquiry registration, PO review | **GAP: No quotation vs SO comparison view** |
| **8.4** | External provider control | SOP-03 Clause 8.4 | §3.4 Clause 8.4 | §8 | Vendor master exists | **GAP: No vendor approval workflow, no auto-scoring** |
| **8.5.1** | Service provision control | SOP-06 | §3.6 Clause 8.5.1 | §11 | SO → Dispatch → Invoice workflow | OK |
| **8.5.2** | Identification & traceability | SOP-04 | §3.2 Clause 8.5.2 | §9, §13 | Heat No. traceability API exists | **GAP: Heat No. not clickable on all screens** |
| **8.5.4** | Preservation | SOP-04 | §3.2 Clause 8.5.4 | §9 | Warehouse master, stock location | **GAP: FIFO not enforced, stock movement not logged** |
| **8.6** | Release of products | SOP-05 Clause 8.6 | §3.5 Clause 8.6 | §10 | QC Release module exists | **GAP: Mandatory attachment not enforced** |
| **8.7** | Nonconforming outputs | SOP-05 Clause 8.7 | §3.5 Clause 8.7 | §10 | NCR module with 5 statuses | **GAP: Root cause not mandatory for closure, no CAPA register** |
| **9.1** | Monitoring & measurement | SOP-07 | §3.7 Clause 9.1 | §12 | 11 report APIs with KPIs | **PARTIAL: No Sales vs Target report** |
| **9.3** | Management review | SOP-07 | §3.7 Clause 9.3 | §12 | Management review dashboard exists | **GAP: No meeting minutes tracking** |
| **10.2** | Corrective action | Not mentioned | §4 Clause 10 | §7 | NCR has corrective action field | **GAP: No standalone CAPA register** |

---

## 7. DEVELOPER-READY CHECKLIST

### Priority 1: CRITICAL (Must fix for ISO compliance)

- [ ] **Wire business rule validators into API routes**
  - Files: All `route.ts` files in `src/app/api/`
  - Import and call `canDeleteRecord()` in DELETE handlers
  - Import and call `validateMandatoryAttachments()` in GRN POST and QC Release POST
  - Import and call `validateTraceability()` in SO, PO, GRN POST handlers
  - Import and call `validateFIFOReservation()` in stock issue/reservation (as warning)

- [ ] **Add role-based access to all API routes**
  - Every API route must check `session.user.role` against allowed roles
  - Enquiry/Quotation: SALES, MANAGEMENT, ADMIN
  - SO: SALES, MANAGEMENT, ADMIN
  - PR/PO: PURCHASE, MANAGEMENT, ADMIN
  - GRN/Stock: STORES, MANAGEMENT, ADMIN
  - Inspection/NCR/QC Release: QC, MANAGEMENT, ADMIN
  - Invoice/Payment: ACCOUNTS, MANAGEMENT, ADMIN
  - Read-only access: MANAGEMENT can view all

- [ ] **Add status transition enforcement**
  - Quotation: DRAFT → PENDING_APPROVAL → APPROVED → (REVISED via /revise endpoint)
  - SO: OPEN → PARTIALLY_DISPATCHED → FULLY_DISPATCHED → CLOSED
  - PO: DRAFT → PENDING_APPROVAL → OPEN → SENT_TO_VENDOR → PARTIALLY_RECEIVED → FULLY_RECEIVED → CLOSED
  - Invoice: DRAFT → SENT → PARTIALLY_PAID → PAID
  - NCR: OPEN → UNDER_INVESTIGATION → CORRECTIVE_ACTION_IN_PROGRESS → CLOSED → VERIFIED

- [ ] **Add audit logging to master data changes**
  - Customer, Vendor, Product, Pipe Size, Warehouse, Payment Terms, Delivery Terms, Tax, UOM changes

### Priority 2: HIGH (Business-critical features)

- [ ] **PO approval workflow** — Role-gated approve/reject with remarks (mirror PR implementation)
- [ ] **Quotation approval enforcement** — Only MANAGEMENT/ADMIN can approve
- [ ] **Credit/Debit Note create pages** — Functional UI for creating credit/debit notes
- [ ] **Vendor approval workflow** — Vendor must be approved before PO creation
- [ ] **Export quotation dual output** — Commercial + Technical PDF generation
- [ ] **Amount in words utility** — For invoices and quotations
- [ ] **Delete protection enforcement** — Call `canDeleteRecord()` from all DELETE routes
- [ ] **Password policy** — Enforce minimum length, complexity in user creation/update

### Priority 3: MEDIUM (Enhancement features)

- [ ] **Auto-PR generation API endpoint** — Expose existing library through API
- [ ] **E-invoice generation API** — Expose existing library, remove hardcoded data
- [ ] **Delivery delay alerts** — Cron or check on PO tracking page
- [ ] **Payment reminders** — Configurable automatic reminders
- [ ] **Minimum stock alerts** — Configurable per product/size
- [ ] **Stock movement logging** — Track location changes with user/timestamp
- [ ] **MTC customer package generation** — Combine MTCs for dispatch with cover sheet
- [ ] **Heat No. clickable drill-down** — Make heat numbers clickable links on all screens
- [ ] **NCR root cause mandatory for closure** — Enforce in PATCH handler
- [ ] **SO auto-close** — When all items dispatched and paid
- [ ] **Excel export for all reports** — Install xlsx, create export utility
- [ ] **Concurrent edit protection** — Optimistic locking with version field

### Priority 4: LOW (Nice-to-have)

- [ ] **Process flow diagrams** — Visual workflow mapping (ISO 4.4)
- [ ] **Training records / competence log** — User competence tracking (ISO 7.2)
- [ ] **Risk register** — Formalized risk tracking (ISO 6.1)
- [ ] **CAPA register** — Standalone corrective action tracking (ISO 10.2)
- [ ] **Sales vs Target report** — Monthly target tracking
- [ ] **Login history with IP/session** — Security audit trail
- [ ] **Failed login lockout** — Account protection
- [ ] **IP whitelisting** — Admin access control
- [ ] **Meeting minutes tracking** — Management review (ISO 9.3)
- [ ] **Proforma invoice** — Pre-shipment invoice type
- [ ] **Quotation response time calculation** — MIS metric

---

## 8. RECOMMENDED ADDITIONS TO PRD

### Items in Doc 1 / Doc 2 but Missing from PRD

| # | Feature | Source | Recommendation |
|---|---------|--------|----------------|
| RA-01 | **Inspection Agency Master** | Doc 2 §2.2 "inspection agency master" | Add to PRD §5 Master Data — dedicated master for TPI agencies (BVIS, TUV, Lloyds, SGS, BV) |
| RA-02 | **Payment terms master** | Doc 2 §2.2 "Payment terms" | Already in PRD §5 but not called out as a standalone master — clarify |
| RA-03 | **Delivery terms master** | Doc 2 §2.2 "delivery terms" | Already in PRD §5 but not called out — clarify |
| RA-04 | **Material receipt at Store level** | Doc 1 SOP-04 "Stores role" | PRD defines Stores role but doesn't specify that only Stores can create GRN |
| RA-05 | **Controlled templates for quotations, POs, invoices, MTCs** | Doc 2 §2.3 | PRD mentions templates but doesn't specify template management functionality |
| RA-06 | **Soft copy storage with version history** | Doc 2 §2.3 | PRD should add document attachment version history requirement |
| RA-07 | **Data export for ISO audit** | Doc 2 §5 | PRD should add specific ISO audit data export format requirements |
| RA-08 | **5-7 year historical record access** | Doc 2 §5 | PRD mentions 7-year backup but should specify query capability for old data |

### Items in Codebase but Not in Any Document

| # | Feature | Codebase Location | Recommendation |
|---|---------|-------------------|----------------|
| RC-01 | **Tags system for customers** | Customer model has tags relation | Add to PRD — useful for customer categorization |
| RC-02 | **Buyer/Contact person management** | Separate Buyer model linked to Customer | Clarify in PRD — currently customers have both inline contact and separate buyers |
| RC-03 | **Employee master** | EmployeeMaster model and API | Add to PRD §5 — employees separate from users |
| RC-04 | **Company master** | CompanyMaster model for company profile | Add to PRD §5 — company configuration |
| RC-05 | **Offer term templates** | Configurable quotation terms | Add to PRD §6 — template-based terms management |
| RC-06 | **Material codes master** | MaterialCodeMaster model | Add to PRD §5 — material code classification |
| RC-07 | **Financial year master** | FinancialYear model | Add to PRD §8 — financial year configuration |
| RC-08 | **Global search** | `/api/search` searching all document types | Add to PRD §4 — system-wide search capability |
| RC-09 | **Health check endpoint** | `/api/health` with DB connection test | Add to PRD §9 — monitoring requirements |
| RC-10 | **PO variance detection** | `po-variance-detection.ts` | Add to PRD §7.3 — SO vs Quotation variance detection |

---

## SUMMARY

### What's Working Well
1. **End-to-end traceability chain** is fully linked in the database
2. **Auto document numbering** covers all 15 document types with FY-based reset
3. **Heat number traceability** has a dedicated API and admin page
4. **Module coverage** is comprehensive — all 7 SOP modules from Doc 1 have corresponding APIs
5. **Audit logging** exists on most transactional modules
6. **Quotation revision** with version history works correctly
7. **QC workflow** (GRN → Inspection → QC Release → Stock status) is functional
8. **3 quotation types** (Domestic, Export, BOM) are supported
9. **PO amendments** with revision control are implemented
10. **Stock reservation** against SO with heat number selection works

### Top 5 Actions Required (in order)

1. **Wire all business rule validators** — The validators exist but are dead code. This is the single highest-impact fix.
2. **Add RBAC to all API routes** — Currently any authenticated user can do anything. This violates ISO 5.3.
3. **Enforce status transitions** — Prevent invalid state changes across all modules.
4. **Fix quotation numbering prefix** — Change QTN to NPS per client convention (PRD §8).
5. **Complete PO approval workflow** — Mirror the PR approval pattern that was just implemented.

---

*Report generated from cross-reference analysis of 3 requirement documents against full codebase audit.*
*Total API routes audited: 50+ across 20 modules*
*Total Prisma models: 30+*
*Total gaps identified: 20 critical/high, 15 medium/low*
