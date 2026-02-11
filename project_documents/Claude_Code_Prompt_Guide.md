# Claude Code Prompt — ERP System Build

> **How to use:** Copy the prompt below and paste it into Claude Code along with all the files. You can run it phase-by-phase (recommended) or all at once.

---

## MASTER PROMPT (Phase-by-Phase Approach — Recommended)

### Phase 0: Project Setup & Understanding

```
I'm building a complete ERP system for a piping & tubular trading company (Oil, Gas, Power & Petrochemical industry). I've attached:

1. PRD_ERP_System.md — This is the MASTER REFERENCE. Read it fully before writing any code. It contains every module spec, field definition, master data sample, business rule, process flow, and ISO 9001 compliance requirement.

2. Client's actual Excel files (these contain real master data to seed the database):
   - PRODUCT_SPEC_MASTER_-_1.xlsx (246 product-material combinations)
   - PIPES_SIZE_MASTER_CS___AS_PIPES.xlsx (192 CS/AS pipe sizes with OD/WT/Weight)
   - PIPES_SIZE_MASTER_SS___DS_PIPES.xlsx (81 SS/DS pipe sizes with OD/WT/Weight)
   - INVENTORY_MASTER_-_LATEST.xlsx (55 live inventory records with heat numbers)
   - TESTING_MASTER_FOR_LAB_LETTER.xlsx (12 lab test types)
   - PIPES_QUOTATION_FORMAT.xlsx (Domestic quotation template — RFQ + BOM formats)
   - EXPORT_QUOTATION_FORMAT-1.xlsx (Export quotation — Commercial + Technical sheets)

3. Client's requirement documents:
   - Formal_Srs_frd__Iso_9001_Alignment___Erp_Strategy_Document.docx
   - Erp_Screen_Mapping___Sop_To_System_Functional_Mapping.docx
   - Erp_Software_Requirement___Iso_9001_Compliance_Report.docx

4. Reference PDFs:
   - PIPE_FLOW.pdf (Product hierarchy flowchart)
   - Standard_quotation.pdf (Quotation output sample)

TECH STACK (use exactly this):
- Frontend: Next.js 14+ (App Router) with TypeScript, Tailwind CSS, shadcn/ui components
- Backend: Next.js API Routes + Server Actions
- Database: PostgreSQL with Prisma ORM
- Auth: NextAuth.js with credentials provider (JWT)
- File Storage: Local filesystem (./uploads) for now, S3-ready interface
- PDF Generation: @react-pdf/renderer or Puppeteer
- Email: Nodemailer (SMTP configurable)
- State Management: Zustand for client state, React Query for server state

FIRST TASK — Project Initialization:
1. Initialize a Next.js 14+ project with TypeScript
2. Set up Prisma with PostgreSQL
3. Design and create the COMPLETE database schema covering ALL modules from the PRD:
   - Users & Roles (RBAC)
   - Customer Master
   - Vendor/Supplier Master
   - Product Spec Master (match exact structure from PRD Section 4.1)
   - Pipe Size Master — CS/AS (match PRD Section 4.2.1)
   - Pipe Size Master — SS/DS (match PRD Section 4.2.2)
   - Inventory Master (match exact 18-field structure from PRD Section 4.3.1)
   - Testing Master
   - Tax Master, Currency Master, UOM Master, Payment Terms, Delivery Terms
   - Enquiry + Enquiry Items
   - Quotation + Quotation Items + Quotation Terms + Quotation Versions
   - Sales Order + SO Items + SO Reservations
   - Purchase Requisition + PR Items
   - Purchase Order + PO Items + PO Amendments
   - GRN + GRN Items (with Heat No., MTC fields)
   - Inspection + Inspection Parameters
   - MTC Repository
   - NCR + CAPA
   - Packing List + Items
   - Dispatch Note
   - Invoice + Invoice Items
   - Payment Receipt
   - Audit Log (for every table)
   - Document Number Sequences (for auto-numbering per PRD Section 8)
4. Create seed scripts that import ALL data from the Excel files into the database
5. Set up NextAuth with role-based access (Admin, Sales, Purchase, QC, Stores, Accounts, Management)
6. Create the base layout with sidebar navigation organized by module

Make sure every table has: id, createdAt, updatedAt, createdBy, updatedBy fields for audit trail.
Make sure document numbering follows the format from PRD Section 8 (e.g., NPS/YY/NNNNN for quotations, ENQ/YY/NNNNN for enquiries, etc.).
Make sure the Inventory table tracks stock status: UNDER_INSPECTION, ACCEPTED, REJECTED, HOLD, RESERVED, DISPATCHED.
```

---

### Phase 1: Master Data Module

```
Continue building the ERP. Now build the MASTER DATA module.

Reference: PRD Section 4 (Master Data Architecture)

Build these screens:

1. PRODUCT SPEC MASTER (CRUD)
   - Table view with search/filter by Product Type, Material, Additional Spec
   - The product hierarchy from PRD Section 4.1.1 must be enforced:
     Level 1 (Material Category: CS/SS/AS/DS/LTCS) → Level 2 (PIPE) → Level 3 (SEAMLESS/ERW/EFSW/LSAW) → Level 4 (Standards)
   - Linked dropdowns: selecting Product Type filters available Materials
   - Additional Specs as multi-select tags (NACE MR0175, HIC, IBR, etc. — full list in PRD 4.1.2)
   - End Types: BE, PE, NPTM, BSPT (PRD 4.1.3)
   - Length Ranges: standard options + custom entry (PRD 4.1.4)
   - Pre-seed all 246 records from PRODUCT_SPEC_MASTER_-_1.xlsx

2. PIPE SIZE MASTER (CRUD)
   - Two tabs: CS/AS Pipes (192 records) and SS/DS Pipes (81 records)
   - Fields: Size (text like '1/2" NB X Sch 40'), OD (mm), WT (mm), Weight (kg/m)
   - Auto-calculate weight using formula: (OD - WT) × WT × 0.02466 for CS/AS, × 1.0147 for SS/DS
   - This master is READ-FREQUENTLY — it auto-populates OD/WT/Weight on Quotation, PO, Inventory screens
   - Pre-seed from both Excel files

3. CUSTOMER MASTER (CRUD)
   - Fields: Name, Address, City, State, Country, GST No., Contact Person, Email, Phone, Payment Terms, Currency (INR/USD)
   - Seed with 5 dummy customers

4. VENDOR MASTER (CRUD)
   - Fields: Name, Address, Approved Status (Yes/No), Products Supplied, Avg Lead Time, Performance Score
   - Pre-seed: ISMT, MSL, JSL, USTPL, KF, RATNADEEP (from inventory data)

5. TESTING MASTER (CRUD)
   - 12 test types from TESTING_MASTER_FOR_LAB_LETTER.xlsx
   - Fields: Test Name, Applicable For (tags), Is Mandatory (boolean)

6. OTHER MASTERS: Tax, Currency, UOM, Payment Terms, Delivery Terms, Inspection Agency, Certification Types, Dimensional Standards
   - Pre-seed defaults from PRD Section 4.5

Every master screen must have: search, filter, pagination, export to Excel, audit trail on edit.
Use shadcn/ui DataTable component with column sorting and filtering.
```

---

### Phase 2: Quotation Module

```
Continue building the ERP. Now build the QUOTATION MODULE — this is the most critical module.

Reference: PRD Section 5.1

Build these screens:

1. ENQUIRY MASTER
   - Create/Edit/View/List screens
   - Fields exactly as PRD Section 5.1.1 (Enquiry No auto-generated as ENQ/YY/NNNNN)
   - Line items sub-table for enquiry items
   - Customer dropdown with search (from Customer Master)
   - Status: Open → Quotation Prepared → Won → Lost

2. QUOTATION ENTRY — DOMESTIC/STANDARD FORMAT
   - This must EXACTLY replicate the RFQ sheet from PIPES_QUOTATION_FORMAT.xlsx
   - Header fields per PRD Section 5.1.2 (Quotation No: NPS/YY/NNNNN)
   - Line items with ALL 16 fields from PRD table (S/N, Product, Material, Additional Spec, Size, OD, WT, Length, Ends, Qty, Unit Rate, Amount, Delivery, Remark, Unit Weight, Total Weight)
   - CRITICAL AUTO-CALCULATIONS:
     * When user selects Size → auto-fill OD, WT, Unit Weight from Pipe Size Master
     * Amount = Qty × Unit Rate
     * Total Weight (MT) = Qty × Unit Weight / 1000
     * Grand totals for Qty, Amount, Weight
   - Product → Material → Additional Spec must be LINKED DROPDOWNS from Product Spec Master
   - 15 configurable Offer Terms with defaults from PRD Section 5.1.2 table
   - Validity date auto-calculated (Quotation Date + 6 days, editable)

3. QUOTATION ENTRY — EXPORT FORMAT
   - Replicate EXPORT_QUOTATION_FORMAT-1.xlsx structure
   - Rich-text item description (Material Code, Size, End Type, Material, Tag No., Drawing Ref, Certificate Requirements)
   - COMMERCIAL view: shows pricing
   - TECHNICAL view: replaces all prices with "QUOTED"
   - Currency always USD
   - Include 9 standard notes from PRD Section 13.3 (Appendix C)

4. QUOTATION ENTRY — BOM/PROJECT FORMAT
   - Replicate Solapur_BOM sheet structure from PIPES_QUOTATION_FORMAT.xlsx
   - Component Position numbers, Drawing References
   - Item types: Tube, Pipe, Plate
   - WT Type: MIN (minimum) vs AV (average)
   - Fabrication tubes: individual tube length × tube count = total length
   - Auto weight calculation per line and total BOM weight in MT

5. QUOTATION APPROVAL WORKFLOW
   - Draft → Submit for Approval → Approved / Returned with Remarks
   - Version control: Rev.1, Rev.2, etc.
   - Revision creates new version, old version preserved
   - Only approved quotations can be sent to customer
   - Version comparison view

6. QUOTATION PDF GENERATION
   - Generate professional PDF matching the client's existing templates
   - Company letterhead area (configurable)
   - Formatted item table
   - Offer terms section
   - Footer: "This is a computer generated document hence not signed."
   - "YOUR ORDER WILL BE GREATLY APPRECIATED AND WILL RECEIVE OUR PROMPT AND CAREFUL ATTENTION."
   - Company address in footer

7. QUOTATION EMAIL
   - Send quotation PDF as email attachment directly from system
   - Configurable email body template
   - Log sent emails with timestamp

8. QUOTATION DASHBOARD
   - List of all quotations with status filters
   - Quick stats: Total quotations, Pending approval, Success ratio
   - Search by customer, quotation no., date range
```

---

### Phase 3: Sales Order & Purchase Order Modules

```
Continue building the ERP. Now build SO and PO modules.

Reference: PRD Sections 5.2 and 5.3

BUILD:

1. CUSTOMER PO REVIEW SCREEN (PRD 5.2.1)
   - Upload customer PO document
   - Link to reference quotation
   - Auto-compare PO items vs Quotation items (flag variances in qty/price)
   - Accept / Reject / Hold

2. SALES ORDER ENTRY (PRD 5.2.2)
   - Auto-create from approved quotation + accepted customer PO
   - SO No: SO/YY/NNNNN
   - Line items from quotation (qty editable)
   - Delivery schedule per item
   - SO Status: Open → Partially Dispatched → Fully Dispatched → Closed

3. INVENTORY RESERVATION (PRD 5.2.3) — CRITICAL
   - When SO is created, system suggests matching inventory
   - Match on: Product Type + Material Grade + Size + Additional Specs + End Type
   - Show available heat numbers sorted by FIFO (oldest MTC date first)
   - User selects which heat numbers to reserve
   - Reserved stock marked as "Reserved for SO-XXXXX"
   - Partial reservation triggers Purchase Requisition for balance

4. PURCHASE REQUISITION (PRD 5.3.1)
   - Auto-generated from SO shortfall OR manual creation
   - PR No: PR/YY/NNNNN
   - Link to SO reference
   - Suggest approved vendor from Vendor Master
   - Approval workflow before PO creation

5. PURCHASE ORDER (PRD 5.3.2)
   - PO No: PO/YY/NNNNN
   - Link to PR and SO
   - Full technical specs from Product Spec Master
   - Delivery date tracking
   - PO amendments with revision control (PO Rev.2)
   - PO Status: Open → Partially Received → Fully Received → Closed

6. PO FOLLOW-UP & TRACKING
   - Delivery date vs actual date tracking
   - Overdue alerts (configurable days)
   - Vendor performance auto-scoring
```

---

### Phase 4: Inventory & Quality Control Modules

```
Continue building the ERP. Now build Inventory and QC modules.

Reference: PRD Sections 5.4 and 5.5

BUILD:

1. GRN ENTRY (PRD 5.4.1)
   - GRN No: GRN/YY/NNNNN
   - Must be against a valid PO
   - ALL 15 fields from PRD table including Heat No., MTC No., MTC Date, MTC Type, TPI
   - MTC file upload (PDF)
   - TPI certificate upload
   - Initial status: UNDER_INSPECTION
   - Support multiple heat numbers per GRN

2. INVENTORY SCREEN
   - Real-time stock view with filters: Product, Material, Size, Status, Heat No., Location
   - Stock status badges: Under Inspection (yellow), Accepted (green), Rejected (red), Hold (orange), Reserved (blue), Dispatched (grey)
   - Heat number drill-down: click any heat no. → see full lifecycle (PO → GRN → Inspection → MTC → SO → Dispatch → Invoice)
   - Stock location management (warehouse/rack assignment)
   - Stock movement log

3. STOCK STATUS WORKFLOW
   - Under Inspection → Accepted / Rejected / Hold
   - Only QC role can change status
   - Partial acceptance supported (split heat into accepted/rejected quantities)
   - Rejection auto-triggers NCR creation

4. INCOMING INSPECTION (PRD 5.5.1)
   - All 12 inspection parameters from PRD table
   - Parameter-wise Pass/Fail or numeric value entry
   - Comparison against standard/tolerance values
   - Final verdict: Accept / Reject / Hold
   - Inspection report PDF generation

5. MTC REPOSITORY (PRD 5.5.2)
   - Centralized document store for all Mill Test Certificates
   - Each MTC linked to: Heat No., PO No., GRN No., SO No., Customer
   - Search by any of these parameters
   - Bulk MTC package generation for dispatch (combine multiple MTCs with cover sheet)

6. NCR MODULE (PRD 5.5.3)
   - NCR No: NCR/YY/NNNNN
   - All fields from PRD table
   - Workflow: Open → Under Investigation → Closed
   - Root Cause + Corrective Action + Preventive Action (mandatory for closure)
   - Disposition: Return to Vendor / Rework / Scrap / Use-As-Is
   - Evidence file upload

7. LAB LETTER GENERATION (PRD 5.5.4)
   - Select material (heat no., spec, size)
   - Checkbox selection from 12 test types in Testing Master
   - Generate formatted lab letter PDF
```

---

### Phase 5: Dispatch, Invoice & Payment Modules

```
Continue building the ERP. Now build Dispatch, Invoice, and Payment modules.

Reference: PRD Section 5.6

BUILD:

1. PACKING LIST (PRD 5.6.1)
   - PL No: PL/YY/NNNNN
   - Against valid SO with reserved stock
   - Select specific heat numbers for dispatch
   - Piece count, bundle details
   - Auto-calculate gross/net weight from Size Master
   - Packing list PDF

2. DISPATCH NOTE (PRD 5.6.2)
   - DN No: DN/YY/NNNNN
   - Vehicle no., LR no., Transporter, E-Way Bill
   - Link to packing list and SO
   - On dispatch: update stock status to DISPATCHED, reduce available qty

3. INVOICE GENERATION (PRD 5.6.3)
   - INV/YY/NNNNN (domestic) or EXP/YY/NNNNN (export)
   - Auto-generate from dispatch data
   - Domestic: GST calculation (CGST+SGST or IGST based on state)
   - Export: USD, zero GST
   - Support: Proforma Invoice, Credit Note, Debit Note
   - Invoice PDF generation
   - SO status auto-update on full dispatch

4. PAYMENT RECEIPT (PRD 5.6.4)
   - REC/YY/NNNNN
   - Against specific invoice (partial payment supported)
   - Payment mode: RTGS/NEFT/Cheque/LC/TT
   - TDS deduction tracking
   - Customer outstanding & ageing report (0-30, 31-60, 61-90, 90+ days)
```

---

### Phase 6: MIS & Dashboards

```
Continue building the ERP. Now build the MIS & Dashboard module.

Reference: PRD Section 5.7

BUILD ALL 10 DASHBOARDS from the PRD table:

1. Sales Dashboard — Enquiry count, Quotation count, Success ratio, Revenue trend (charts)
2. Sales vs Target — Monthly/Quarterly target vs actual by salesperson
3. Quotation Analysis — Pending/Approved/Rejected pie chart, Avg response time
4. Inventory Report — Stock value, Heat-wise stock, Available vs Reserved vs Dispatched
5. Inventory Ageing — Stock older than 30/60/90/180/365 days (bar chart)
6. Vendor Performance — On-time delivery %, Quality rejection %, scored table
7. Customer Payment Ageing — Outstanding by customer, ageing buckets
8. NCR & Rejection Analysis — NCR by vendor/material/type, trend line
9. On-Time Delivery — Dispatch vs promised date, OTD percentage gauge
10. Management Review Pack — Combined KPI summary, exportable to PDF

Use Recharts or Chart.js for visualizations.
Each dashboard must have date range filters and export to PDF/Excel.
Management role sees all dashboards. Other roles see only their relevant ones.
```

---

### Phase 7: Final Polish

```
Final phase. Review the entire ERP and add:

1. AUDIT TRAIL VIEWER — Admin screen showing all changes across all tables (user, timestamp, table, field, old value, new value). Filterable by user, date, module.

2. TRACEABILITY VIEWER — Enter any document number or heat number and see the COMPLETE chain:
   Enquiry → Quotation → SO → PO → GRN → Inspection → Heat No. → MTC → Dispatch → Invoice → Payment
   Must work both forward and backward. One-click navigation between linked records.

3. GLOBAL SEARCH — Search across all modules by any document number, heat number, customer name, or material spec.

4. DOCUMENT NUMBERING VERIFICATION — Ensure all 13 document types follow the format from PRD Section 8. No gaps allowed. Financial year April-March.

5. RESPONSIVE DESIGN — All screens must work on tablet (1024px) and desktop (1440px+).

6. ERROR HANDLING — Proper validation messages, loading states, empty states, error boundaries.

7. SEED DATA — Ensure all Excel master data is seeded. Create a demo flow:
   - 1 sample enquiry → quotation → SO → PO → GRN → inspection → dispatch → invoice → payment
   - With real data from the inventory master (use heat no. 3315548, ISMT, C.S. SEAMLESS)

Review against PRD Section 10 (Mandatory System Controls) and PRD Section 11 (UAT Acceptance Criteria) to ensure nothing is missed.
```

---

## ALTERNATIVE: SINGLE MEGA-PROMPT (if you want to give everything at once)

```
Build a complete ERP system based on the attached PRD_ERP_System.md document. This is for a piping & tubular trading company in Oil/Gas/Petrochemical industry. Read the PRD completely — it has every field definition, business rule, master data sample, and process flow.

Tech Stack: Next.js 14+ (App Router, TypeScript), Tailwind + shadcn/ui, PostgreSQL + Prisma, NextAuth.js, Zustand + React Query.

The attached Excel files contain REAL master data — import all of it:
- PRODUCT_SPEC_MASTER (246 records) → Product Spec table
- PIPES_SIZE_MASTER_CS_AS (192 records) → CS/AS Size table
- PIPES_SIZE_MASTER_SS_DS (81 records) → SS/DS Size table
- INVENTORY_MASTER (55 records) → Inventory table with heat numbers
- TESTING_MASTER (12 records) → Testing table
- PIPES_QUOTATION_FORMAT → Domestic quotation PDF template reference
- EXPORT_QUOTATION_FORMAT → Export quotation PDF template reference

Build ALL 7 modules: Quotation (domestic + export + BOM formats), Sales Order, Purchase Order, Inventory & Stores, Quality Control & MTC, Dispatch/Invoice/Payment, MIS Dashboards.

Critical requirements:
- Heat number level traceability end-to-end (PRD Section 6.3)
- Auto document numbering (PRD Section 8)
- FIFO inventory reservation
- Linked dropdowns from Product Spec Master → Size Master
- Auto-calculate OD/WT/Weight when size is selected
- Quotation PDF output matching client templates
- ISO 9001:2018 compliance (audit trail, approval workflows, document control)
- Role-based access for 7 roles

Start with database schema and project setup, then build module by module.
```

---

## TIPS FOR BEST RESULTS WITH CLAUDE CODE

1. **Go phase by phase** — Don't dump everything at once. Phase 0 first, verify it works, then Phase 1, etc.

2. **Always attach the PRD** — Reference it in every prompt as the source of truth.

3. **Attach only relevant Excel files per phase** — Phase 1 (masters) needs the master Excel files. Phase 2 (quotation) needs the quotation format files. Don't overwhelm with all files every time.

4. **Test each phase before moving on** — Run `npm run dev`, verify screens work, data loads correctly.

5. **If Claude Code gets confused, reset context** — Start a new conversation for the next phase but reference what was already built.

6. **For the quotation PDF**, share the Standard_quotation.pdf as a visual reference and say "make the PDF output look like this."

7. **For complex screens**, describe one screen at a time rather than all at once.

8. **Database schema is the foundation** — Spend extra time reviewing the Prisma schema before building screens. A wrong schema is expensive to fix later.
