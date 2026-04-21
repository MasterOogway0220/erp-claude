# Product Requirements Document
## NPS ERP — Steel Industry Enterprise Resource Planning System

**Version:** 1.0  
**Date:** April 2026  
**Status:** Active Development

---

## 1. Product Overview

NPS ERP is a full-stack, web-based ERP system built for steel pipe, fitting, and flange manufacturers and traders. It covers the complete order-to-cash and procure-to-pay business cycle in a single, role-gated application supporting multiple companies under one deployment.

The name "NPS" references Nominal Pipe Size — the standard measurement system used across the steel piping industry.

---

## 2. Goals

- Replace fragmented spreadsheet and paper-based workflows with a single unified system
- Provide end-to-end traceability from quotation through dispatch and payment
- Enforce role-based access so each department sees only what it needs
- Support multi-company operation (group of companies, subsidiaries)
- Generate compliant documents: GST e-invoices, MTC certificates, dispatch dossiers, quotation PDFs

---

## 3. Users & Roles

| Role | Department | Access Scope |
|---|---|---|
| SUPER_ADMIN | IT / Owner | Full system, all companies, admin panel |
| ADMIN | Administration | Full access within company |
| SALES | Sales / Marketing | Quotations, sales orders, CRM data |
| PURCHASE | Procurement | Requisitions, RFQ, PO, vendor management |
| QC | Quality Control | Inspections, MTC, NCR, lab reports |
| STORES | Warehouse | GRN, stock management, stock issue |
| ACCOUNTS | Finance | Invoices, payments, bank reconciliation |
| MANAGEMENT | Senior Management | Reports, dashboards, read-only across modules |

---

## 4. Module Specifications

### 4.1 Masters (Reference Data)

Central configuration tables that drive all transactional modules.

| Master | Key Fields |
|---|---|
| Company | Name, address, GST, CIN, logo, bank details |
| Customer | Name, GST, industry segment, contacts, payment terms |
| Buyer Contact | Sub-contacts per customer (name, email, designation) |
| Vendor | Name, GST, category, performance rating |
| Employee | Name, department, module access, linked login account |
| Department | Name, active/inactive |
| Product (Pipes) | Type, grade, OD, WT, schedule, standard, weight/mtr |
| Sizes | NPS, OD, wall thickness, weight per metre |
| Fittings | Type, end type, size range, material grade |
| Flanges | Type, class, facing, size range |
| Item / Material Code | Internal code, client code, description, grade, size, unit, rate |
| Warehouse | Name, address, locations (rack/bin) |
| Payment Terms | Label, days, conditions |
| Delivery Terms | Label (Ex-Works, FOR, CIF, etc.) |
| Tax | GST rate, HSN code |
| Unit of Measure | Code (MTR, KG, NOS, SET…) |
| Lengths | Standard pipe lengths |
| Industry Segments | Sector classification for customers |
| Inspection Agencies | TPI agency name, contact |
| Testing Types | Test name (Hydro, PMI, UT…) |
| Offer Terms | Default quotation terms (Domestic / Export) |
| Terms & Conditions | Payment, delivery, tax, inspection T&C templates |
| Additional Specs | Dimensional standards, special requirements |

---

### 4.2 Quotation

**Purpose:** Create, revise, and send price quotations to customers.

**Key Features:**
- Separate flows for Standard and Non-Standard quotations
- Auto-generated quotation number per financial year
- Line items: product, size, grade, quantity, unit, rate, amount
- Material Code linkage on each line item
- Multi-revision support with change snapshot tracking
- Approval chain: Prepared By → Deal Owner → Approved By
- Copy from previous quotation
- Rate revision without creating a new document
- Domestic and Export quotation types (different T&C sets)
- PDF generation and email dispatch (with log)
- Offer terms auto-populated from master defaults

---

### 4.3 Sales

**Purpose:** Manage confirmed orders from quotation acceptance through dispatch readiness.

**Key Features:**
- Sales Order creation from accepted quotation
- Client Purchase Order (CPO) registration and linking
- PO Acceptance workflow
- PO Tracking dashboard (status, pending qty, delivered qty)
- Warehouse Intimation / Material Planning Request (MPR) generation
- Stock reservation against orders
- Sales dashboard with key metrics

---

### 4.4 Purchase

**Purpose:** Procure materials from vendors with full approval and comparison workflow.

**Key Features:**
- Purchase Requisition with department-level approval
- RFQ (Request for Quotation) dispatch to multiple vendors
- Supplier Quotation entry per vendor
- Comparative Statement — side-by-side vendor price comparison, winner selection
- Purchase Order generation with line items and delivery schedule
- PO Amendment tracking with variance log
- Delivery follow-up register
- Purchase dashboard

---

### 4.5 Inventory

**Purpose:** Track physical stock from goods receipt through issue.

**Key Features:**
- GRN (Goods Receipt Note) against Purchase Order
- Heat number entry and tracking per lot
- Stock ledger by warehouse, location, grade, and size
- Stock Issue against Sales Order / Warehouse Intimation
- Heat Lifecycle view — full traceability from receipt to dispatch
- Warehouse location management (rack/bin level)

---

### 4.6 Quality

**Purpose:** Manage the complete quality assurance workflow for each heat/lot.

**Key Features:**
- Inspection Offer creation and approval chain
- Inspection Prep — checklist and criteria before TPI visit
- Heat Entry and MTC (Material Test Certificate) workflow
- Lab Letter generation — formal test request to TPI lab
- Lab Report entry and attachment
- MTC Certificate generation (PDF with material specs)
- NCR (Non-Conformance Report): logging → investigation → corrective action → closure
- QC Release authorization
- Colour coding for material identification
- Length tally documents

---

### 4.7 Dispatch / Finance

**Purpose:** Manage outbound shipments and financial settlement.

**Key Features:**
- Packing List creation (items, bundles, weights, dimensions)
- Dispatch Note with full dossier PDF bundle (PL + DN + MTC + Invoice)
- Invoice generation: standard GST invoice
- GST e-Invoice (IRN/QR code compliant)
- Invoice email dispatch
- Credit Notes and Debit Notes
- Payment recording and allocation
- Bank Reconciliation
- Aging analysis

---

### 4.8 Reports

**Purpose:** Provide decision-makers with operational and financial visibility.

| Report | Description |
|---|---|
| Client Status | Order status summary per customer |
| Sales Dashboard | Revenue, order count, top customers |
| Quotation Analysis | Win rate, conversion ratio, by period |
| Buyer Performance | On-time payment, order volume per buyer |
| Inventory Report | Current stock by grade, size, warehouse |
| Inventory Ageing | Stock held beyond threshold days |
| Customer Ageing | Outstanding receivables by age bucket |
| Vendor Performance | Delivery adherence, quality rejection rate |
| NCR Analysis | Non-conformance trends by type and material |
| On-Time Delivery | Dispatch vs. committed date performance |
| Management Review | Consolidated KPIs for senior management |

---

### 4.9 Admin

**Purpose:** System administration, access control, and audit.

**Key Features:**
- User management (create, edit, reset password, deactivate)
- Module access configuration per employee
- Master Control panel (SUPER_ADMIN only)
- Full audit log — who changed what and when
- System-wide alerts and notifications
- Traceability search — track any document back to its origin

---

## 5. Key Business Workflows

### Order-to-Cash
```
Inquiry → Quotation → Approval → Customer PO → PO Acceptance
  → Warehouse Intimation → Stock Reservation → Inspection
  → QC Release → Packing List → Dispatch Note → Invoice → Payment
```

### Procure-to-Pay
```
Purchase Requisition → Approval → RFQ → Supplier Quotations
  → Comparative Statement → Purchase Order → GRN
  → Stock Entry → Quality Check → Payment
```

### Quality Traceability
```
GRN (Heat Number) → Inspection Offer → Inspection Prep
  → Lab Letter → Lab Report → MTC Certificate
  → QC Release → Dispatch Dossier
```

---

## 6. Technical Architecture

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Database | MySQL / MariaDB via Prisma ORM |
| Authentication | NextAuth v4 — credentials provider, JWT, bcryptjs |
| UI Components | TailwindCSS v4, shadcn/ui (Radix primitives), Lucide icons |
| Charts | Recharts |
| PDF Generation | Puppeteer Core + @sparticuz/chromium (server-side HTML→PDF) |
| Email | Nodemailer |
| Forms | react-hook-form + zod |
| Client State | Zustand |
| Server State | @tanstack/react-query |

**Multi-tenancy:** Every entity is scoped by `companyId`. All DB queries apply `companyFilter(companyId)` automatically.

**RBAC:** Every API route calls `checkAccess(module, permission)` before processing. Sidebar navigation is gated by role and module access keys.

**Document Numbering:** Auto-generated per financial year with configurable prefix per document type.

---

## 7. Document Types Generated

| Document | Format | Delivery |
|---|---|---|
| Quotation | PDF | Email / Download |
| Purchase Order | PDF | Email / Download |
| Proforma Invoice | PDF | Email / Download |
| Tax Invoice | PDF + e-Invoice (IRN) | Email / Download |
| Credit Note / Debit Note | PDF | Download |
| Packing List | PDF | Download |
| Dispatch Note (Dossier) | PDF bundle | Download |
| MTC Certificate | PDF | Download |
| Lab Letter | PDF | Download |
| GRN | PDF | Download |

---

## 8. Constraints & Non-Functional Requirements

- **Hosting:** Shared hosting (Hostinger) — DB connection pool limited to 5 concurrent connections
- **Multi-company:** Single deployment serves multiple legal entities
- **GST Compliance:** Indian GST rules — CGST/SGST for intra-state, IGST for inter-state, HSN codes on all items
- **Financial Year:** April–March (Indian standard); document numbers reset each FY
- **Data Integrity:** Soft delete not used; hard delete with referential integrity enforced at DB level
- **Audit Trail:** All critical create/update/delete actions logged to audit table

---

## 9. Out of Scope (Current Version)

- Mobile native app
- Customer/vendor self-service portal
- Automated bank statement import
- Machine learning / demand forecasting
- Third-party ERP integration (SAP, Tally)
