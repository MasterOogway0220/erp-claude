# TranZact ERP — Comprehensive Documentation

> Compiled from 5 parallel research agents scraping 50+ public pages, review sites, help docs, and blog posts.
> Date: 2026-02-25

---

## TABLE OF CONTENTS

1. [Company Overview](#1-company-overview)
2. [Platform & Technical Architecture](#2-platform--technical-architecture)
3. [Pricing Plans](#3-pricing-plans)
4. [Navigation Structure](#4-navigation-structure)
5. [Complete End-to-End Workflow](#5-complete-end-to-end-workflow)
6. [Module 1: Sales Management](#6-module-1-sales-management)
7. [Module 2: Purchase Management](#7-module-2-purchase-management)
8. [Module 3: Inventory Management](#8-module-3-inventory-management)
9. [Module 4: Production Management](#9-module-4-production-management)
10. [Module 5: Material Requirement Planning (MRP)](#10-module-5-material-requirement-planning-mrp)
11. [Module 6: Quotations Management](#11-module-6-quotations-management)
12. [Module 7: Transactions Hub](#12-module-7-transactions-hub)
13. [Module 8: Documents Module](#13-module-8-documents-module)
14. [Module 9: Buyers & Suppliers](#14-module-9-buyers--suppliers)
15. [Module 10: Payments & Accounts](#15-module-10-payments--accounts)
16. [Module 11: Reports & Business Intelligence](#16-module-11-reports--business-intelligence)
17. [Module 12: Approvals & Access Management](#17-module-12-approvals--access-management)
18. [Module 13: E-Way Bill & E-Invoicing](#18-module-13-e-way-bill--e-invoicing)
19. [Module 14: Dispatch Management](#19-module-14-dispatch-management)
20. [All Document Types (22+)](#20-all-document-types-22)
21. [All Form Fields by Document Type](#21-all-form-fields-by-document-type)
22. [Integrations](#22-integrations)
23. [Alerts & Notifications](#23-alerts--notifications)
24. [Mobile App](#24-mobile-app)
25. [Industries Served](#25-industries-served)
26. [Known Limitations](#26-known-limitations)
27. [Sources](#27-sources)

---

## 1. Company Overview

| Attribute | Detail |
|-----------|--------|
| **Legal Entity** | FCB Technologies |
| **Brand Name** | TranZact |
| **Founded by** | Team of IIT & IIM graduates |
| **Target Market** | Indian SME/MSME Manufacturers |
| **Users** | 10,000–20,000+ brands across India |
| **Funding** | $7 Mn Series A (Inc42) |
| **Headquarters** | A-203, Kanakia Boomerang, Chandivali Farm Rd, Powai, Mumbai, MH 400072 |
| **Contact** | contactus@letstranzact.com |
| **Website** | https://letstranzact.com |
| **App URL** | https://app.letstranzact.com |
| **Implementation** | Gets implemented within a week |
| **Support** | 24x7 lifetime free support (free + paid plans) |
| **Review Score** | 8.5/10 (FinancesOnline), 93% user satisfaction |

---

## 2. Platform & Technical Architecture

| Aspect | Detail |
|--------|--------|
| **Deployment** | Cloud-based (SaaS) |
| **Cloud Provider** | AWS (Amazon Web Services) |
| **Frontend** | Nuxt.js (Vue.js SSR) with BootstrapVue |
| **App Type** | JavaScript SPA (Single Page Application) |
| **Mobile** | TranZact Lite (Android - Google Play), Web-responsive |
| **Database** | Single central database, all modules share same schema |
| **Security** | AWS multilevel security, encrypted servers, role-based access |
| **Compliance** | GST-compliant, E-Invoicing, E-Way Bill |
| **Multi-currency** | 15+ foreign currencies supported |
| **SEZ Support** | Special Economic Zone document support (INR Exp) |
| **Analytics** | Google Tag Manager, Google Analytics, Microsoft Clarity, New Relic |
| **Customer.io** | For marketing automation (Site ID: 01086af9b9baf39531dd) |
| **Public API** | Not currently available (planned for future) |
| **Chrome Extension** | In-house extension for Tally accounting sync |
| **Barcode** | Hardware barcode scanner integration |

---

## 3. Pricing Plans

| Plan | Price | Billing | Users | Target |
|------|-------|---------|-------|--------|
| **Free** | Rs. 0/month | Free forever | Unlimited | Companies < Rs. 1 Cr turnover |
| **Small** | Rs. 7,500/month | Quarterly | Up to 5 | Growing businesses |
| **Medium** | Rs. 15,000/month | Yearly | Up to 10 | Mid-size manufacturers |
| **Enterprise** | Rs. 30,000/month + 18% GST | Yearly | 15+ | SMEs with 50 Cr+ turnover |

### Feature Tiers Across Plans:

| Feature Category | Free | Small | Medium | Enterprise |
|-----------------|------|-------|--------|------------|
| Growth AI | Basic | Yes | Yes | Yes |
| BI and Reports | Basic | Advanced | Advanced | Full |
| Access Management | Basic | Yes | Yes | Full |
| Sales & Purchase | Basic | Full | Full | Full |
| Inventory & Planning | Basic | Advanced | Advanced | Full |
| Production Management | - | Basic | Full (Multi-level BOM) | Full |
| Integrations | Excel | Tally, Zoho, WhatsApp | + Google Sheets MIS | All |
| Document Approvals | - | - | Yes | Yes |
| E-Invoicing | - | Yes | Yes | Yes |
| Batch Tracking | - | Yes | Yes | Yes |

---

## 4. Navigation Structure

### Top-Level Navigation
```
Solutions → Inventory | Production | MRP | Sales | Purchase Management
Use Cases → Chemical | Auto Components | Electrical | Assembly | Industrial Machineries
Free Tools → GST Number Search | GST Calculator
Resources → Production | Planning | Purchase | Inventory | Payments
Templates → 18 document formats
Case Studies → Cesare Bonetti, Atomberg Technologies, Taurus Packaging, etc.
Integrations → AfterShip | Busy ERP | WhatsApp | Tally | Excel
Pricing
Book a Demo / Free Sign Up
```

### Feature Sidebar (Inside App)
```
1. Inventory
2. Production
3. Buyers and Suppliers
4. Reports
5. Payments
6. Quotations
7. Approvals
8. Business Intelligence
9. Transactions
10. Resource Planning (MRP)
11. All Documents
12. E-Way Bill
```

---

## 5. Complete End-to-End Workflow

### Master Workflow (Inquiry to Dispatch + Payment)
```
SALES SIDE:
  Customer Inquiry/Enquiry
    → Sales Quotation (status: Pending/Won/Lost/Cancelled)
      → Order Confirmation (OC) [with PO number, dispatch date]
        → [Auto-sent to Production Department]
          → Work Order (auto-created from OC)
            → Production (BOM + Routing)
              → Quality Check / FG Testing (pass/reject)
        → Proforma Invoice (against OC)
          → Advance Receipt Voucher (ARV)
            → GST Invoice / E-Invoice
              → Delivery Challan + Packing List
                → E-Way Bill
                  → Dispatch
                    → Payment Collection + Reminders
                      → Credit/Debit Notes (if needed)

PURCHASE SIDE:
  RFQ (to multiple suppliers in one click)
    → Supplier Quote Comparison Summary (downloadable as Excel)
      → Supplier Selection (based on rating + price)
        → Purchase Order (auto-generated or manual)
          → Inward (receipt of goods)
            → GRN (Goods Received Note) + QIR (Quality Inspection Report)
              → Store Entry (inventory updated)
                → Purchase Invoice
                  → Payment Processing + Reminders
                    → Purchase Return (if needed)

PRODUCTION SIDE:
  Work Order (from OC or manual)
    → Multi-Level BOM (raw materials + semi-finished goods)
      → Process Routing (cutting → machining → finishing → etc.)
        → Sub-contracting (if outsourced operations)
          → Production Tracking (Planned → Pending → WIP → Completed)
            → Finished Goods Testing / QC
              → Finished Goods → Inventory
                → Line Rejection → Reject Store
                  → Scrap Tracking

INVENTORY SIDE:
  Multiple Warehouses
    → Stock Transfers (FIFO-based pricing, bulk transfers)
      → Min/Max Stock Levels → Auto Reorder Alerts (WhatsApp + Email)
        → Barcode Tracking → Material Movement History
          → Physical Stock Reconciliation
            → MRP → Material Requirement Planning

MRP SIDE:
  Sales Orders + Production Orders + FG Data
    → MRP Calculation (4 types: Product Category, OC-based, Process-based, FG-based)
      → Stock availability check (available / blocked / ordered / pending test)
        → Purchase requisition generation
          → Reorder alerts with live notifications
```

---

## 6. Module 1: Sales Management

### 6.1 Sales Inquiry/Enquiry
- Capture and track customer inquiries
- Automated status overview for proactive follow-up
- Real-time status tracking of all enquiries at a single place
- Convert inquiries → quotations

### 6.2 Sales Quotation
- Create professional sales quotations with item details, quantities, rates, taxes
- Add extra charges, attachments, bank details, logistical details, T&C
- **Foreign currency** — generate in 15+ currencies
- **Status tracking**: Pending, Won, Lost, Cancelled
- Smart search/filter: pending to order, converted, canceled
- Share instantly via **WhatsApp** or **Email**
- Activity timeline: comments, email responses, internal team responses
- Convert to Order Confirmation (OC)

### 6.3 Order Confirmation (OC)
- Convert quotation → OC with: dispatch delivery date, PO number
- Create Proforma Invoice against OC
- Create GST Invoice against OC
- Track OC status in centralized timeline
- Auto-send confirmed sales orders to production department

### 6.4 Proforma Invoice
- Created against an Order Confirmation
- Professional format with custom fields

### 6.5 GST Invoice (Sales)
- GST-compliant invoicing against OC
- Fields: buyer/supplier details, expected payment date, OC number, OC date
- E-invoicing support

### 6.6 Delivery Challan
- Proof of goods dispatched
- Packing lists: package type, package number, net/gross weight per package
- Predefined delivery slip templates
- Share via Email and WhatsApp

### 6.7 E-Way Bill
- Auto-generated for goods transport > Rs. 50,000
- Part A and Part B auto-fetched
- API validation in seconds

### 6.8 Credit Note & Debit Note
- GST-compliant credit/debit notes
- Issue for returns or adjustments

### 6.9 Sales Workflow
```
Enquiry → Sales Quotation → Order Confirmation (OC) → Proforma Invoice
→ Advance Receipt Voucher (ARV) → GST Invoice → Delivery Challan → Dispatch
```

---

## 7. Module 2: Purchase Management

### 7.1 Purchase Indent / Requisition
- Formal document to authorize material requisition
- Fields: items required, make, specifications, units, expected date, estimated prices

### 7.2 Request for Quotation (RFQ)
- Send **single RFQ to multiple suppliers** in one click
- Fields: delivery date, bid start-date, bid end-date
- Professional RFQ format

### 7.3 Quote Comparison
- **RFQ Comparison Summary** — compare individual supplier quotes side-by-side
- Download comparison as Excel
- Select best quote and convert directly to Purchase Order

### 7.4 Supplier Rating
- Rate suppliers based on quotation quality and performance
- Choose counterparties by comparing quotations and ratings

### 7.5 Purchase Order (PO)
- Create POs with automated approval process
- Send directly via Email and WhatsApp
- Real-time visibility into entire ordering and stock cycle
- Built-in checks and automatic calculations
- **Status tracking**: Pending, Approved, Rejected, Completed
- Budget limits and purchasing pattern alerts

### 7.6 Goods Received Note (GRN) / QIR
- Create GRN upon receipt of goods
- Fields: supplier name, goods description, quantity received, date of receipt, GRN number, signature
- Quality inspection results included
- Verify quantity and quality against PO

### 7.7 Inward Processing
- Record supply receipts via inward document
- Update inventory quantities
- Quality Check (QC) on inward goods

### 7.8 Purchase Return
- Process and track purchase returns
- Full documentation and history

### 7.9 Purchase Invoice
- Process purchase invoices
- Link to PO and GRN

### 7.10 Purchase Workflow
```
RFQ → Quote Comparison → Purchase Order → Inward → GRN/QIR → Store Entry → Purchase Invoice → Payment
```

---

## 8. Module 3: Inventory Management

### 8.1 Inventory Dashboard
- Quick overview: stock valuation, top-selling items, top-bought items
- Valuation by type (buy/sell/both) and category (packaging, finished goods, raw material)
- Valuation methods: **FIFO** and **Average Price**

### 8.2 Item Master
- Define items with detailed attributes
- Add custom fields
- Create categories for items
- Bulk upload via downloadable Excel template
- Item IDs: auto-generated but customizable (Item Series)
- Update stock by adding/reducing items

### 8.3 Stock Management
- Real-time stock tracking
- **Negative stock restriction**
- Stock history tracking
- Complete material movement history per item
- Graphical view of price trends (FIFO & Average)

### 8.4 Multiple Warehouses / Stores
- Monitor diverse stores in inventory
- Oversee quantities across stores
- **Stock transfers** between stores (FIFO-based pricing, bulk transfers)
- Complete overview of stock movement between warehouses and shop floor
- Monitor multiple warehouses from single device

### 8.5 Stock Level Alerts & Reorder
- Define **minimum and maximum stock levels** per item
- Alerts via Email and WhatsApp when nearing safe levels
- 15+ types of automatic alerts
- **Reorder Point (ROP)** and **Safety Stock** calculation
- Live reordering notifications

### 8.6 Barcode Management
- Assign and generate barcodes for products
- Custom barcode fields (e.g., manufacturing dates)
- Barcode reports to track movements
- Barcode scanning integration
- Scanning reveals: lot numbers, storage locations, stock quantities, movement history

### 8.7 Physical Stock Reconciliation
- Measure actual stock and update in system
- Reconcile actual vs. virtual stock
- Make adjustments as needed

### 8.8 Rejected / Scrap Inventory
- Update dead stock/rejected stock separately in a **rejected store**
- View with complete history
- Track scrap from production

### 8.9 Vendor Mapping
- Map fixed item prices to respective counterparties
- Vendor-to-item linking

### 8.10 Inventory Approvals
- Approve and reject items
- Track all approved and rejected items

### 8.11 Inventory Types Tracked
- Raw materials
- Packaging materials
- Finished goods
- Semi-finished goods
- Rejected/scrap inventory

### 8.12 Table & View Customization
- Adjustable table view
- Customize column views, hide columns
- Custom fields on any document

---

## 9. Module 4: Production Management

### 9.1 Bill of Materials (BOM)
- **Multi-Level BOM** — create sub-processes for multiple semi-finished goods under master BOM
- BOMs inside BOMs (nested recipes)
- **Single-Level BOM** support
- Interconnect parent and child operations
- Calculate accurate prices of finished goods (component costs)
- Total cost of all raw materials + other charges
- **Version control** — clear modification history, workers use approved versions
- Edit BOMs with audit trail (who modified last)
- Save BOM data via spreadsheets for offline access

### 9.2 Process Routing
- Define routing tasks (cutting, machining, finishing) within each BOM
- Track different routing stages in production
- Covers: Routing, Production Planning, Scheduling, and Control

### 9.3 Work Order Management
- **Auto-create work orders** from Order Confirmations
- Convert individual/multiple work orders into production orders
- **Status tracking**: Planned, Pending, Work-in-Progress (WIP), Completed
- Monitor all production steps in real time
- Check updated inventory levels based on production status

### 9.4 Sub-Contracting / Job Work
- Add all subcontracting project details
- Track outsourced work within production module
- Monitor vendor compliance with quality standards
- Track outsourced and semi-finished goods inventory in real-time
- Quick overview: goods produced, quantity passed, quantity rejected
- Subcontract reports

### 9.5 Finished Goods Testing / Quality Control
- Capture FG testing data before updating FG quantity in inventory
- Quantitative testing of semi-finished and finished goods
- Automatic quality check on procured materials (inward QC)
- Ensures quality delivery to customers

### 9.6 Production Costing
- Calculate net cost of BOM and production processes
- Insights into other charges
- BOM costing breakdown

### 9.7 Line Rejection & Scrap Tracking
- Update rejected materials into inventory reject store
- Update in inventory reports
- Track estimated scrap, changes in scrap quantity
- Assign to reject store or transfer back to other stores

### 9.8 Production Stages
```
Planned → Pending → Work-in-Progress (WIP) → Completed
```

---

## 10. Module 5: Material Requirement Planning (MRP)

### 10.1 MRP Types
1. **Product Category MRP** — based on specific product categories
2. **Order Confirmation MRP** — run MRP directly from Order Confirmations
3. **Process Based MRP** — aligned with specific production plans & processes
4. **Finished Goods Based MRP** — pre-identified quantities of FG for MRP

### 10.2 MRP Dashboard Fields
- Item ID
- Required quantity
- Blocked quantity
- Total ordered quantity
- Total inward goods pending to be tested
- Total price
- Available in stock
- Needs procurement

### 10.3 MRP Features
- Cross-functional integration (sales, quotations, purchases, inventory, production)
- Real-time updates on material availability
- Smart MRP reports with custom column views
- Pre-set Minimum Stock Levels (MSL)
- Live reordering alerts with notifications
- Optimized inventory and purchase planning
- Minimized losses and waste
- Average production time calculations

### 10.4 MRP Integration
- Integrated with order management, purchases, inventory, and production modules
- Assess raw material needs based on production process or product category

---

## 11. Module 6: Quotations Management

### 11.1 Sales Quotations
- Create professional sales quotations
- **Status tracking**: Pending, Won, Lost, Cancelled
- Automated follow-up status overview
- Convert to Order Confirmations (OC)
- Custom fields support
- Fetch item-level data from inventory
- Share via Email and WhatsApp

### 11.2 RFQ Management (Purchase Side)
- Send single RFQ to **multiple suppliers** in one click
- RFQ fields: delivery date, bid start-date, bid end-date
- **RFQ Comparison Summary** — side-by-side supplier quote comparison
- Download comparison as Excel
- Convert best quote to Purchase Order

### 11.3 Quotation Additional Features
- Foreign currency (15+ currencies)
- Extra charges, attachments, bank details, logistical details, T&C
- Activity timeline per quotation
- Smart search and filters

---

## 12. Module 7: Transactions Hub

> "An inbox for your purchase & sales teams" — saves ~30 min/day

### 12.1 Transaction Timeline
- Complete history of all documents created per transaction
- From Purchase Order to Store Entry stage
- View current status at a single place

### 12.2 Transaction Features
- Define purchase & sales transactions separately
- Add **transaction name** to every item
- **Auto-generate document numbers** for every transaction
- **Document Series** — configurable numbering format
- **Transaction Tags** — label as "High Priority", "Custom Order", etc.
- Smart transaction search with custom filters

### 12.3 Communication & Collaboration
- Tag & post comments to connect with team members & suppliers
- Email notifications on comments
- One-click WhatsApp/Email sharing
- Resend email with editing capability

### 12.4 Reminders & Alerts
- Schedule **auto reminders** for counterparties
- Repeat reminder options and stop options
- Live alerts, status, and reminders per transaction
- Payment and delivery reminders (bell icon)

### 12.5 Inventory Updates from Transactions
- Record supply receipts via inward document
- Update inventory quantities
- Update stock from existing Purchase Orders

### 12.6 Service Transactions
- Create service-related documents
- Both availed and delivered services supported

---

## 13. Module 8: Documents Module

### 13.1 Document Customization
- **Custom fields** — add logistics details, proforma details, any custom data
- Professional automated templates
- Foreign currency selection within documents
- SEZ support using INR(Exp)

### 13.2 Document Management
- **Approval history** — view and track per document
- **Bulk download** — up to 20 documents at a time with filters
- **Comments & attachments** — send additional documents post-creation
- **Internal/External visibility** — set document permissions
- **Edit & Resend** — resend emails with editing capability

### 13.3 Document Series / Numbering
- Add custom series names and numbers
- Auto-numbering with customizable format
- Separate series for different transaction types

---

## 14. Module 9: Buyers & Suppliers

### 14.1 Contact Management
- Manage all counterparty data on single platform
- Fields: company name, mobile number, additional user details, delivery location, billing address, GSTIN
- Mark company as: **Buyer**, **Supplier**, or **Both**
- **Bulk data upload** via downloadable Excel template with pre-fixed columns

### 14.2 Network Tags
- Label important counterparties for quick access
- Quick filtering and search

### 14.3 Supplier Relationship
- **Supplier rating system** — rate and compare suppliers
- Compare quotations and ratings
- Professional document creation and transaction timelines

### 14.4 Vendor Mapping
- Map fixed item prices to respective counterparties
- Supplier-wise and customer-wise data views

---

## 15. Module 10: Payments & Accounts

### 15.1 Accounts Receivable & Payable
- Real-time **customer-wise and supplier-wise** data
- Item-wise payables based on every document
- Sundry creditors list
- Invoice tracking and payment processing

### 15.2 Payment Reminders
- Auto-send payment reminders to clients
- Overdue and upcoming payment alerts
- Repeat reminders & stop options
- Improved cash flow analysis

### 15.3 Ledger Management (via Tally Integration)
- Auto-creation of vouchers
- Real-time ledger reconciliation
- Approve: vouchers, debit notes, credit notes, journal entries, stock movements

### 15.4 Additional Financial Features
- Multi-currency support
- Fixed asset management
- Budgeting and forecasting
- Bank reconciliation
- Tax calculations, compliance, and reporting automation

---

## 16. Module 11: Reports & Business Intelligence

### 16.1 Reports (65+ Types)

| Category | Examples |
|----------|---------|
| **Purchase Reports** | PO summary, vendor-wise purchase, purchase returns |
| **Sales Reports** | Sales summary, customer-wise, region-wise, conversion rates |
| **Store Reports** | Stock levels, movement history, valuation |
| **Quality Reports** | QC pass/fail, rejection rates |
| **Subcontract Reports** | Job work tracking, vendor performance |
| **Accounts Reports** | Receivables, payables, ledger, payments |
| **Production Reports** | Work order status, BOM costing, routing |
| **Dispatch Reports** | Delivery tracking, challan summaries |

### 16.2 Report Features
- Custom column views
- Download as Excel
- **Easy data grouping** — group by customer, salesperson, region, etc.
- **Auto-delivery to mobile** — schedule critical reports to mobile device
- Single dashboard for all reports

### 16.3 Business Intelligence Dashboard
- **Actionable Insights**: Orders due today, due in 7 days; quotations placed vs. converted
- **Custom Overviews**: Segment by regions, categories, time-spans
- **Quick Data Cards**: Graphs for order/invoice/purchase/quotation analysis
- **Inventory Dashboard**: Stock valuations, top-selling items, top-bought items
- **Accounts Analysis**: Real-time receivables & payables by customer/supplier
- **Sales Insights**: Region-wise, customer-wise sales breakdown
- **Purchase Insights**: Supplier-wise, category-wise historical data
- **Daily Business Digest**: Automated daily summary via WhatsApp/Email

---

## 17. Module 12: Approvals & Access Management

### 17.1 Document Approvals
- Centralized dashboard for all pending documents
- **Approve, Approve & Send, or Reject** — single click
- Approval history tracked per document
- No documents sent outside company without required approval

### 17.2 Approval Rules
- Rules based on: specific companies, credit limit, amount restrictions
- Single authorization to complex multi-layered structures
- Hierarchical workflow spanning departments
- Approval authorities assigned to top management

### 17.3 Role-Based Access Control (RBAC)
- Define distinct permissions for every team
- Function-level access control
- Team members access only assigned functions
- AWS multilevel security

---

## 18. Module 13: E-Way Bill & E-Invoicing

### 18.1 E-Way Bill
- Mandatory for goods transport > Rs. 50,000
- **Part A & Part B** auto-fetched from transaction data
- Auto-calculated distance
- API validation in seconds
- E-way bill number auto-logged into invoice
- Auto-refresh already-generated e-way bills
- Live alerts for missing details before generation
- 100% compliant with GST rules

### 18.2 E-Invoicing
- Government-compliant e-invoice generation
- Automated e-invoice creation from transactions
- Integration with GST portal

### 18.3 GST Compliance
- Full GST-compliant invoicing
- CGST, SGST, IGST calculations
- HSN/SAC code support
- Credit & Debit notes under GST
- Export invoice support

---

## 19. Module 14: Dispatch Management

### 19.1 Delivery Challan
- Dispatch challan / delivery slip creation
- Predefined templates
- Share via Email and WhatsApp

### 19.2 Packing Lists
- Package type
- Package number
- Net weight per package
- Gross weight per package

### 19.3 Dispatch Tracking
- Real-time tracking and reporting
- Centralized dashboard for transportation
- AfterShip integration for shipment tracking
- Transporter details: name, tracking number, dispatch date, payment, vehicle number

---

## 20. All Document Types (22+)

| # | Document Type | Module |
|---|--------------|--------|
| 1 | Sales Inquiry | Sales |
| 2 | Sales Quotation | Sales / Quotations |
| 3 | Order Confirmation (OC) | Sales |
| 4 | Proforma Invoice | Sales |
| 5 | Advance Receipt Voucher (ARV) | Sales / Payments |
| 6 | GST Invoice (Sales) | Sales |
| 7 | Export Invoice | Sales |
| 8 | Delivery Challan | Sales / Dispatch |
| 9 | Packing List | Sales / Dispatch |
| 10 | E-Way Bill | Compliance |
| 11 | E-Invoice | Compliance |
| 12 | Credit Note | Sales / Accounts |
| 13 | Debit Note | Sales / Accounts |
| 14 | Bill of Supply | Sales |
| 15 | Purchase Order | Purchase |
| 16 | Goods Received Note (GRN) | Purchase |
| 17 | Quality Inspection Report (QIR) | Purchase / QC |
| 18 | Inward | Purchase / Inventory |
| 19 | Purchase Invoice | Purchase |
| 20 | Purchase Return | Purchase |
| 21 | Service Order | Services |
| 22 | Service Confirmation | Services |
| 23 | Work Order | Production |
| 24 | Bill of Materials (BOM) | Production |
| 25 | Material Transfer Note | Inventory |
| 26 | Receipt Voucher | Payments |

---

## 21. All Form Fields by Document Type

### 21.1 Sales Quotation Fields
- Customer/buyer name and details
- Buyer GSTIN
- Buyer address (billing & delivery)
- Quotation number (auto-generated, customizable series)
- Quotation date
- Item details (fetched from inventory):
  - Item name / description
  - HSN/SAC code
  - Quantity
  - Unit of Measure (UOM)
  - Rate / Price per unit
  - Discount (if any)
  - Taxable value
  - GST rate (CGST, SGST, IGST)
  - Tax amount
  - Total amount per line
- Extra charges
- Attachments
- Bank details
- Logistical details
- Terms & conditions
- Currency selection (15+ foreign currencies)
- Status: Pending / Won / Lost / Cancelled
- Custom fields (user-defined)

### 21.2 Order Confirmation (OC) Fields
- All quotation fields +
- Dispatch delivery date
- PO number (from buyer)
- OC number (auto-generated)
- OC date

### 21.3 Purchase Order Fields
- PO number (auto-generated, customizable series)
- PO date
- Vendor/supplier name and details
- Supplier GSTIN
- Supplier address
- Item details:
  - Item name / description
  - HSN/SAC code
  - Quantity
  - Unit of Measure
  - Rate / Price
  - Taxable value
  - GST (CGST, SGST, IGST)
  - Total amount
- Delivery date (expected)
- Terms and conditions
- Payment terms
- PO status: Pending / Approved / Rejected / Completed
- Custom fields

### 21.4 GST Invoice Fields
- Invoice number (auto-generated)
- Invoice date
- Buyer details (name, address, GSTIN)
- Supplier details (name, address, GSTIN)
- OC number and OC date (reference)
- Expected payment date
- Item details:
  - Item name / description
  - HSN/SAC code
  - Quantity
  - UOM
  - Rate
  - Discount
  - Taxable value
  - CGST rate & amount
  - SGST rate & amount
  - IGST rate & amount
  - Total per line
- Sub-total
- Total tax
- Grand total
- Amount in words
- Bank details
- Transport/logistics details
- E-Invoice details (if enabled)
- Custom fields

### 21.5 Delivery Challan Fields
- Challan number
- Challan date
- Buyer/consignee details
- Dispatch from address
- Item details (name, quantity, UOM)
- Packing list:
  - Package type
  - Package number
  - Net weight per package
  - Gross weight per package
- Transporter details:
  - Transporter name
  - Vehicle number
  - Tracking number
  - Dispatch date
  - Payment for transporter
  - Additional details

### 21.6 GRN (Goods Received Note) Fields
- GRN number
- Date of receipt
- Purchase order reference
- Supplier name and details
- Items received:
  - Item name / description
  - Quantity ordered
  - Quantity received
  - Quality inspection results (pass/fail)
  - Acceptance / rejection status
- Signature
- Notes

### 21.7 Bill of Materials (BOM) Fields
- BOM name / Finished goods item
- BOM version
- Multi-level component hierarchy:
  - Raw material items
  - Semi-finished goods (sub-BOM references)
  - Quantities per component per level
- Process routing tasks (cutting, machining, finishing, etc.)
- Cost per component
- Other charges
- Total BOM cost
- Last modified by (audit trail)

### 21.8 Work Order Fields
- Work order number
- Product to manufacture (BOM reference)
- Quantity to produce
- Scheduled start date
- Scheduled end date
- Actual output vs. forecast
- Status: Planned / Pending / WIP / Completed
- Routing stage tracking
- Sub-contracting details (if outsourced)

### 21.9 RFQ (Request for Quotation) Fields
- RFQ number
- Delivery date
- Bid start-date
- Bid end-date
- Supplier(s) selected
- Item details:
  - Item name / description
  - Quantity required
  - Specifications / make
  - Expected price

### 21.10 E-Way Bill Fields
- **Part A**: Supplier GSTIN, receiver GSTIN, place of delivery, invoice/challan number, invoice date, value of goods, HSN code, transport document number
- **Part B**: Vehicle number, transporter ID, mode of transport
- Auto-calculated distance
- E-way bill number (auto-logged)

### 21.11 Credit Note Fields
- Credit note number
- Date
- Original invoice reference
- Buyer/supplier details
- Reason for credit
- Item details (returned/adjusted)
- Tax adjustments (GST)
- Amount credited

### 21.12 Proforma Invoice Fields
- Same as GST Invoice fields
- Proforma invoice number
- Reference to Order Confirmation
- Not a final tax document

### 21.13 Purchase Indent / Requisition Fields
- Items required
- Make / brand
- Specifications
- Units of measure
- Expected date of delivery
- Estimated prices

### 21.14 Material Transfer Note Fields
- Transfer from (warehouse/store)
- Transfer to (warehouse/store)
- Items transferred
- Quantities
- FIFO-based pricing
- Date of transfer

### 21.15 Buyer/Supplier Master Fields
- Company name
- Company type: Buyer / Supplier / Both
- Contact person name
- Mobile number
- Email
- GSTIN
- Billing address
- Delivery location(s)
- Additional user details
- Network tags
- Supplier rating
- Vendor-mapped item prices

### 21.16 Item Master Fields
- Item ID (auto-generated / custom series)
- Item name / description
- HSN/SAC code
- Category (raw material, packaging, finished goods, semi-finished, etc.)
- Type (buy / sell / both)
- Unit of Measure (UOM)
- Current stock level
- Minimum stock level
- Maximum stock level
- Reorder point
- Warehouse / store location
- Inventory valuation (FIFO / Average)
- Barcode
- Custom fields (user-defined)
- Vendor mapping (fixed prices per counterparty)

---

## 22. Integrations

| Integration | Type | Capabilities |
|------------|------|-------------|
| **TallyPrime** | Accounting | Chrome extension; sync invoices, vouchers (pending/approved/completed); approve vouchers, debit notes, credit notes, journal entries, stock movements; export stock item master & counterparty data |
| **Busy ERP** | Accounting | Single-click data passing; define sales/tax ledgers; import/export data |
| **Microsoft Excel** | Data | Bulk upload (inventory, counterparties, opening balances, BOM); download reports, comparison summaries |
| **Google Sheets** | Data (Medium plan) | MIS integration |
| **WhatsApp** | Communication | 15+ automatic alert types; share documents/invoices; payment reminders |
| **Gmail/Email** | Communication | Automated notifications; document sharing; resend with editing |
| **SMS** | Communication | Automated SMS alerts |
| **AfterShip** | Logistics | Dispatch details against invoices; track shipping movements and returns; fields: transporter name, tracking number, dispatch date, vehicle number |
| **Zoho** | CRM | Integration available (Small plan+) |
| **EasyEcom** | E-Commerce | E-commerce platform connection |
| **Shopify** | E-Commerce | E-commerce platform connection |
| **WooCommerce** | E-Commerce | E-commerce platform connection |
| **E-Invoicing API** | Compliance | Government e-invoicing portal integration |
| **E-Way Bill API** | Compliance | Government e-way bill portal integration |
| **Barcode Scanners** | Hardware | Physical barcode scanner integration |

---

## 23. Alerts & Notifications

### 15+ Alert Types via WhatsApp & Email:
- Stock level alerts (min/max breached)
- Reorder alerts
- Payment reminders (overdue, upcoming)
- Delivery reminders
- Transaction status updates
- Document approval notifications
- Comment/tag notifications
- PO status changes
- Invoice generation alerts
- GRN/inward notifications
- Production stage updates
- Daily Business Digest (automated summary)

### Reminder Features:
- Schedule auto reminders for counterparties
- Repeat reminder options
- Reminder stop options
- Bell icon in-app notifications

---

## 24. Mobile App

- **App Name**: TranZact Lite
- **Platform**: Android (Google Play)
- **Features**:
  - BI dashboarding on mobile
  - Real-time warehouse and inventory management
  - Track and manage operations on the go
  - Auto-delivery of critical reports to mobile
  - Cross-platform compatibility (web + mobile)

---

## 25. Industries Served

| Industry | Specific Use Cases |
|----------|-------------------|
| **Electrical & Electronics** | Multi-level BOM, component tracking |
| **Chemical & Paints** | Batch tracking, recipe/BOM management |
| **Auto Components** | Production routing, sub-contracting |
| **Industrial Machinery** | Complex BOM, work order management |
| **Assembly** | Assembly line tracking, routing |
| **Packaging Machines & Materials** | Material management, dispatch |
| **Plastics** | Production planning, raw material tracking |
| **Printing** | Job work, sub-contracting |
| **Material Handling** | Inventory, warehouse management |

---

## 26. Known Limitations

Based on user reviews across G2, Capterra, SoftwareSuggest, GetApp:

1. **No public API** — custom integrations not currently possible
2. **CRM features are basic** — require manual work
3. **No digital signature** feature
4. **Cannot enter backdated invoices**
5. **When creating PO, auto-sends to supplier** — no option to turn off
6. **Cannot export/import custom fields** in inventory via Excel
7. **Internet required** — no offline mode (cloud-only)
8. **Basic reporting in free plan** — advanced features gated behind paid plans
9. **Limited import/export to Excel** in some areas
10. **No desktop app** — web and Android only

---

## 27. Sources

### Official TranZact Pages:
- [Homepage](https://letstranzact.com/)
- [Features - Inventory](https://letstranzact.com/features/inventory)
- [Features - Production](https://letstranzact.com/features/production)
- [Features - Quotations](https://letstranzact.com/features/quotations)
- [Features - Transactions](https://letstranzact.com/features/transactions)
- [Features - Documents](https://letstranzact.com/features/documents)
- [Features - Reports](https://letstranzact.com/features/reports)
- [Features - Payments](https://letstranzact.com/features/payment)
- [Features - Approvals](https://letstranzact.com/features/approvals)
- [Features - Business Intelligence](https://letstranzact.com/features/business-intelligence)
- [Features - Resource Planning](https://letstranzact.com/features/resource-planning)
- [Features - E-Way Bill](https://letstranzact.com/features/e-way-bill)
- [Features - Buyers & Suppliers](https://letstranzact.com/features/buyers-and-suppliers)
- [Solutions - Manufacturing ERP](https://letstranzact.com/solutions/manufacturing-erp-software)
- [Solutions - Inventory Management](https://letstranzact.com/solutions/inventory-management-software)
- [Solutions - Sales Management](https://letstranzact.com/solutions/sales-management-software)
- [Solutions - Purchase Management](https://letstranzact.com/solutions/online-purchase-order-management-software)
- [Solutions - Production Management](https://letstranzact.com/solutions/production-management-software)
- [Solutions - Bill of Materials](https://letstranzact.com/solutions/bill-of-materials-software)
- [Solutions - Multi-Location Inventory](https://letstranzact.com/solutions/multi-location-inventory-management-software)
- [Pricing](https://letstranzact.com/pricing)
- [Integrations](https://letstranzact.com/integrations)
- [Integrations - Tally](https://letstranzact.com/integrations/tally)
- [Integrations - Busy](https://letstranzact.com/integrations/busy)
- [Integrations - AfterShip](https://letstranzact.com/integrations/aftership)
- [Integrations - Excel](https://letstranzact.com/integrations/excel)
- [Use Cases](https://letstranzact.com/use-cases)
- [Use Cases - RFQ & Quote Comparison](https://letstranzact.com/use-cases/category/rfq-and-quote-comparison)
- [Use Cases - Inquiry & Quotation](https://letstranzact.com/use-cases/category/inquiry-and-quotation)
- [Use Cases - Multiple Warehouse](https://letstranzact.com/use-cases/category/multiple-warehouse)
- [Use Cases - Sub-Contracting](https://letstranzact.com/use-cases/category/sub-contracting)
- [Use Cases - Routing](https://letstranzact.com/use-cases/category/routing-use-cases)
- [Use Cases - PO Status](https://letstranzact.com/use-cases/category/purchase-order-status)
- [Use Cases - Min/Max Stock](https://letstranzact.com/use-cases/category/minimum-and-maximum-stock-level)
- [Help Center](https://help.letstranzact.com)

### Blog Posts:
- [ERP Modules](https://letstranzact.com/blogs/erp-modules)
- [Features of ERP](https://letstranzact.com/blogs/features-of-erp)
- [ERP Software](https://letstranzact.com/blogs/erp-software)
- [Manufacturing ERP](https://letstranzact.com/blogs/manufacturing-erp-software)
- [How to Use ERP](https://letstranzact.com/blogs/how-to-use-erp-software)
- [Mobile ERP](https://letstranzact.com/blogs/mobile-erp)
- [Material Requirements Planning](https://letstranzact.com/blogs/material-requirements-planning)
- [GST Invoice Software](https://letstranzact.com/blogs/gst-invoice-software)
- [Barcode Inventory](https://letstranzact.com/blogs/how-tranzact-barcode-inventory-software-can-improve-inventory-tracking)
- [ERP vs TranZact](https://letstranzact.com/blogs/erp-v-s-tranzact-what-is-better-for-sme-manufacturers)
- [TranZact vs ERPNext](https://letstranzact.com/blogs/tranzact-vs-erpnext-best-production-planning-tools)

### Third-Party Reviews:
- [SoftwareSuggest](https://www.softwaresuggest.com/tranzact)
- [SaaSWorthy](https://www.saasworthy.com/product/letstranzact)
- [SaaSWorthy Pricing](https://www.saasworthy.com/product/letstranzact/pricing)
- [G2 Reviews](https://www.g2.com/products/tranzact/reviews)
- [GetApp](https://www.getapp.com/business-intelligence-analytics-software/a/tranzact/)
- [Capterra](https://www.capterra.com/p/236233/TranZact/)
- [Capterra India](https://www.capterra.in/software/1018571/tranzact)
- [Software Advice](https://www.softwareadvice.com/inventory-management/tranzact-profile/)
- [TechJockey](https://www.techjockey.com/detail/tranzact)
- [FinancesOnline](https://reviews.financesonline.com/p/tranzact)
- [TrustRadius](https://www.trustradius.com/products/tranzact/reviews)
- [Crozdesk](https://crozdesk.com/software/tranzact)
- [TechnologyCounter](https://technologycounter.com/products/tranzact)
- [Inc42 - Series A Funding](https://inc42.com/buzz/erp-startup-tranzact-raises-7-mn-in-series-a-funding/)
