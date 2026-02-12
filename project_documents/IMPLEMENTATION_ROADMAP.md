# NPS ERP Implementation Roadmap
**Last Updated:** February 12, 2026

---

## Current Status: 45% Complete

```
[██████████░░░░░░░░░░░░] 45%

✅ Completed    🟡 In Progress    ❌ Not Started
```

---

## Phase Overview

### ✅ **Phase 1: Foundation & Masters** (COMPLETE)
**Duration:** 4-6 weeks
**Status:** ✅ DONE
**Completion Date:** Feb 11, 2026

**Deliverables:**
- ✅ Database schema (43 tables, Prisma v7)
- ✅ Authentication & RBAC (7 user roles)
- ✅ All master data loaded:
  - Product Spec Master (234 records)
  - Pipe Size Masters (271 records)
  - Inventory Master (36 records with heat nos.)
  - Testing Master (11 tests)
  - Customer & Vendor Masters
- ✅ Document numbering system (Indian FY)
- ✅ UI component library (shadcn/ui)
- ✅ Audit trail infrastructure
- ✅ Dashboard layout & navigation

---

### ✅ **Phase 2: Quotation Management** (70% COMPLETE)
**Duration:** 6-8 weeks
**Status:** 🟡 PARTIAL
**Completion Date:** Feb 11, 2026 (Domestic format only)

**Completed:**
- ✅ Enquiry Registration (ENQ/YY/NNNNN)
- ✅ Enquiry detail page
- ✅ **Domestic Quotation** (NPS/YY/NNNNN)
  - Quotation creation from enquiry
  - Item entry with auto-population (OD, WT, Weight)
  - Offer terms configuration
  - Approval workflow
  - PDF generation (matches template)
  - Email dispatch
- ✅ Quotation versioning (Rev.1, Rev.2...)
- ✅ Quotation list & search

**Remaining Work:**
- ❌ **Export Quotation Format** (Commercial + Technical sheets)
  - Dual-sheet generation
  - Rich-text item descriptions
  - Tag numbers & drawing references
  - Export-specific offer terms & notes
- ❌ **BOM/Project Quotation Format**
  - Component position numbers
  - Drawing references
  - Fabrication tube calculations
  - Total BOM weight calculation

**Estimated Completion:** +1 week for Export & BOM formats

---

### ✅ **Phase 3: Sales & Purchase Management** (COMPLETE)
**Duration:** 6-8 weeks
**Status:** ✅ DONE
**Completion Date:** Feb 11, 2026

**Deliverables:**
- ✅ **Sales Order Module**
  - Customer PO review & verification
  - PO vs Quotation variance detection
  - SO creation (SO/YY/NNNNN)
  - SO detail page
  - **Inventory Reservation (FIFO by heat number)**
  - Shortfall detection
- ✅ **Purchase Requisition**
  - PR creation (PR/YY/NNNNN)
  - Auto-generation from SO shortfall
  - Manual PR creation
  - PR approval workflow
- ✅ **Purchase Order**
  - PO creation (PO/YY/NNNNN)
  - Link to PR & SO (full traceability)
  - Multi-currency support
  - Vendor selection
  - Delivery date tracking
- ✅ **PO Amendment System**
  - Revision control (Rev.2, Rev.3...)
  - Change reason tracking
  - Amendment history
- ✅ **PO Follow-up Dashboard**
  - Overdue PO alerts
  - Upcoming deliveries (14-day window)
  - Days overdue calculation
- ✅ **Vendor Performance Scorecard**
  - On-time delivery %
  - Average delay tracking
  - 100-point performance score
  - ISO 8.4 compliance

---

## 🚧 Remaining Phases (55% of Total Scope)

### ❌ **Phase 4: Inventory & Stores Management** (NOT STARTED)
**Duration:** 6-8 weeks
**Status:** ❌ NOT STARTED
**Priority:** 🔴 **CRITICAL - START IMMEDIATELY**

**Must-Have Features:**

#### **4.1 Goods Receipt Note (GRN)**
- GRN creation against PO (GRN/YY/NNNNN)
- Material details from PO (auto-populated)
- **Heat number entry** (per-pipe or bulk with count)
- Manufacturer/Make entry
- **MTC upload** (PDF attachment)
- MTC number & date entry
- MTC type selection (3.1 / 3.2)
- TPI agency selection & certificate upload
- Initial stock status: "Under Inspection"
- Link to PO & SO for traceability

#### **4.2 Stock Status Workflow**
```
GRN Entry → UNDER_INSPECTION → QC Inspection
                                  ├── ACCEPTED (available for dispatch)
                                  ├── REJECTED (triggers NCR)
                                  └── HOLD (pending tests/approval)
```
- Status update API endpoints
- Partial acceptance support (e.g., 280m accepted, 20m rejected from same heat)
- Auto-update reservation system (only ACCEPTED stock reservable)

#### **4.3 Stock Location Management**
- Warehouse master (Navi Mumbai, Jebel Ali)
- Rack/location assignment per heat number
- Stock movement logging
- Location-wise stock reports

#### **4.4 Stock Issue & Dispatch Preparation**
- Issue slip against SO (only reserved stock)
- Authorization workflow
- Minimum stock level alerts (configurable per product/size)
- Low stock notifications

**Why Critical:**
- Blocks entire downstream flow (QC, Dispatch, Invoice)
- Without GRN, cannot enter heat numbers into system
- Cannot link MTCs to materials
- ISO 8.5.4 compliance not achievable

**Acceptance Criteria:**
- UAT-005 passes: "Receive material → GRN → MTC upload → QC"
- Heat numbers entered via GRN appear in inventory
- Stock status workflow works correctly
- Only ACCEPTED stock can be reserved for new SOs

---

### ❌ **Phase 5: Quality Control & MTC Management** (NOT STARTED)
**Duration:** 6-8 weeks
**Status:** ❌ NOT STARTED
**Priority:** 🔴 **CRITICAL**

**Must-Have Features:**

#### **5.1 Incoming Inspection Module**
- Inspection Report creation (IR/YY/NNNNN)
- Link to GRN (fetch material details)
- Inspection parameters (configurable by material type):
  - **Visual inspection** (Pass/Fail + Remarks)
  - **Dimensional check** (OD, WT, Length vs tolerance)
  - **Chemical analysis** (Element-wise % values)
  - **Mechanical properties** (Yield, Tensile, Elongation)
  - **Hardness test** (HRC/HRB/BHN) - mandatory for NACE
  - **Impact test** (Joules @ temperature) - for LTCS
  - **Flattening test** (Pass/Fail) - for ERW pipes
  - **Flaring test** (Pass/Fail) - for seamless/ERW
  - **Macro test** (Pass/Fail + image upload) - for seamless
  - **Micro test** (Pass/Fail + image upload) - as specified
  - **IGC Practice E** (Pass/Fail) - for SS grades
  - **Bend test** (Pass/Fail) - as specified
- Overall result: PASS / FAIL / HOLD
- Inspector name & date
- Remarks & evidence upload (photos, test reports)

#### **5.2 MTC Repository** (🔴 **HIGHEST PRIORITY**)
- Centralized document storage
- MTC indexing by:
  - Heat Number(s)
  - PO Number
  - GRN Number
  - SO Number(s)
  - Customer(s)
- Search functionality (by any parameter above)
- MTC PDF storage & version control
- **Customer MTC Package Generation:**
  - Select SOs or heat numbers
  - Combine multiple MTCs
  - Generate cover sheet
  - Export as single PDF
- MTC viewer (inline PDF display)

#### **5.3 Non-Conformance Report (NCR)**
- NCR creation (NCR/YY/NNNNN)
- Link to GRN / Heat Number / PO
- Non-conformance type (Dimensional/Chemical/Mechanical/Visual/Documentation)
- Detailed description (rich text)
- Root cause analysis (mandatory for closure)
- Corrective action (what was done)
- Preventive action (steps to prevent recurrence)
- Disposition:
  - Return to Vendor
  - Rework
  - Scrap
  - Use-As-Is (with concession)
- Status workflow: OPEN → UNDER_INVESTIGATION → CLOSED
- Evidence upload (photos, reports)
- CAPA tracking

#### **5.4 Lab Letter Generation**
- Lab letter creation for TPI testing
- Material details (Heat No., Spec, Size)
- Select tests from Testing Master (12 test types):
  - Chemical Analysis
  - Mechanical Test
  - Flattening Test
  - Flaring Test
  - Macro Test for Seamless
  - Micro Test
  - IGC Practice 'E' Test
  - IGC with Magnification
  - Hardness Test
  - Impact Test
  - Bend Test
- Generate formatted PDF for lab
- Email dispatch to lab

**Why Critical:**
- **ISO 8.5.2 (Traceability):** MTC Repository is THE core requirement
- **ISO 8.6 (Release):** Cannot release material without inspection
- **ISO 8.7 (Nonconformance):** NCR module required
- PRD Section 6.3: "Heat Number Traceability is the SINGLE MOST IMPORTANT requirement"
- Without MTC repository, system fails primary purpose

**Acceptance Criteria:**
- UAT-005 passes completely
- UAT-006 passes: "Raise NCR → CAPA closure"
- UAT-009 passes: "Search heat number → see full lifecycle including MTC"
- Can generate customer MTC package for dispatch
- QC inspection updates stock status from UNDER_INSPECTION to ACCEPTED/REJECTED

---

### ❌ **Phase 6: Dispatch, Invoicing & Payment** (NOT STARTED)
**Duration:** 4-6 weeks
**Status:** ❌ NOT STARTED
**Priority:** 🔴 **CRITICAL**

**Must-Have Features:**

#### **6.1 Packing List Generation**
- Packing List creation (PL/YY/NNNNN)
- Link to SO (select items to dispatch)
- **Heat numbers being dispatched** (from reserved stock)
- Piece count per heat
- Bundle details:
  - Bundle number
  - Pieces per bundle
  - Bundle weight
- Gross weight / Net weight (auto-calculated from size master)
- Marking details (paint color, stenciling requirements)
- Packing list PDF generation

#### **6.2 Dispatch Note**
- Dispatch Note creation (DN/YY/NNNNN)
- Link to Packing List
- Vehicle/Container number
- LR (Lorry Receipt) number
- Transporter selection (Transporter Master)
- Dispatch date (actual)
- Destination (from SO → Customer address)
- E-Way Bill number (for domestic GST)
- Dispatch note PDF generation

#### **6.3 Invoice Generation** (🔴 **HIGH PRIORITY**)
- Auto-generate invoice from Dispatch Note
- **Domestic Invoice (INV/YY/NNNNN):**
  - GST calculation (CGST+SGST or IGST based on state)
  - Customer GSTIN validation
  - Item-wise HSN codes
  - Tax breakup table
  - **e-Invoice JSON generation** (for GST portal upload)
- **Export Invoice (EXP/YY/NNNNN):**
  - Currency: USD/EUR/AED
  - Zero GST
  - Shipping terms (FOB/CIF/CFR)
  - Export declaration reference
- **Proforma Invoice** (for advance payment)
- Credit Note & Debit Note generation
- Sequential numbering (no gaps)
- Invoice PDF generation (professional format)
- Email invoice to customer

#### **6.4 Payment Receipt & Outstanding Management**
- Payment Receipt entry (REC/YY/NNNNN)
- Link to Invoice(s)
- Partial payment support
- Payment mode (RTGS/NEFT/Cheque/LC/TT)
- Payment date & reference number
- TDS deduction tracking
- Bank account selection
- Receipt PDF generation

#### **6.5 Customer Outstanding & Ageing**
- Customer-wise outstanding report
- Ageing buckets:
  - 0-30 days
  - 31-60 days
  - 61-90 days
  - 90+ days (overdue)
- Payment history per customer
- Automatic payment reminders (configurable)
- Credit limit tracking & alerts

**Why Critical:**
- Cannot fulfill sales orders without dispatch system
- No revenue recognition without invoicing
- GST compliance required for domestic sales
- Customer satisfaction depends on timely, accurate invoicing

**Acceptance Criteria:**
- UAT-007 passes: "Generate packing list → dispatch → invoice for partial SO"
- Can generate GST-compliant domestic invoice
- Can generate export invoice in USD
- Ageing report shows correct outstanding amounts
- Heat numbers dispatched are marked as DISPATCHED status

---

### ❌ **Phase 7: MIS & Management Dashboards** (15% STARTED)
**Duration:** 4-6 weeks
**Status:** 🟡 PARTIAL (only Vendor Performance done)
**Priority:** 🟡 MEDIUM

**Current Status:**
- ✅ Vendor Performance Scorecard (from Phase 3)
- 🏗️ Basic dashboard page exists
- ❌ All other dashboards missing

**Required Dashboards:**

#### **7.1 Sales Dashboard** (Real-time)
- Enquiry count (today, this week, this month)
- Quotation count (pending approval, approved, sent)
- Quotation success ratio (Won / Total)
- Revenue trend (monthly/quarterly chart)
- Top customers by revenue
- Sales funnel visualization

#### **7.2 Sales vs Target Dashboard**
- Monthly/quarterly target by salesperson
- Actual vs target comparison
- Achievement percentage
- Salesperson ranking
- Trend chart (last 6 months)

#### **7.3 Quotation Analysis Dashboard**
- Pending vs Approved vs Rejected count
- Average response time (Enquiry → Quotation sent)
- Average approval time
- Quotation ageing (days since created)
- Win/loss analysis

#### **7.4 Inventory Dashboard** (Real-time)
- **Total stock value** (by material category)
- Stock ageing:
  - Stock older than 30 days
  - Stock older than 60 days
  - Stock older than 90 days
  - Stock older than 180 days
  - Stock older than 365 days
- **Slow-moving items** (no movement in 90+ days)
- **Heat-wise stock listing** (searchable)
- Stock by location (warehouse/rack)
- Stock by status (Accepted/Reserved/Dispatched)
- Minimum stock level alerts

#### **7.5 NCR & Rejection Analysis**
- NCR count by:
  - Vendor
  - Material type
  - Non-conformance type
- Trend analysis (monthly NCR count)
- Open vs Closed NCRs
- Average NCR closure time
- Rejection percentage by vendor
- CAPA effectiveness tracking

#### **7.6 On-Time Delivery (OTD) Dashboard**
- Dispatch date vs promised date comparison
- OTD percentage (this month, this quarter)
- Late deliveries (days late)
- Customer-wise OTD performance
- Trend chart (last 6 months)

#### **7.7 Management Review Pack** (Quarterly)
- Combined KPIs for ISO 9001 Management Review (Clause 9.3):
  - Customer satisfaction metrics
  - Quality objectives achievement
  - Process performance (OTD, NCR rate)
  - Resource needs
  - Improvement opportunities
  - Management review minutes template
- Exportable as PDF

**Acceptance Criteria:**
- UAT-008 passes: "MIS dashboards show real-time KPIs without manual input"
- All dashboards auto-refresh
- Data accuracy verified against database
- Export to Excel/PDF functionality works

---

## Implementation Timeline

### **Aggressive Timeline (20 weeks / ~5 months)**

```
Week 1-8:   Phase 4 - Inventory & GRN ████████░░░░░░░░░░░░
Week 9-16:  Phase 5 - Quality Control         ████████░░░░░░░░░░░░
Week 17-20: Phase 6 - Dispatch & Invoice              ████░░░░░░░░░░░░░░░░
Week 17-20: Phase 7 - MIS Dashboards (parallel)       ████░░░░░░░░░░░░░░░░
Week 21:    Phase 2 - Export/BOM Quotations (parallel)    █░░░░░░░░░░░░░░░░░
Week 22-24: UAT & Bug Fixes                                ███░░░░░░░░░░░░░
Week 25:    Data Migration & Go-Live                          █
```

### **Conservative Timeline (28 weeks / ~7 months)**

```
Week 1-10:  Phase 4 - Inventory & GRN ██████████░░░░░░░░░░░░░░░░░░
Week 11-20: Phase 5 - Quality Control           ██████████░░░░░░░░░░░░░░░░░░
Week 21-26: Phase 6 - Dispatch & Invoice                  ██████░░░░░░░░░░░░░░░░
Week 23-28: Phase 7 - MIS Dashboards (parallel)             ██████░░░░░░░░░░░░░░
Week 25-26: Phase 2 - Export/BOM Quotations (parallel)        ██░░░░░░░░░░░░░░░░
Week 27-28: UAT & Bug Fixes                                     ██░░░░░░░░░░░░░░
Week 29:    Data Migration & Go-Live                              █
```

---

## Development Team Allocation Recommendation

### **Team Structure:**

| Role | Count | Allocation |
|------|-------|------------|
| **Backend Developer** | 2 | API endpoints, business logic, database operations |
| **Frontend Developer** | 2 | UI/UX, forms, dashboards, PDF generation |
| **Full-Stack Developer** | 1 | Integration, end-to-end testing, deployment |
| **QA/Tester** | 1 | Test case execution, UAT support, bug reporting |
| **DevOps Engineer** | 0.5 | Database management, deployment, backup |
| **Project Manager** | 0.5 | Sprint planning, stakeholder communication |

### **Sprint Breakdown (2-week sprints):**

#### **Sprints 1-4: Phase 4 - Inventory & GRN**
- Sprint 1: GRN creation, heat number entry, MTC upload
- Sprint 2: Stock status workflow, QC approval integration
- Sprint 3: Stock location management, movement logging
- Sprint 4: Stock issue, minimum stock alerts, testing & bug fixes

#### **Sprints 5-8: Phase 5 - Quality Control**
- Sprint 5: Inspection module, parameter entry forms
- Sprint 6: **MTC Repository** (highest priority)
- Sprint 7: NCR module & CAPA workflow
- Sprint 8: Lab letter generation, testing & integration

#### **Sprints 9-11: Phase 6 - Dispatch & Invoice**
- Sprint 9: Packing list & dispatch note
- Sprint 10: Invoice generation (domestic + export), GST logic
- Sprint 11: Payment receipt, outstanding & ageing reports

#### **Sprints 12-13: Phase 7 - MIS Dashboards**
- Sprint 12: Sales, Inventory, NCR dashboards
- Sprint 13: OTD dashboard, Management Review Pack

#### **Sprint 14: Remaining Quotation Formats**
- Export & BOM quotation templates

#### **Sprints 15-16: UAT & Go-Live**
- UAT execution, bug fixes, data migration, training, go-live

---

## Go-Live Readiness Checklist

### **Phase 4 Sign-off:**
- [ ] GRN module tested and approved
- [ ] Heat numbers can be entered and tracked
- [ ] MTCs can be uploaded and linked
- [ ] Stock status workflow works correctly
- [ ] Stock location management functional

### **Phase 5 Sign-off:**
- [ ] Inspection module tested with real data
- [ ] **MTC Repository fully operational** 🔴
- [ ] Heat number → MTC linkage verified
- [ ] Customer MTC package generation works
- [ ] NCR module tested with CAPA workflow
- [ ] Lab letter generation tested

### **Phase 6 Sign-off:**
- [ ] Packing list generation tested
- [ ] Dispatch note generation tested
- [ ] Domestic invoice with GST tested
- [ ] Export invoice tested
- [ ] e-Invoice JSON validated
- [ ] Payment receipt & ageing reports tested

### **Phase 7 Sign-off:**
- [ ] All dashboards show correct data
- [ ] Real-time updates working
- [ ] Export functionality tested
- [ ] Management review pack generated

### **UAT Sign-off:**
- [ ] All 12 UAT test cases pass
- [ ] End-to-end flow tested: Enquiry → Payment
- [ ] Heat number traceability report tested
- [ ] ISO compliance verified

### **Production Readiness:**
- [ ] Data migration complete (all Excel data)
- [ ] Validation report: 100% data accuracy
- [ ] User training complete (all roles)
- [ ] User manuals delivered
- [ ] Admin manual delivered
- [ ] Production environment configured
- [ ] Backup & disaster recovery tested
- [ ] Performance testing complete (50+ concurrent users)
- [ ] Security audit complete

---

## Key Success Metrics

### **At Go-Live:**
- ✅ 100% UAT pass rate (12/12 tests)
- ✅ All 13 ISO 9001 clauses implemented
- ✅ Full end-to-end flow operational
- ✅ Heat number traceability working
- ✅ MTC repository functional
- ✅ All document types generated correctly

### **Post Go-Live (30 days):**
- User adoption rate > 80%
- System uptime > 99%
- Average page load time < 3 seconds
- Zero data loss incidents
- User satisfaction score > 4/5

### **Post Go-Live (90 days):**
- Excel operations fully replaced
- ISO 9001 audit ready
- Management review using system data
- Process efficiency improvements measured

---

## Conclusion

**Current Status:** The foundation is solid (45% complete). The system works well for Enquiry, Quotation (domestic), Sales Orders, and Purchase Orders.

**Critical Path:** GRN → QC/MTC Repository → Dispatch → Invoice. These 4 modules are **mandatory** before go-live.

**Realistic Timeline:** **5-7 months** to production-ready state.

**Recommendation:** Start Phase 4 (Inventory & GRN) immediately. This unblocks all downstream modules and is the highest-priority work.

---

**Document Version:** 1.0
**Prepared By:** Claude Sonnet 4.5
**Date:** February 12, 2026
