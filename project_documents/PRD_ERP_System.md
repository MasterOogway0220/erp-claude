# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## ERP System for Oil, Gas, Power & Petrochemical Piping & Tubular Trading Company

**ISO 9001:2018 Compliant | Full Traceability | Heat No. Level Tracking**

| Item | Description |
|------|-------------|
| Document ID | PRD-ERP-NPS-001 |
| Version | 1.0 |
| Date | February 2026 |
| Status | For Development |
| Confidentiality | Internal Use Only |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Context & Problem Statement](#2-business-context--problem-statement)
3. [Stakeholders, User Roles & Access Control](#3-stakeholders-user-roles--access-control)
4. [Master Data Architecture](#4-master-data-architecture)
5. [Module-Wise Functional Requirements](#5-module-wise-functional-requirements)
6. [End-to-End Process Flows](#6-end-to-end-process-flows)
7. [ISO 9001:2018 Compliance Matrix](#7-iso-90012018-compliance-matrix)
8. [Document Numbering Convention](#8-document-numbering-convention)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Mandatory System Controls](#10-mandatory-system-controls-non-negotiable)
11. [UAT Acceptance Criteria](#11-uat-acceptance-criteria)
12. [Implementation Phasing & Deliverables](#12-implementation-phasing--deliverables)
13. [Appendices](#13-appendices)

---

## 1. Executive Summary

This Product Requirements Document defines the complete functional, technical, and compliance specifications for building a bespoke ERP system for a piping and tubular trading company operating in the Oil, Gas, Power and Petrochemical industries. The client currently manages all business operations through Excel spreadsheets and manual processes, including quotation generation, inventory tracking at heat number level, sales orders, purchase orders, quality control with Mill Test Certificates (MTCs), dispatch documentation, invoicing, and management information reporting.

The proposed ERP system will digitize and integrate all these processes into a single platform, ensuring end-to-end traceability from customer enquiry through to payment receipt, full compliance with ISO 9001:2018 Quality Management System requirements, and elimination of all manual registers and spreadsheets. The system must handle the highly specialized nature of industrial piping trade, where every pipe is tracked by heat number, must meet stringent material specifications (ASTM, ASME, API standards), and requires comprehensive documentation including MTCs, third-party inspection certificates, and NACE compliance records.

The scope encompasses 7 core modules: Quotation Management, Inventory Management, Sales Order Management, Purchase Order Management, Quality Control & MTC Management, Dispatch/Invoicing/Payment Management, and MIS & Dashboards. The system must support both domestic (GST-compliant) and export quotation formats, multi-currency pricing (INR, USD), and produce professional documentation matching the company's existing quotation templates.

---

## 2. Business Context & Problem Statement

### 2.1 Company Profile

The client is a Mumbai-based trading company dealing in Stainless Steel, Carbon Steel, Alloy Steel, Duplex Steel, Low-Temperature Carbon Steel (LTCS), Nickel & Copper Alloys, Tubulars, Structurals, Pipe Fittings, Flanges, Valves, Instrumentation, Mechanical & Electrical Components for Oil, Gas, Power & Petrochemical Industries. The company operates from Navi Mumbai, India and Jebel Ali, UAE, serving both domestic and international markets.

### 2.2 Current State (As-Is): Excel-Based Operations

The entire business currently runs on Excel workbooks. Based on analysis of the client's actual operational files, the following critical processes are managed manually:

| Process Area | Current Excel Tool | Key Pain Points |
|---|---|---|
| Product Specification Master | PRODUCT_SPEC_MASTER (246 rows, 5 cols) | No linked dropdowns, manual grade/spec lookup, error-prone entry |
| Pipe Size Master (CS/AS) | PIPES_SIZE_MASTER_CS_AS (192 rows) | Manual weight calculation, no auto-fill for OD/WT/Weight |
| Pipe Size Master (SS/DS) | PIPES_SIZE_MASTER_SS_DS (81 rows) | Separate file from CS master, inconsistent formats |
| Inventory Tracking | INVENTORY_MASTER (55 rows, 18 cols) | Heat number tracking in flat file, no reservation system |
| Domestic Quotations | PIPES_QUOTATION_FORMAT (multi-sheet) | Manual costing, no version control, no approval workflow |
| Export Quotations | EXPORT_QUOTATION_FORMAT (Commercial + Technical) | Dual-sheet format, manual quotation numbering (NPS/25/xxxxx) |
| Project BOMs | Solapur_BOM sheet (56 rows) | Complex multi-material BOMs managed in flat spreadsheets |
| Testing Requirements | TESTING_MASTER (12 test types) | No linkage to material or inspection records |
| Pipe Flow/Product Tree | PIPE_FLOW.pdf (visual flowchart) | Paper-based product categorization, not searchable |

### 2.3 Desired State (To-Be): Integrated ERP

A fully integrated, web-based ERP system that replaces all Excel sheets with interconnected modules, provides real-time visibility across all business functions, enforces ISO 9001:2018 compliance through automated workflows, and generates all business documents (quotations, POs, invoices, packing lists, inspection reports) from within the system with professional formatting matching current templates.

---

## 3. Stakeholders, User Roles & Access Control

### 3.1 User Role Matrix

| Role | ERP Access Scope | Key Permissions | ISO Reference |
|---|---|---|---|
| Admin | Full system configuration | User management, master data, system settings, audit logs | Clause 5.3 |
| Sales | Enquiry, Quotation, Sales Order | Create/edit enquiries, prepare quotations, create SO, view inventory | Clause 8.2 |
| Purchase | PR, PO, Vendor Management | Create PR/PO, manage vendors, track deliveries, PO amendments | Clause 8.4 |
| QC / Quality | Inspection, MTC, NCR | Enter inspection data, upload MTCs, raise NCRs, release material | Clause 8.6, 8.7 |
| Stores | GRN, Stock, Dispatch | Receive material, manage stock locations, issue stock, create packing lists | Clause 8.5.4 |
| Accounts | Invoice, Receipt, Credit/Debit Notes | Generate invoices, record payments, manage ageing, GST compliance | Clause 8.5.1 |
| Management | MIS, Dashboards, Approvals | View all dashboards, approve quotations/POs, management review | Clause 9.1, 9.3 |

### 3.2 Access Control Requirements

The system must implement role-based access control (RBAC) with user-wise activity logging (audit trail), password policy enforcement with minimum complexity rules, login history with IP tracking, session timeout after configurable inactivity period, and two-factor authentication option for admin and management roles. Every screen must enforce role-based visibility: users can only see modules and data relevant to their role. No user except Admin can delete approved/finalized records. All edit operations must maintain a complete audit trail with user ID, timestamp, old value, and new value.

---

## 4. Master Data Architecture

The master data forms the backbone of the ERP system. All master data has been extracted from the client's actual Excel files and must be pre-loaded into the system at go-live. The following subsections define each master entity with its exact fields, data samples, and business rules.

### 4.1 Product Specification Master

**Source:** PRODUCT_SPEC_MASTER_-_1.xlsx (246 records, 5 columns). This master defines every valid combination of Product Type, Material Grade, Additional Specification, End Type, and Length Range that the company trades in. It serves as the backbone for all quotation, inventory, and purchase operations.

#### 4.1.1 Product Hierarchy (from PIPE_FLOW.pdf)

The product taxonomy follows a strict 4-level hierarchy derived from the client's pipe flow chart:

| Level 1: Material Category | Level 2: Pipe Type | Level 3: Manufacturing | Level 4: Standards |
|---|---|---|---|
| C.S. (Carbon Steel) | PIPE | SEAMLESS | ASTM A106, A53, API 5L (GR.B, X42-X65), ASME SA106/SA53 |
| C.S. | PIPE | ERW | ASTM A53, IS:1239, IS:3589 |
| C.S. | PIPE | LSAW/EFSW | ASTM A672 (GR. B60/B65/C60/C65, CL.12-42) |
| A.S. (Alloy Steel) | PIPE | SEAMLESS | ASTM A335 (GR. P1/P5/P9/P11/P22/P91), ASME SA335 |
| A.S. | PIPE | LSAW/EFSW | ASTM A691 (1.25CR/2.25CR/5CR/9CR/91, CL.12-42) |
| S.S. (Stainless Steel) | PIPE | SEAMLESS | ASTM A312/ASME SA312 (TP304/304L/304H/310S/316/316L/321/347) |
| S.S. | PIPE | ERW | ASTM A312/ASME SA312 (same grades as seamless) |
| S.S. | PIPE | EFSW | ASTM A358/ASME SA358 CL.1 (TP304-347H) |
| D.S. (Duplex Steel) | PIPE | SEAMLESS/ERW | ASTM A790/ASME SA790 (S31803/S32205/S32750) |
| L.T.C.S. | PIPE | SEAMLESS | ASTM A333/ASME SA333 (GR. 1/3/6) |
| L.T.C.S. | PIPE | LSAW/EFSW | ASTM A671 (CC60/CC65/CB60/CB65, CL.12-32) |

#### 4.1.2 Additional Specifications (Dropdown Values)

These are the valid additional specification tags extracted from the master data:

- NACE MR0175
- NACE MR0103
- NACE MR0175/MR0103
- H2 SERVICE
- HIC (Hydrogen Induced Cracking)
- GALVANISED
- IBR (Indian Boiler Regulation)
- O2 SERVICE
- AXN1, AXN2, AXN4
- 3LPE COATED
- INTERNAL EPOXY COATED

These must be available as multi-select dropdown values on all relevant screens.

#### 4.1.3 End Types

Valid end types from master: **BE** (Bevelled End), **PE** (Plain End), **NPTM** (NPT Male Threaded), **BSPT** (British Standard Pipe Taper). Default selection should be BE for seamless pipes and PE for ERW pipes.

#### 4.1.4 Length Ranges

Standard length ranges from master: 5.00–7.00 Mtr, 9.00–11.80 Mtr, 9.00–12.00 Mtr, 10.00–12.00 Mtr, Random Length, and custom fixed lengths (e.g., 6 Mtr for fabrication tubes). The system must support both standard range selection and custom length entry.

### 4.2 Pipe Size Master

**Source:** PIPES_SIZE_MASTER_CS___AS_PIPES.xlsx (192 records) and PIPES_SIZE_MASTER_SS___DS_PIPES.xlsx (81 records). These masters define the relationship between nominal pipe size, schedule, outside diameter (OD), wall thickness (WT), and unit weight per meter.

#### 4.2.1 Carbon Steel & Alloy Steel Size Data (Sample)

| Size (NB x Schedule) | OD (mm) | W.T. (mm) | Weight (kg/m) |
|---|---|---|---|
| 1/2" NB X Sch 10 | 21.3 | 2.11 | 0.999 |
| 1/2" NB X Sch 40 | 21.3 | 2.77 | 1.266 |
| 1/2" NB X Sch 80 | 21.3 | 3.73 | 1.616 |
| 1/2" NB X Sch 160 | 21.3 | 4.78 | 1.947 |
| 1" NB X Sch 40 | 33.4 | 3.38 | 2.502 |
| 2" NB X Sch 80 | 48.3 | 5.08 | 5.412 |
| 6" NB X Sch 40 | 168.3 | 7.11 | 28.264 |
| 10" NB X Sch STD | 273.1 | 9.27 | 60.288 |
| 24" NB X Sch 40 | 609.6 | 17.48 | 255.253 |

**Business Rule:** When a user selects a Size on any screen (Quotation, PO, Inventory), the system must auto-populate OD, WT, and Unit Weight from this master. The weight calculation formula is:

> **Unit Weight (kg/m) = (OD − WT) × WT × 0.02466** for CS/AS pipes
> **Unit Weight (kg/m) = (OD − WT) × WT × 0.02466 × 1.0147** for SS/DS pipes (density factor)

#### 4.2.2 Stainless Steel & Duplex Steel Size Data (Sample)

| Size (NB x Schedule) | OD (mm) | W.T. (mm) | Weight (kg/m) |
|---|---|---|---|
| 1/2" NB X Sch 5S | 21.3 | 1.65 | 0.811 |
| 1/2" NB X Sch 10S | 21.3 | 2.11 | 1.013 |
| 1/2" NB X Sch 40S | 21.3 | 2.77 | 1.284 |
| 2" NB X Sch 40S | 60.3 | 3.91 | 5.514 |
| 6" NB X Sch 40S | 168.3 | 7.11 | 28.677 |
| 10" NB X Sch 40S | 273.1 | 9.27 | 61.152 |

### 4.3 Inventory Master

**Source:** INVENTORY_MASTER_-_LATEST.xlsx (55 records, 18 columns). This is the most critical operational master. Every pipe in inventory is tracked at the individual heat number level with full traceability back to the manufacturer and MTC.

#### 4.3.1 Inventory Record Structure

| Field Name | Data Type | Sample Value | Business Rule |
|---|---|---|---|
| Form | Dropdown | PIPE | Product form category |
| Product | Linked Dropdown | C.S. SEAMLESS PIPE | From Product Spec Master |
| Specification | Linked Dropdown | ASTM A106/A53/API 5L GR. B | Multi-spec reference common in trading |
| Additional | Multi-select | NACE MR0175/MR0103 | NACE, HIC, IBR compliance tags |
| Dimension Std | Dropdown | ASME B36.10 | Dimensional standard reference |
| Size | Linked Dropdown | NB X SCH (e.g., 2" NB X SCH 80) | Auto-fetches OD/WT/Weight from Size Master |
| Ends | Dropdown | BE / PE | End type of pipe |
| Length (Mtr.) | Range Text | 5.0-6.5 | Actual random length range of stock |
| Heat No. | Text (Unique Key) | 3315548 / 1806P / A11858 | **Critical:** Primary traceability identifier |
| Make / Manufacturer | Dropdown | ISMT / MSL / JSL / USTPL / KF | Approved vendor/mill name |
| Quantity (Mtr.) | Decimal | 1910.35 | Total meters in stock for this heat |
| Piece | Integer | 326 | Number of individual pipes |
| MTC No. | Text | TV334894 | Mill Test Certificate reference number |
| MTC Date | Date | 28/06/2023 | Date of MTC issuance |
| MTC Type | Dropdown | 3.1 MTC / 3.2 MTC | EN 10204 certification type |
| TPI | Text | BVIS | Third Party Inspection agency name |
| Location | Text | Warehouse / Rack | Physical storage location |
| Notes | Text | Free text | Any additional remarks |

#### 4.3.2 Actual Inventory Data (Sample from Client)

| Product | Size | Heat No. | Make | Qty (Mtr) | Pcs | MTC Type |
|---|---|---|---|---|---|---|
| C.S. SEAMLESS | 0.75" NB X SCH 160 | 3315548 | ISMT | 1,910.35 | 326 | 3.2 MTC |
| C.S. SEAMLESS | 1" NB X SCH 160 | 1806P | ISMT | 683.28 | 117 | 3.2 MTC |
| C.S. SEAMLESS | 2" NB X SCH 80 | 1557P | ISMT | 1,721.20 | 286 | 3.2 MTC |
| C.S. SEAMLESS | 10" NB X SCH STD | 4225560 | ISMT | 367.03 | 61 | 3.2 MTC |
| C.S. SEAMLESS | 12" NB X SCH STD | Y273 | USTPL | 244.28 | 41 | 3.2 MTC |
| C.S. SEAMLESS | 14" NB X SCH STD | Y357 | USTPL | 278.28 | 45 | 3.2 MTC |
| A.S. SEAMLESS | 4" NB X SCH XXS | C00329 | JSL | 65.49 | 11 | 3.1 MTC |
| A.S. SEAMLESS (P9) | 10" NB X SCH XS | 23304077 | RATNADEEP | 12.71 | 2 | N/A |
| A.S. SEAMLESS (P5) | 14" NB X SCH 60 | U20 | MSL | 19.38 | 3 | N/A |

### 4.4 Testing Master

**Source:** TESTING_MASTER_FOR_LAB_LETTER.xlsx (12 test types). This master defines all laboratory tests that may be required for material certification.

| S.No | Test Type | Applicable For |
|---|---|---|
| 1 | Chemical Analysis | All materials |
| 2 | Mechanical Test | All materials |
| 3 | Flattening Test | Welded pipes (ERW, EFSW) |
| 4 | Flaring Test | Seamless & Welded pipes |
| 5 | Macro Test for Seamless | Seamless pipes only |
| 6 | Micro Test | As per customer requirement |
| 7 | IGC Practice 'E' Test | Stainless Steel grades |
| 8 | IGC Practice 'E' Test With 20X-250X Mag. | SS with magnification requirement |
| 9 | Hardness Test | All materials, mandatory for NACE |
| 10 | Impact Test | LTCS, as per customer spec |
| 11 | Bend Test | As per customer requirement |

### 4.5 Other Master Data Entities

| Master Entity | Key Fields | Pre-loaded Data |
|---|---|---|
| Customer Master | Name, Address, Country, Contact, Email, GST No., Payment Terms | To be migrated from existing records |
| Vendor/Supplier Master | Name, Address, Approved Status, Products, Lead Times | ISMT, MSL, JSL, USTPL, KF, RATNADEEP + others |
| Tax Master | GST (5%, 12%, 18%, 28%), IGST, Export (0%) | Indian GST slabs |
| Unit of Measure | Mtr (Meter), Kg, MT (Metric Ton), Nos (Numbers), Pcs | Standard UOM list |
| Currency Master | INR, USD, EUR, AED | With exchange rate management |
| Payment Terms | 100% 30 days, LC, Advance, Custom | Standard terms from quotation templates |
| Delivery Terms | Ex-works Navi Mumbai, Ex-works Jebel Ali, FOB, CIF, CFR | Standard Incoterms |
| Inspection Agency | BVIS, TUV, Lloyds, SGS, BV | Approved TPI agencies |
| Certification Types | EN 10204 3.1, EN 10204 3.2 | Standard MTC types |
| Dimensional Standards | ASME B36.10, ASME B36.19 | Pipe dimension standards |

---

## 5. Module-Wise Functional Requirements

### 5.1 Quotation Management Module

This is the most business-critical module. The client generates two distinct quotation formats: a Domestic/Standard RFQ format and an Export Quotation format, both of which must be replicated precisely in the ERP.

#### 5.1.1 Enquiry Registration

| Field | Type | Source | Mandatory | Notes |
|---|---|---|---|---|
| Enquiry No. | Auto-generated | System | Yes | Format: ENQ/YY/NNNNN |
| Enquiry Date | Date | Auto (today) | Yes | |
| Customer | Dropdown | Customer Master | Yes | With search |
| Buyer Name | Text | Manual | Yes | Contact person |
| Buyer Designation | Text | Manual | No | |
| Buyer Email | Email | Manual | Yes | For quotation dispatch |
| Buyer Contact No. | Phone | Manual | No | |
| Client Inquiry No. | Text | Manual | No | Customer's reference |
| Inquiry Date | Date | Manual | No | Customer's inquiry date |
| Enquiry Mode | Dropdown | EMAIL/PHONE/WALK-IN | Yes | How enquiry was received |
| Project Name | Text | Manual | No | e.g., 2x660MW NTPC Solapur |
| Items | Line Items (sub-table) | Manual + Masters | Yes | See item detail below |

#### 5.1.2 Quotation Preparation — Standard/Domestic Format

**Source Template:** PIPES_QUOTATION_FORMAT.xlsx > RFQ Sheet. The quotation screen must produce output matching this exact format.

**Quotation Header Fields:**

| Field | Source/Logic | Displayed On Output |
|---|---|---|
| Quotation No. | Auto: NPS/YY/NNNNN (e.g., NPS/25/14408) | Yes — top right |
| Quotation Date | Auto (today) or manual | Yes — top right |
| Customer Name & Address | From Enquiry → Customer Master | Yes — top left |
| Country | From Customer Master | Yes — below address |
| Attn. (Buyer Name + Designation) | From Enquiry | Yes |
| Buyer Email & Contact | From Enquiry | Yes |
| Client Inquiry Reference | From Enquiry | Yes |
| Valid Upto Date | Configurable (default: Quotation Date + 6 days) | Yes |
| Prepared By (Contact Name) | Logged-in user | Yes — top right |
| Prepared By Email | From User Master | Yes |

**Quotation Line Item Fields (per the RFQ sheet format):**

| Field | Source/Logic | Auto-calc |
|---|---|---|
| S/N | Auto serial number | |
| Product | Dropdown: C.S. SEAMLESS PIPE, S.S. SEAMLESS PIPE, etc. | |
| Material | Linked Dropdown from Product Spec Master | |
| Additional Spec. | Multi-select from Product Spec Master | |
| Size | Linked Dropdown from Size Master (e.g., 24" NB X Sch 40) | |
| OD (mm) | Auto-filled from Size Master | ✅ |
| W.T. (mm) | Auto-filled from Size Master | ✅ |
| Length (Mtr.) | Text entry (e.g., 9.00 - 11.8) | |
| Ends | Dropdown: BE, PE, NPTM, BSPT | |
| Qty (Mtr.) | Manual entry | |
| Unit Rate (USD/Mtr or INR/Mtr) | Manual entry by Sales | |
| Amount | = Qty × Unit Rate | ✅ |
| Delivery (Ex-works) | Text (e.g., 6-8 Weeks) | |
| Remark/Material Code | Free text | |
| Unit Weight (Kg/Mtr) | Auto from Size Master | ✅ |
| Total Weight (M.Ton) | = Qty × Unit Weight / 1000 | ✅ |

**Offer Terms (Configurable Defaults from Template):**

| # | Term Name | Default Value | Editable |
|---|---|---|---|
| 1 | Price | Ex-work, Navi Mumbai, India/Jebel Ali, UAE | Yes |
| 2 | Delivery | As above, ex-works, after receipt of PO | Yes |
| 3 | Payment | 100% within 30 Days from date of dispatch | Yes |
| 4 | Offer Validity | 6 Days, subject to stock remain unsold | Yes |
| 5 | Packing | Inclusive | Yes |
| 6 | Freight | Extra at actual / To your account | Yes |
| 7 | Insurance | Extra at actual / To your account | Yes |
| 8 | Certification | EN 10204 3.1 | Yes |
| 9 | T/T Charges | To your account, Full Invoice amount to be remitted. No deduction of T/T charges acceptable. | Yes |
| 10 | Third Party Inspection | If any required, all charges Extra At Actual | Yes |
| 11 | Testing Charges | If any required, all charges Extra At Actual | Yes |
| 12 | Material Origin | India/Canada | Yes |
| 13 | Qty. Tolerance | -0 / +1 Random Length | Yes |
| 14 | Dimension Tolerance | As per manufacture | Yes |
| 15 | Part Orders | Subject reconfirm with N-PIPE | Yes |

#### 5.1.3 Export Quotation Format

**Source Template:** EXPORT_QUOTATION_FORMAT-1.xlsx. Export quotations have a dual-sheet structure: a **COMMERCIAL** sheet (with pricing visible) and a **TECHNICAL** sheet (with pricing replaced by "QUOTED" text). Both sheets must be generated simultaneously from the same quotation data.

**Key Differences from Domestic Format:**

The export format uses a detailed item description block instead of tabular columns. Each line item contains multi-line text with Material Code, full pipe description (SIZE, END TYPE, MATERIAL), Tag Number, Drawing Reference, Item Number, and Certificate Requirements all in a single description cell. The system must support rich-text item descriptions with the ability to include tag numbers, drawing references, and specific certification requirements per line item. Currency is always USD. Offer terms include additional notes (9 standard notes about order terms, cancellation policy, quantity tolerance, etc.).

#### 5.1.4 Project/BOM Quotation Format

**Source Template:** PIPES_QUOTATION_FORMAT.xlsx > Solapur_BOM sheet. For large project quotations (e.g., NTPC Solapur 2x660MW), the system must support a BOM-style quotation with:

- Component Position numbers
- Drawing References
- Tube vs Pipe vs Plate item types
- MIN (minimum) vs AV (average) wall thickness types
- Fabrication tubes with individual tube length and tube count
- Loose supply tubes with random length
- Automatic weight calculation per line and total BOM weight in Metric Tons

#### 5.1.5 Quotation Approval Workflow

Draft quotations must be submitted for approval. The approval workflow is: Sales prepares draft → Manager/Management reviews and approves or returns with remarks. Approved quotations get a version stamp (Rev.1, Rev.2, etc.). Any revision after approval creates a new version with full history. Only approved quotations can be issued to the customer. The system must maintain a complete version history with comparison capability between versions.

#### 5.1.6 Quotation Output

The system must generate professional PDF output matching the current templates, with company letterhead, formatted tables, offer terms, and standard footer text:

> *"This is a computer generated document hence not signed."*
>
> *"YOUR ORDER WILL BE GREATLY APPRECIATED AND WILL RECEIVE OUR PROMPT AND CAREFUL ATTENTION."*
>
> *Regd. Address: 1210/1211, Prasad Chambers, Tata Road no. 2, Opera House, Charni Road (E), Mumbai - 400004, India*

Quotations must be emailable directly from the system with PDF attachment and configurable email body template.

---

### 5.2 Sales Order Management Module

#### 5.2.1 Customer PO Verification

| Screen Field | Type | Logic | ISO Control |
|---|---|---|---|
| Customer PO Number | Text | Manual entry | Contract Review (8.2) |
| PO Date | Date | Manual | |
| Reference Quotation | Dropdown | Link to approved quotation | Traceability |
| PO vs Quotation Comparison | Auto | System compares items, qty, price | Variance flagging |
| PO Acceptance Status | Dropdown | Accept / Reject / Hold | Approval required |
| PO Document Upload | File Upload | Attach customer PO PDF | Document control |

#### 5.2.2 Sales Order Entry

| Field | Type | Logic |
|---|---|---|
| SO Number | Auto-generated | Format: SO/YY/NNNNN |
| SO Date | Date | Auto (today) |
| Customer | Auto | From linked Quotation/PO |
| Line Items | From Quotation | All items from approved quotation, qty editable |
| Delivery Schedule | Date per item | Expected delivery date |
| Inventory Reservation | Auto/Manual | Reserve stock by Heat No. against SO (FIFO) |
| SO Status | System | Open / Partially Dispatched / Fully Dispatched / Closed |

#### 5.2.3 Inventory Reservation Logic

When a Sales Order is created, the system must attempt to reserve matching inventory. The reservation must match at the level of: **Product Type + Material Grade + Size + Additional Specs + End Type**. The system should suggest available heat numbers sorted by FIFO (oldest MTC date first). Reserved stock must be marked as "Reserved for SO-XXXXX" and excluded from availability for other SOs. Partial reservation must be supported — the un-reserved balance should trigger a Purchase Requisition.

---

### 5.3 Purchase Order Management Module

#### 5.3.1 Purchase Requisition

| Field | Type | Logic |
|---|---|---|
| PR Number | Auto-generated | Format: PR/YY/NNNNN |
| Source | Auto/Manual | Auto from SO shortfall or Manual |
| SO Reference | Link | Linked to originating SO (if applicable) |
| Items Required | Line Items | Product, Material, Size, Specs, Qty |
| Required By Date | Date | From SO delivery schedule |
| Suggested Vendor | Auto | From Approved Vendor List for this material |
| PR Approval | Workflow | Must be approved before PO creation |

#### 5.3.2 Purchase Order Creation

| Field | Type | Logic |
|---|---|---|
| PO Number | Auto-generated | Format: PO/YY/NNNNN |
| Vendor | Dropdown | From Approved Vendor Master (Clause 8.4) |
| PR Reference | Link | Traceable to PR and SO |
| Technical Specs | From Master | Full spec from Product Spec Master |
| Quantity | Manual | Can be adjusted from PR qty |
| Unit Rate | Manual | Purchase price entry |
| Delivery Date | Date | Expected delivery from vendor |
| Special Requirements | Text | NACE testing, TPI, specific MTC type, etc. |
| PO Status | System | Open / Partially Received / Fully Received / Closed |

#### 5.3.3 PO Amendments & Follow-up

PO amendments must create new revisions (PO/YY/NNNNN Rev.2) with change log. The system must track delivery follow-ups with: expected date vs actual date, automatic delay alerts when delivery is overdue, and vendor performance scoring based on on-time delivery percentage.

---

### 5.4 Inventory & Stores Management Module

#### 5.4.1 Goods Receipt Note (GRN)

| Field | Type | Logic |
|---|---|---|
| GRN Number | Auto-generated | Format: GRN/YY/NNNNN |
| PO Reference | Link | Must be against a valid PO |
| Vendor | Auto | From PO |
| Material Details | From PO | Product, Material, Size, Specs |
| Received Qty (Mtr) | Manual | Actual meters received |
| Pieces | Manual | Number of pipes received |
| Heat No. | Manual (**Critical**) | Per-pipe heat number entry |
| Make/Manufacturer | Manual | Mill name |
| MTC No. | Manual | Mill Test Certificate reference |
| MTC Date | Date | Date on MTC |
| MTC Type | Dropdown | 3.1 MTC / 3.2 MTC |
| MTC Upload | File Upload | Attach scanned MTC PDF |
| TPI Agency | Dropdown | BVIS / TUV / Lloyds / SGS / BV / None |
| TPI Certificate Upload | File Upload | Attach TPI certificate if applicable |
| Initial Status | Auto | Under Inspection |

#### 5.4.2 Stock Status Workflow

Every material batch (heat number) must go through the following status workflow:

```
GRN Entry → Under Inspection → QC Check
                                   ├── Accepted (available for reservation/dispatch)
                                   ├── Rejected (triggers NCR)
                                   └── Hold (pending further tests or customer approval)
```

Only **"Accepted"** stock can be reserved against Sales Orders or dispatched. The system must support partial acceptance (e.g., 280 of 300 meters from a heat accepted, 20 meters rejected).

#### 5.4.3 Stock Location Management

The system must support multi-warehouse, rack-level stock location tracking. Each heat number must have an assigned location. Stock movement between locations must be logged with timestamp and user.

#### 5.4.4 Stock Issue & Dispatch Preparation

Stock issue must be against a valid Sales Order. The system must enforce that only reserved and accepted stock is issued. Issue slip must capture: SO number, heat numbers being dispatched, quantities, and authorization. Minimum stock level alerts must be configurable per product/size combination.

---

### 5.5 Quality Control & MTC Management Module

#### 5.5.1 Incoming Inspection

| Inspection Parameter | Data Entry Type | Applicable For |
|---|---|---|
| Visual Inspection | Pass/Fail + Remarks | All materials |
| Dimensional Check (OD, WT, Length) | Measured values vs tolerance | All pipes |
| Chemical Analysis | Element-wise % values | All materials (from MTC or lab) |
| Mechanical Properties (Yield, Tensile, Elongation) | Numeric values | All materials |
| Hardness Test (HRC/HRB/BHN) | Numeric value | Mandatory for NACE materials |
| Impact Test (Joules at temperature) | Numeric values | LTCS and as specified |
| Flattening Test | Pass/Fail | Welded pipes |
| Flaring Test | Pass/Fail | Seamless & Welded |
| Macro Test | Pass/Fail + Image Upload | Seamless pipes |
| Micro Test | Pass/Fail + Image Upload | As per customer spec |
| IGC Test (Practice E) | Pass/Fail | Stainless Steel |
| Bend Test | Pass/Fail | As per customer spec |

#### 5.5.2 MTC Repository

The MTC Repository is a centralized document management system where every Mill Test Certificate is stored, indexed, and linked. Each MTC must be linked to: Heat Number(s), PO Number, GRN Number, SO Number(s), and Customer(s). The system must support search by any of these parameters. MTC documents must be stored as PDF with version control. The system must support generation of customer-specific MTC packages (combining multiple MTCs for a dispatch) with a cover sheet.

#### 5.5.3 Non-Conformance Report (NCR)

| NCR Field | Type | Logic |
|---|---|---|
| NCR Number | Auto-generated | Format: NCR/YY/NNNNN |
| Material Reference | Link | GRN, Heat No., PO |
| Non-conformance Type | Dropdown | Dimensional / Chemical / Mechanical / Visual / Documentation |
| Description | Rich Text | Detailed description of non-conformance |
| Root Cause | Text | Mandatory for closure |
| Corrective Action | Text | What was done to address |
| Preventive Action | Text | Steps to prevent recurrence |
| Disposition | Dropdown | Return to Vendor / Rework / Scrap / Use-As-Is (with concession) |
| Status | Workflow | Open / Under Investigation / Closed |
| Evidence | File Upload | Photos, test reports, etc. |

#### 5.5.4 Lab Letter Generation

The system must generate lab letters for third-party testing. The lab letter must reference the material details (heat no., specification, size) and list the required tests from the Testing Master. The 12 test types from the testing master (Chemical Analysis, Mechanical Test, Flattening Test, Flaring Test, Macro Test for Seamless, Micro Test, IGC Practice E Test, IGC with Magnification, Hardness Test, Impact Test, Bend Test) must be selectable as checkboxes when generating the letter.

---

### 5.6 Dispatch, Invoicing & Payment Module

#### 5.6.1 Packing List Generation

| Field | Source | Notes |
|---|---|---|
| Packing List No. | Auto-generated | Format: PL/YY/NNNNN |
| SO Reference | Link to SO | Must be against valid SO |
| Items | From SO | Product, Material, Size, Qty |
| Heat Numbers | From Reserved Stock | Specific heat nos. being dispatched |
| Piece Count | Manual/Auto | Number of pipes per heat |
| Bundle Details | Manual | Bundle number, pieces per bundle |
| Gross Weight / Net Weight | Auto-calculated | From size master unit weight × qty |
| Marking Details | Manual | Paint color, stenciling requirements |

#### 5.6.2 Dispatch Note

| Field | Source | Notes |
|---|---|---|
| Dispatch No. | Auto-generated | Format: DN/YY/NNNNN |
| Vehicle No. | Manual | Truck/Container number |
| LR No. (Lorry Receipt) | Manual | Transporter receipt number |
| Transporter | Dropdown | Transporter Master |
| Dispatch Date | Date | Actual dispatch date |
| Destination | From SO | Customer delivery address |
| E-Way Bill No. | Manual | GST E-Way Bill (domestic) |

#### 5.6.3 Invoice Generation

Invoices must be auto-generated from dispatch data. The system must support: domestic invoices with GST (CGST+SGST or IGST based on state), export invoices in USD with zero GST, proforma invoices, credit notes and debit notes, and configurable tax rules from Tax Master. Invoice numbering must be sequential and financial-year based. The system must generate e-invoice JSON for GST portal integration readiness.

#### 5.6.4 Payment Receipt & Outstanding Management

The system must track: payment receipts against specific invoices (with partial payment support), payment mode (RTGS/NEFT/Cheque/LC/TT), customer-wise outstanding reports with ageing analysis (0-30, 31-60, 61-90, 90+ days), TDS deduction tracking, and bank reconciliation support. Automatic payment reminders must be configurable.

---

### 5.7 MIS & Management Dashboard Module

| Dashboard / Report | Key Metrics | ISO Reference | Frequency |
|---|---|---|---|
| Sales Dashboard | Enquiry count, Quotation count, Success ratio, Revenue trend | Clause 9.1 | Real-time |
| Sales vs Target | Monthly/Quarterly target vs actual by salesperson | Clause 9.1 | Monthly |
| Quotation Analysis | Pending vs Approved vs Rejected, Avg response time | Clause 8.2 | Weekly |
| Inventory Report | Stock value, Stock ageing, Slow-moving items, Heat-wise stock | Clause 8.5.4 | Real-time |
| Inventory Ageing | Stock older than 30/60/90/180/365 days | Clause 8.5.4 | Monthly |
| Vendor Performance | On-time delivery %, Quality rejection %, Price competitiveness | Clause 8.4 | Quarterly |
| Customer Payment Ageing | Outstanding by customer, 0-30/31-60/61-90/90+ days | Clause 8.5.1 | Weekly |
| NCR & Rejection Analysis | NCR count by vendor/material/type, Trend analysis | Clause 8.7, 10.2 | Monthly |
| On-Time Delivery (OTD) | Dispatch date vs promised date, OTD percentage | Clause 8.5 | Monthly |
| Management Review Pack | Combined KPIs for ISO management review meeting | Clause 9.3 | Quarterly |

---

## 6. End-to-End Process Flows

### 6.1 Primary Business Flow: Enquiry to Payment

| Step | Process | ERP Screen | Input | Output | Trigger for Next Step |
|---|---|---|---|---|---|
| 1 | Customer Enquiry Received | Enquiry Master | Customer details, items needed | Enquiry No. (ENQ/YY/NNNNN) | Enquiry saved |
| 2 | Check Stock Availability | Inventory Screen | Item specs from enquiry | Availability report | Availability known |
| 3 | Prepare Quotation | Quotation Entry | Cost, margin, availability | Draft Quotation | Submit for approval |
| 4 | Approve Quotation | Quotation Approval | Draft quotation | Approved Quotation (Rev.1) | Approval granted |
| 5 | Send Quotation to Customer | Quotation Print/Email | Approved quotation | PDF emailed to buyer | Email sent |
| 6 | Receive Customer PO | PO Review Screen | Customer PO document | PO Accepted | PO verified vs quotation |
| 7 | Create Sales Order | SO Entry | Accepted PO + Quotation | SO No. (SO/YY/NNNNN) | SO created |
| 8 | Reserve Inventory | SO Allocation | SO items + available stock | Reserved stock by heat no. | Stock reserved |
| 9a | If stock short: Create PR | PR Entry | Shortfall items from SO | PR No. | PR approved |
| 9b | Create Purchase Order | PO Entry | Approved PR + Vendor | PO No. (PO/YY/NNNNN) | PO sent to vendor |
| 10 | Receive Material | GRN Entry | PO ref, material, heat nos | GRN No. | Material received |
| 11 | Quality Inspection | Inspection Entry | GRN material details | Inspection Report | Material accepted/rejected |
| 12 | Upload/Link MTC | MTC Repository | MTC document, heat nos | Linked MTC | MTC stored |
| 13 | Stock Accepted | QC Release | Inspection pass | Stock status: Accepted | Available for dispatch |
| 14 | Generate Packing List | Packing List Entry | SO, reserved heat nos | Packing List | Ready for dispatch |
| 15 | Create Dispatch Note | Dispatch Note | Vehicle, LR, packing list | Dispatch Document | Material dispatched |
| 16 | Generate Invoice | Invoice Entry | Dispatch data, tax rules | Invoice No. | Invoice sent |
| 17 | Receive Payment | Receipt Entry | Payment details | Receipt No. | Payment recorded |
| 18 | Close SO | SO Screen | All items dispatched & paid | SO Status: Closed | End of cycle |

### 6.2 Traceability Chain

The system must maintain **complete bidirectional traceability**. From any single record, a user must be able to navigate the entire chain:

```
Enquiry No. → Quotation No. → SO No. → PO No. → GRN No. → Inspection Report
    → Heat No. → MTC No. → Dispatch Note → Invoice No. → Receipt No.
```

This traceability must work in both **forward** (enquiry to payment) and **backward** (payment to enquiry) directions. This is a mandatory ISO 9001 requirement and a **non-negotiable** system feature.

### 6.3 Heat Number Traceability (Critical)

Heat Number is the primary traceability identifier in the piping industry. For any given heat number, the system must be able to show:

- Which PO it was purchased on
- From which vendor/mill
- The GRN it was received on
- The inspection results
- The linked MTC
- Which SO(s) it is reserved/dispatched against
- Which customer(s) received it
- The invoice numbers

This is the **single most important traceability requirement** and must be available as a one-click drill-down from any screen where a heat number appears.

---

## 7. ISO 9001:2018 Compliance Matrix

The ERP system must serve as the digital Quality Management System (QMS), providing objective evidence of process control for ISO 9001:2018 certification audits.

| ISO Clause | Requirement | ERP Implementation | Objective Evidence |
|---|---|---|---|
| 4.4 | Process interaction mapping | Workflow engine linking all modules | Process flow diagrams in system |
| 5.3 | Roles & responsibilities | RBAC with user role matrix | User access reports |
| 6.1 | Risk identification | Delivery delay alerts, vendor delay flags, NCR trend analysis | Risk register reports |
| 7.2 | Competence | User role mapping, training records | User competence log |
| 7.5 | Documented information control | Auto document numbering, revision control, approval workflows | Document register with versions |
| 8.2 | Customer requirements | Enquiry registration, PO vs Quotation comparison | Enquiry log, Contract review record |
| 8.4 | External provider control | Approved vendor list, vendor performance scoring | Vendor evaluation reports |
| 8.5.1 | Service provision control | SO to dispatch workflow with approvals | Dispatch records, invoice log |
| 8.5.2 | Identification & traceability | Heat No. tracking from receipt to dispatch | Traceability report per heat no. |
| 8.5.4 | Preservation | Stock location management, FIFO enforcement | Stock location reports |
| 8.6 | Release of products | QC inspection with acceptance criteria | Inspection reports |
| 8.7 | Nonconforming outputs | NCR module with disposition tracking | NCR log with corrective actions |
| 9.1 | Monitoring & measurement | MIS dashboards with KPIs | Dashboard exports |
| 9.3 | Management review | Management review report pack generation | Meeting minutes with action items |
| 10.2 | Corrective action | NCR to CAPA workflow | CAPA register |

---

## 8. Document Numbering Convention

| Document Type | Format | Example | Reset Cycle |
|---|---|---|---|
| Enquiry | ENQ/YY/NNNNN | ENQ/26/00001 | Financial Year (April) |
| Quotation | NPS/YY/NNNNN | NPS/25/14408 | Financial Year |
| Sales Order | SO/YY/NNNNN | SO/26/00001 | Financial Year |
| Purchase Requisition | PR/YY/NNNNN | PR/26/00001 | Financial Year |
| Purchase Order | PO/YY/NNNNN | PO/26/00001 | Financial Year |
| GRN | GRN/YY/NNNNN | GRN/26/00001 | Financial Year |
| Inspection Report | IR/YY/NNNNN | IR/26/00001 | Financial Year |
| NCR | NCR/YY/NNNNN | NCR/26/00001 | Financial Year |
| Packing List | PL/YY/NNNNN | PL/26/00001 | Financial Year |
| Dispatch Note | DN/YY/NNNNN | DN/26/00001 | Financial Year |
| Invoice (Domestic) | INV/YY/NNNNN | INV/26/00001 | Financial Year |
| Invoice (Export) | EXP/YY/NNNNN | EXP/26/00001 | Financial Year |
| Receipt | REC/YY/NNNNN | REC/26/00001 | Financial Year |

All document numbers must be auto-generated, sequential, and non-deletable. The system must never allow gaps in numbering sequences. Financial year runs **April to March** (Indian standard). The quotation format NPS/YY/NNNNN is the client's existing convention and must be preserved.

---

## 9. Non-Functional Requirements

### 9.1 Technology Stack Recommendations

| Component | Recommendation | Rationale |
|---|---|---|
| Architecture | Web-based SPA (Single Page Application) | Access from any device, no installation |
| Frontend | React.js / Next.js | Rich UI for complex forms, fast rendering |
| Backend | Node.js (Express/NestJS) or Python (Django/FastAPI) | Robust API layer, good ORM support |
| Database | PostgreSQL | ACID compliance, JSON support, excellent for ERP |
| File Storage | S3-compatible (AWS S3 / MinIO) | MTC PDFs, inspection photos, documents |
| PDF Generation | Puppeteer / WeasyPrint | Professional quotation/invoice PDFs |
| Email Service | SMTP / SendGrid / AWS SES | Quotation dispatch, payment reminders |
| Hosting | Cloud (AWS/Azure) or On-Premise | Per client preference |
| Authentication | JWT + Refresh Tokens | Secure session management |
| Backup | Daily automated + 7-year retention | ISO compliance requirement |

### 9.2 Security Requirements

The system must implement: SSL/TLS encryption for all data in transit, encryption at rest for sensitive data (pricing, customer data), role-based access control at screen, field, and action level, complete audit trail for every create/update/delete operation, password policy (minimum 8 characters, complexity rules, expiry), session management with configurable timeout, IP whitelisting option for admin access, and daily automated backups with disaster recovery plan.

### 9.3 Performance Requirements

- Page load time: under **3 seconds** for any screen
- Search results (inventory, quotation, etc.): within **2 seconds**
- PDF generation (quotation, invoice): within **5 seconds**
- Concurrent users: **50+**
- Database: handle **7+ years** of transactional data without performance degradation
- MIS dashboard: render with real-time data within **5 seconds**

### 9.4 Data Migration Requirements

All existing Excel data must be migrated at go-live:

- Product Spec Master (246 records)
- CS/AS Pipe Size Master (192 records)
- SS/DS Pipe Size Master (81 records)
- Current Inventory (55 records with heat numbers and MTCs)
- Existing customer and vendor data

The development team must provide migration scripts and a validation report confirming **100% data accuracy** post-migration.

---

## 10. Mandatory System Controls (Non-Negotiable)

| Control | Description | Enforcement |
|---|---|---|
| Role-based Access | Every screen/action governed by user role | System-enforced, no bypass |
| Auto Document Numbering | All documents get sequential, auto-generated numbers | No manual number entry allowed |
| Audit Trail | Every create/edit logged with user, timestamp, old/new values | Cannot be disabled |
| No Deletion of Approved Records | Approved quotations, POs, invoices cannot be deleted | Only void/cancel with reason |
| Mandatory Attachments | MTC must be uploaded at GRN, Inspection report at QC release | System blocks progress without attachment |
| Approval Workflows | Quotations, POs above threshold need management approval | Configurable approval rules |
| FIFO Enforcement | Stock issue must follow First-In-First-Out by MTC date | System suggests FIFO order |
| Traceability Enforcement | Every transaction must link to its predecessor | Cannot create SO without Quotation/PO ref |
| Data Integrity | Foreign key constraints, validation rules on all fields | Database-level enforcement |
| Concurrent Edit Protection | Optimistic locking to prevent data overwrites | System alerts on conflict |

---

## 11. UAT Acceptance Criteria

The following end-to-end scenarios must pass during User Acceptance Testing before go-live:

| Test ID | Scenario | Expected Result | Priority |
|---|---|---|---|
| UAT-001 | Create enquiry, prepare quotation, approve, email to customer | Professional PDF generated matching template | Critical |
| UAT-002 | Create export quotation with Commercial + Technical sheets | Dual output with pricing hidden on Technical | Critical |
| UAT-003 | Create SO from approved quotation, auto-reserve inventory | Stock reserved by heat no., FIFO order | Critical |
| UAT-004 | Full cycle: Enquiry to Invoice with heat no. traceability | Every document traceable via heat number | Critical |
| UAT-005 | Receive material, enter GRN, upload MTC, complete inspection | Material in stock as "Accepted" with linked MTC | Critical |
| UAT-006 | Raise NCR for rejected material, complete CAPA cycle | NCR closed with corrective action documented | High |
| UAT-007 | Generate packing list, dispatch note, invoice for partial SO | SO shows partial dispatch, balance open | Critical |
| UAT-008 | MIS dashboard shows real-time KPIs without manual input | All dashboards auto-populated | High |
| UAT-009 | Search any heat number and see full lifecycle | All linked documents visible in one view | Critical |
| UAT-010 | Quotation revision: modify approved quotation, new version created | Rev.2 created, Rev.1 preserved in history | High |
| UAT-011 | BOM quotation for project with multiple materials and drawing refs | BOM output matches Solapur template format | High |
| UAT-012 | Audit trail: verify all edits logged with user and timestamp | Complete change history visible for admins | Critical |

---

## 12. Implementation Phasing & Deliverables

### 12.1 Phase Plan

| Phase | Scope | Duration (Est.) | Key Deliverables |
|---|---|---|---|
| Phase 1: Foundation | Master Data, User Management, Product Hierarchy | 4–6 weeks | All masters loaded, RBAC working, login/audit trail |
| Phase 2: Quotation | Enquiry, Quotation (Domestic + Export + BOM), Approval | 6–8 weeks | Quotation PDF output matching templates |
| Phase 3: Sales & Purchase | SO, PO, PR, Vendor Management | 6–8 weeks | Full SO-PO cycle working |
| Phase 4: Inventory & QC | GRN, Stock Management, Inspection, MTC, NCR | 6–8 weeks | Heat-level tracking, MTC repository |
| Phase 5: Dispatch & Finance | Packing List, Dispatch, Invoice, Payment | 4–6 weeks | End-to-end dispatch-to-payment |
| Phase 6: MIS & Reports | Dashboards, KPIs, Management Review | 4–6 weeks | All dashboards and reports live |
| Phase 7: UAT & Go-Live | Testing, Data Migration, Training, Go-Live | 4–6 weeks | Production system live |

### 12.2 Deliverables from Development Team

| Deliverable | Description | When |
|---|---|---|
| Database Schema | Complete ER diagram and table definitions | Before Phase 2 coding |
| UI/UX Mockups | Wireframes for all screens | Before each phase coding |
| API Documentation | RESTful API specs for all endpoints | With each phase delivery |
| ISO Compliance Mapping | Documented mapping of each ISO clause to system feature | Phase 1 |
| Data Migration Scripts | Scripts to import all Excel master data | Phase 1 |
| Test Cases | Comprehensive test cases for each module | With each phase |
| User Manual | Module-wise user guide with screenshots | Phase 7 |
| Admin Manual | System configuration and maintenance guide | Phase 7 |
| Training Plan | Role-wise training schedule and materials | Phase 7 |
| Source Code & Documentation | Complete source code with inline documentation | Phase 7 |

---

## 13. Appendices

### 13.1 Appendix A: Complete Product Specification Hierarchy

The following is the complete list of product categories, material grades, and associated standards that the system must support. This data is extracted directly from PRODUCT_SPEC_MASTER_-_1.xlsx and PIPE_FLOW.pdf:

**Carbon Steel Seamless Pipes (18 material grades):**
ASTM A106 GR.B, ASTM A53 GR.B, API 5L GR.B PSL-1, API 5L GR.B PSL-2, API 5L GR.BN PSL-1, API 5L GR.BN PSL-2, API 5L GR.X42 PSL-1, API 5L GR.X42 PSL-2, API 5L GR.X52 PSL-1, API 5L GR.X52 PSL-2, API 5L GR.X60 PSL-1, API 5L GR.X60 PSL-2, API 5L GR.X65 PSL-1, API 5L GR.X65 PSL-2, ASME SA106 GR.B, ASME SA53 GR.B.

**Stainless Steel Seamless Pipes (22 material grades):**
ASTM A312 TP304, TP304L, TP304H, TP310S, TP310H, TP316, TP316L, TP316H, TP316Ti, TP317, TP317L, TP321, TP321H, TP347, TP347H, and ASME SA312 equivalents for all grades.

**Alloy Steel Seamless Pipes (14 material grades):**
ASTM A335 GR. P1, P5, P9, P11, P22, P91 Type 1, P91 Type 2, and ASME SA335 equivalents for all grades.

**Duplex Steel Pipes (6 material grades):**
ASTM A790 GR. S31803, S32205, S32750, and ASME SA790 equivalents.

**LTCS Pipes (6 material grades):**
ASTM A333 GR. 1, 3, 6, and ASME SA333 equivalents.

**CS ERW Pipes:** ASTM A53, IS:1239, IS:3589. **SS ERW Pipes:** Same grades as SS Seamless. **DS ERW:** Same grades as DS Seamless.

**CS EFSW/LSAW Pipes (24 material grades):** ASTM A672 B60/B65/C60/C65 in CL.12/22/32/42, and ASME SA672 equivalents.

**SS EFSW Pipes (30 material grades):** ASTM A358 CL.1 TP304 through TP347H, and ASME SA358 equivalents.

**AS EFSW/LSAW Pipes (40 material grades):** ASTM A691 1.25CR/2.25CR/5CR/9CR/91 in CL.12/22/32/42, and ASME SA691 equivalents.

**LTCS EFSW/LSAW Pipes (24 material grades):** ASTM A671 CC60/CC65/CB60/CB65 in CL.12/22/32, and ASME SA671 equivalents.

### 13.2 Appendix B: Approved Manufacturer List (from Inventory Data)

Current manufacturers found in inventory records: **ISMT** (Indian Seamless Metal Tubes), **MSL** (Maharashtra Seamless Ltd.), **JSL** (Jindal Stainless Ltd.), **USTPL**, **KF**, **RATNADEEP**. The Vendor Master must be pre-populated with these manufacturers and support addition of new approved vendors through an approval process.

### 13.3 Appendix C: Quotation Notes (for Export Format)

The following 9 standard notes must appear on every export quotation (configurable for editing):

1. Prices are subject to review if items are deleted or if quantities are changed.
2. This quotation is subject to confirmation at the time of order placement.
3. Invoicing shall be based on the actual quantity supplied at the agreed unit rate.
4. Shipping date will be calculated based on the number of business days after receipt of the techno-commercial Purchase Order (PO).
5. Supply shall be made as close as possible to the requested quantity in the fixed lengths indicated.
6. Once an order is placed, it cannot be cancelled under any circumstances.
7. The quoted specification complies with the standard practice of the specification, without supplementary requirements (unless otherwise specifically stated in the offer).
8. Reduction in quantity after placement of order will not be accepted. Any increase in quantity will be subject to our acceptance.
9. In case of any changes in Government duties, taxes, or policies, the rates are liable to revision.

### 13.4 Appendix D: Source Documents Reference

| Document | Content | Used For |
|---|---|---|
| PRODUCT_SPEC_MASTER_-_1.xlsx | 246 product-material combinations | Product Master seeding |
| PIPES_SIZE_MASTER_CS___AS_PIPES.xlsx | 192 CS/AS pipe size records | Size Master (CS/AS) |
| PIPES_SIZE_MASTER_SS___DS_PIPES.xlsx | 81 SS/DS pipe size records | Size Master (SS/DS) |
| INVENTORY_MASTER_-_LATEST.xlsx | 55 inventory records with heat nos | Initial inventory load |
| PIPES_QUOTATION_FORMAT.xlsx | Domestic quotation template (RFQ + BOM) | Quotation output format |
| EXPORT_QUOTATION_FORMAT-1.xlsx | Export quotation (Commercial + Technical) | Export quotation format |
| TESTING_MASTER_FOR_LAB_LETTER.xlsx | 12 laboratory test types | Testing Master seeding |
| PIPE_FLOW.pdf | Product hierarchy flowchart | Product taxonomy design |
| Standard_quotation.pdf | Standard quotation output sample | PDF layout reference |
| Formal_SRS_FRD_ISO_9001_Alignment.docx | SRS/FRD with ISO mapping | Requirements baseline |
| ERP_Screen_Mapping_SOP.docx | SOP to ERP screen mapping | Screen design reference |
| ERP_Software_Requirement_ISO_9001.docx | Detailed module requirements | Functional requirements |

---

**— END OF DOCUMENT —**

*This PRD must be used by the development team as the definitive reference for building the ERP system.*
