# Product Requirements Document (PRD)

## ERP System for Oil, Gas, Power & Petrochemical Trading Company

**Document Version:** 1.0
**Date:** February 14, 2026
**Status:** Draft
**Compliance Standard:** ISO 9001:2018 Quality Management System

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Objectives](#2-product-vision--objectives)
3. [Stakeholders & User Roles](#3-stakeholders--user-roles)
4. [System Architecture & Technology Requirements](#4-system-architecture--technology-requirements)
5. [Master Data Management](#5-master-data-management)
6. [Module 1 — Enquiry & Quotation Management](#6-module-1--enquiry--quotation-management)
7. [Module 2 — Sales Order Management](#7-module-2--sales-order-management)
8. [Module 3 — Purchase Order Management](#8-module-3--purchase-order-management)
9. [Module 4 — Inventory & Stores Management](#9-module-4--inventory--stores-management)
10. [Module 5 — Quality Control & MTC Management](#10-module-5--quality-control--mtc-management)
11. [Module 6 — Dispatch, Invoicing & Payment](#11-module-6--dispatch-invoicing--payment)
12. [Module 7 — MIS, Audit & Management Review](#12-module-7--mis-audit--management-review)
13. [End-to-End Traceability Flow](#13-end-to-end-traceability-flow)
14. [ISO 9001:2018 Compliance Matrix](#14-iso-90012018-compliance-matrix)
15. [Non-Functional Requirements](#15-non-functional-requirements)
16. [UAT Acceptance Criteria](#16-uat-acceptance-criteria)
17. [Deliverables & Milestones](#17-deliverables--milestones)

---

## 1. Executive Summary

This PRD defines the complete functional and technical requirements for building an integrated ERP system tailored for a trading company operating in the Oil, Gas, Power, and Petrochemical industries. The company deals in Stainless Steel, Carbon Steel, Alloy Steel, Nickel & Copper Alloys, Tubulars, Structurals, Pipe Fittings, Flanges, Valves, Instrumentation, Mechanical & Electrical Components.

The ERP must serve a dual purpose: it must function as a full-fledged business operations platform controlling end-to-end processes from enquiry to payment, and simultaneously act as a Quality Management System (QMS) support tool that ensures complete compliance with ISO 9001:2018 requirements. Every module, screen, field, and workflow described in this document has been mapped against specific ISO clauses to ensure audit readiness from day one.

The core principle driving this system is **traceability** — every transaction, material movement, inspection result, and financial entry must be traceable through the entire lifecycle: Enquiry → Quotation → Sales Order → Purchase Order → Incoming Inspection → Inventory → Dispatch → Invoice → Payment. Heat number and batch-level traceability is mandatory and non-negotiable given the nature of materials traded and the safety-critical industries served.

---

## 2. Product Vision & Objectives

### 2.1 Vision Statement

To deliver a web-based ERP platform that unifies sales, procurement, inventory, quality, dispatch, and finance operations under a single system with built-in ISO 9001:2018 compliance, full material traceability, and real-time management intelligence — eliminating manual processes, reducing errors, and enabling audit-ready documentation at all times.

### 2.2 Business Objectives

The system must achieve the following measurable outcomes:

**Operational Control:** Complete digitization of all business processes from customer enquiry through final payment collection, eliminating paper-based workflows and manual tracking spreadsheets. Every process step must be captured, timestamped, and attributed to a specific user.

**Material Traceability:** Full heat number and batch-level traceability across the entire supply chain. Given that materials are destined for safety-critical applications in oil, gas, and petrochemical facilities, the system must be able to trace any delivered item back to its source mill, inspection records, and original purchase order within seconds.

**Quality Assurance:** Built-in quality control workflows that enforce inspection before stock acceptance, automate non-conformance reporting, manage Mill Test Certificates (MTCs), and ensure no uninspected or rejected material can be dispatched to a customer.

**ISO 9001:2018 Compliance:** The system itself must serve as objective evidence of process control for ISO auditors. This means auto-generated document numbers, revision control, approval workflows, controlled templates, audit trails, and data retention policies must be embedded into the system architecture rather than bolted on as afterthoughts.

**Management Intelligence:** Real-time dashboards and MIS reports that provide actionable insights on sales performance, inventory health, vendor reliability, quality trends, and financial status — generated automatically without manual data compilation.

### 2.3 Scope Boundaries

**In Scope:** Enquiry management, quotation management, sales order processing, purchase requisition and order management, vendor management, inventory and warehouse management, quality control and inspection, MTC management, non-conformance reporting, dispatch and logistics documentation, invoicing (GST-compliant for India, export format support), payment tracking, MIS reporting, and management dashboards.

**Out of Scope (for initial release):** Manufacturing/production planning, HR and payroll, fixed asset management, CRM with marketing automation, e-commerce or customer portal, multi-currency hedging, and integration with third-party logistics providers. These may be considered for future phases.

---

## 3. Stakeholders & User Roles

### 3.1 Role Definitions & Access Matrix

The system must implement role-based access control (RBAC) where each user role has precisely defined permissions. No user should have access to screens or functions outside their role definition unless explicitly granted by an administrator.

**Admin Role:** Full system access including user management, master data configuration, system settings, and all module access. Responsible for initial setup, role assignment, and system maintenance. Access to audit logs, backup configuration, and security settings.

**Sales Role:** Access limited to Enquiry Master, Quotation Entry, Quotation Approval workflow (submission, not approval unless also designated as approver), Quotation Print/Email, Sales Order Entry, SO Allocation screen, and Sales Dashboard. Can view (read-only) inventory availability and customer payment status. Cannot access purchase, QC internal reports, or accounting entries.

**Purchase Role:** Access to Purchase Requisition Entry, Vendor Master (view and propose additions, not approve), PO Entry, PO Tracking, and purchase-related reports. Can view Sales Order details (read-only) to understand procurement requirements. Cannot modify sales orders, QC results, or financial entries.

**QC (Quality Control) Role:** Access to Inspection Entry, MTC Repository, NCR Module, QC Release screen, and Quality Dashboard. Can view GRN details and PO specifications for inspection reference. Cannot modify inventory quantities, sales orders, or financial records.

**Stores Role:** Access to GRN Entry, Stock Location Master, Stock Issue Screen, Packing List Entry, Dispatch Note, and Inventory Reports. Can view PO details for receiving reference and SO details for dispatch reference. Cannot modify sales orders, purchase orders, QC results, or financial entries.

**Accounts Role:** Access to Invoice Entry, Receipt Entry, Credit/Debit Notes, Outstanding & Ageing Reports, TDS management, and Bank Reconciliation. Can view dispatch details for invoice reference. Cannot modify sales orders, purchase orders, or inventory records.

**Management Role:** Read-only access to all dashboards, MIS reports, and approval queues. Access to MIS Export, Sales Dashboard, Inventory Reports, Quality Dashboard, and financial summaries. Approval authority for quotations, purchase orders, and other documents requiring management sign-off. Cannot create or modify transactional records directly.

### 3.2 Access Control Requirements

Every user must have a unique login with enforced password policies (minimum length, complexity, expiration). The system must maintain a complete login history showing login time, logout time, IP address, and session duration. Failed login attempts must be logged and accounts locked after a configurable number of failures. All user activity must be logged in an audit trail that records the user ID, timestamp, screen accessed, action performed (create, read, update), and before/after values for any data changes.

---

## 4. System Architecture & Technology Requirements

### 4.1 Platform Requirements

The system must be web-based, accessible through modern browsers (Chrome, Firefox, Edge, Safari) without requiring client-side software installation. It must support both cloud-hosted and on-premise deployment models to accommodate the client's infrastructure preferences and data sovereignty requirements.

### 4.2 Database & Storage

The database must support relational data integrity with full referential constraints to prevent orphaned records. All document attachments (MTCs, inspection reports, customer POs, quotation PDFs) must be stored with version history. The database must support a minimum retention period of 5–7 years for all transactional and audit data, as required for ISO compliance and business continuity.

### 4.3 Security

SSL/TLS encryption must be enforced for all data in transit. Sensitive data at rest (financial records, login credentials) must be encrypted. Daily automated backups must be configured with a documented disaster recovery procedure. The system must support API endpoints for future integrations with accounting software, logistics platforms, or customer portals, secured with API key authentication and rate limiting.

### 4.4 Performance

The system should support concurrent usage by all defined roles without degradation. Screen load times should not exceed 3 seconds under normal operating conditions. Report generation for standard MIS reports should complete within 10 seconds. Bulk operations (mass GRN entry, batch invoice generation) should provide progress indicators and not time out.

---

## 5. Master Data Management

Master data forms the foundation of the entire ERP. All masters must be configured before transactional modules go live. Each master must support create, read, update operations with full audit trail. Deletion of master records must be prohibited once they are referenced in any transaction; instead, masters should support an "inactive" status that prevents new usage while preserving historical references.

### 5.1 Customer Master

**Fields:** Customer code (auto-generated), company name, contact person, designation, phone, email, billing address, shipping address (multiple), GSTIN, PAN, payment terms (linked to Payment Terms Master), credit limit, credit days, customer category (domestic/export), industry segment, currency preference, and remarks.

**Validation Rules:** GSTIN format validation for Indian customers. Duplicate check on company name and GSTIN. Mandatory fields: company name, at least one address, payment terms.

### 5.2 Supplier/Vendor Master

**Fields:** Vendor code (auto-generated), company name, contact person, phone, email, address, GSTIN, PAN, bank details (for payment processing), payment terms, approved status (Yes/No), approval date, approved by, product categories supplied, quality rating, delivery rating, and remarks.

**Validation Rules:** Vendor must be marked as "Approved" before being selectable in PO creation. Approval status change must be logged with approver name, date, and reason. This directly supports ISO 9001 Clause 8.4 (Control of externally provided processes).

### 5.3 Product Master

**Fields:** Product code (auto-generated), material type (Stainless Steel, Carbon Steel, Alloy Steel, Nickel Alloy, Copper Alloy, etc.), material grade (e.g., SS 304, SS 316L, A106 Gr.B, Inconel 625), product category (Pipes, Fittings, Flanges, Valves, Plates, Bars, Structurals, Instrumentation, Electrical), size/dimension, schedule/thickness, standard/specification (ASTM, ASME, API, IS, EN, DIN, JIS), manufacturer/mill, unit of measure (linked to UOM Master), HSN code (for GST), and description.

**Validation Rules:** Combination of material grade + product category + size + standard must be unique. HSN code is mandatory for invoicing compliance.

### 5.4 Tax Master

**Fields:** Tax code, tax type (CGST, SGST, IGST, export zero-rated), tax rate percentage, effective from date, effective to date, HSN code linkage, and description.

**Validation Rules:** Tax rates must be date-effective to handle GST rate changes without modifying historical transactions. System must auto-select the correct tax type based on customer location (intra-state = CGST+SGST, inter-state = IGST, export = zero-rated/IGST with refund).

### 5.5 Unit of Measure (UOM) Master

**Fields:** UOM code, UOM description (Nos, Mtrs, Kg, MT, Ltr, Set, Pair, Length, Sqm), conversion factor to base unit.

**Validation Rules:** Conversion factors must be defined for UOMs within the same category (e.g., Kg to MT = 0.001) to support inventory calculations.

### 5.6 Additional Masters

**Payment Terms Master:** Code, description (e.g., "30 days from invoice date", "Advance payment", "LC at sight"), number of credit days.

**Delivery Terms Master:** Code, description (e.g., Ex-Works, FOR Destination, CIF, FOB), Incoterms reference.

**Inspection Agency Master:** Agency code, name, contact details, accreditation details, approved status.

**Warehouse/Location Master:** Warehouse code, name, address, and sub-locations (rack, bay, shelf).

---

## 6. Module 1 — Enquiry & Quotation Management

### 6.1 Business Context

This is the entry point of the entire business cycle. A customer enquiry is received (via email, phone, or tender portal), registered in the system, evaluated, costed, and converted into a formal quotation. The quotation goes through an internal approval process before being released to the customer. This module must capture every detail needed to build an accurate, professional quotation while maintaining version control for revisions.

### 6.2 Screen: Enquiry Master

**Purpose:** Register and track all incoming customer enquiries as the first step in the sales pipeline.

**Screen Fields:**

- Enquiry Number — Auto-generated, sequential, format: `ENQ/YYYY-YY/NNNNN` (e.g., ENQ/2025-26/00001). Non-editable once generated.
- Enquiry Date — Auto-populated with current date, editable for backdating with reason.
- Customer — Dropdown linked to Customer Master. On selection, auto-populate customer details (address, contact person, payment terms).
- Customer Reference — Free text for customer's RFQ number or tender reference.
- Project Name — Free text for the end-user project (e.g., "ONGC Uran Terminal Expansion").
- Project Location — Free text.
- End User — Free text (may differ from customer if enquiry is through a contractor).
- Enquiry Source — Dropdown: Email, Phone, Tender Portal, Walk-in, Referral.
- Priority — Dropdown: Normal, Urgent, Critical.
- Expected Closure Date — Date picker.
- Remarks — Free text for internal notes.

**Item-Level Grid (within Enquiry):**

- Line Item Number — Auto-sequential.
- Product — Linked to Product Master. On selection, auto-populate material grade, standard, HSN code.
- Description — Auto-populated from Product Master, editable for enquiry-specific specs.
- Specification/Standard — Auto-populated, editable.
- Size/Dimension — Free text or linked to product attributes.
- Schedule/Thickness — Free text.
- Quantity — Numeric, mandatory.
- UOM — Linked to UOM Master.
- Required Delivery Date — Date picker.
- Special Requirements — Free text (e.g., "Third-party inspection by Lloyd's", "NACE MR0175 compliance").
- Attachment — File upload for customer's specification sheet, drawings, or enquiry email.

**Functional Behavior:**

On save, the system generates a unique Enquiry Number and timestamps the record. The enquiry status is set to "Open." The sales user can add, edit, or remove line items until the enquiry is converted to a quotation. Once a quotation is created against this enquiry, the enquiry status changes to "Quoted" and further edits are restricted. If the customer places an order, status moves to "Converted." If the customer does not proceed, the user can mark it as "Lost" with a reason (price, delivery, specification mismatch, competition).

**ISO 9001 Alignment:** Clause 8.2 — Determination of requirements for products and services. The enquiry record serves as documented evidence that customer requirements were captured, reviewed, and understood before quotation preparation.

### 6.3 Screen: Quotation Entry

**Purpose:** Prepare a detailed, costed quotation against a registered enquiry.

**Screen Fields:**

- Quotation Number — Auto-generated, format: `QTN/YYYY-YY/NNNNN`.
- Quotation Date — Auto-populated.
- Revision Number — Starts at Rev 0. Increments automatically when a quotation is revised. Previous revisions are archived and accessible for comparison.
- Reference Enquiry — Linked to Enquiry Master. On selection, auto-populate customer, project, and all item details from the enquiry.
- Customer — Auto-populated from enquiry, non-editable.
- Validity Period — Number of days (e.g., 30, 60, 90). System calculates and displays the expiry date.
- Payment Terms — Auto-populated from Customer Master, editable for this quotation.
- Delivery Terms — Linked to Delivery Terms Master.
- Delivery Period — Free text (e.g., "4-6 weeks from PO receipt").

**Item-Level Costing Grid:**

- Line Item — Auto-populated from enquiry.
- Material Description — Auto-populated, editable.
- Quantity — Auto-populated from enquiry, editable.
- UOM — Auto-populated.
- Material Cost per Unit — Numeric, manual entry. This is the base procurement cost.
- Logistics Cost per Unit — Numeric (freight, handling, customs if applicable).
- Inspection Cost per Unit — Numeric (third-party inspection charges if applicable).
- Other Costs per Unit — Numeric (packing, insurance, etc.).
- Total Cost per Unit — Auto-calculated: Material + Logistics + Inspection + Other.
- Margin Percentage — Numeric, manual entry.
- Selling Price per Unit — Auto-calculated: Total Cost × (1 + Margin%).
- Total Line Value — Auto-calculated: Selling Price × Quantity.
- Tax — Auto-calculated based on Tax Master and customer location.

**Quotation-Level Totals:**

- Subtotal (before tax) — Auto-calculated sum of all line values.
- Tax Amount — Auto-calculated.
- Grand Total — Auto-calculated.
- Amount in Words — Auto-generated.

**Terms & Conditions Section:**

- Free text area with the ability to load from a template and edit per quotation. Templates are controlled documents maintained by admin.

**Functional Behavior:**

The quotation can be saved as "Draft" for continued editing. When ready, the user submits it for approval, changing the status to "Pending Approval." The costing breakup (material cost, logistics, inspection, margin) is internal and must not appear on the customer-facing quotation PDF — only the selling price and total are visible to the customer. The system must track which user created the quotation, which user submitted it for approval, and maintain a complete revision history with the ability to compare any two revisions side by side.

**ISO 9001 Alignment:** Clause 7.5 — Documented information. The quotation is a controlled document with version control, approval workflow, and retention.

### 6.4 Screen: Quotation Approval

**Purpose:** Management review and approval of quotations before release to the customer.

**Screen Fields:**

- Quotation Number — Display only.
- Customer & Project — Display only.
- Costing Summary — Display of total cost, margin percentage, and selling price for management review.
- Approval Status — Pending, Approved, Rejected, Revision Requested.
- Approver Name — Auto-populated based on logged-in management user.
- Approval Date — Auto-populated on action.
- Remarks — Mandatory for Rejected or Revision Requested status.

**Functional Behavior:**

Only users with Management role or designated approver permissions can access this screen. The approver can see the full costing breakup including margins. If approved, the quotation status changes to "Approved" and becomes available for printing/emailing. If rejected, the quotation returns to the sales user with remarks, and status changes to "Rejected." If revision is requested, the system creates a new revision (incrementing the Rev number) and the sales user can edit the new revision while the previous version is archived. An email or in-app notification should alert the sales user of the approval decision.

### 6.5 Screen: Quotation Print / Email

**Purpose:** Generate the customer-facing quotation document and send it to the customer.

**Screen Fields:**

- Quotation Selection — Dropdown or search for approved quotations.
- Output Format — PDF (mandatory), with option to email directly from the system.
- Email To — Auto-populated from Customer Master, editable to add additional recipients.
- Email CC — Free text.
- Email Subject — Auto-populated with a template (e.g., "Quotation QTN/2025-26/00045 for [Project Name]"), editable.
- Email Body — Auto-populated from template, editable.

**Functional Behavior:**

The PDF must be generated from a controlled template with company letterhead, terms and conditions, and a professional layout. The PDF must show only customer-facing information (no internal costs or margins). When emailed, the system must log the email timestamp, recipient addresses, and a copy of the PDF sent. This log serves as ISO evidence of communication. The quotation status updates to "Sent" after email dispatch.

**ISO 9001 Alignment:** Record retention — the sent quotation and email log provide documented evidence of customer communication.

---

## 7. Module 2 — Sales Order Management

### 7.1 Business Context

When a customer accepts a quotation and issues a Purchase Order (PO), the sales team creates a Sales Order (SO) in the system. The SO is the central document that drives all downstream processes: procurement, inventory reservation, quality checks, dispatch, and invoicing. Every subsequent transaction must reference a valid SO.

### 7.2 Screen: PO Review

**Purpose:** Review and verify the customer's Purchase Order against the approved quotation before creating a Sales Order.

**Screen Fields:**

- Customer PO Number — Manual entry of the customer's PO reference.
- Customer PO Date — Date picker.
- Customer PO Attachment — File upload (mandatory) for the customer's PO document.
- Reference Quotation — Linked to approved quotations. On selection, auto-populate quoted items, prices, and terms.
- Variance Check — System highlights any differences between the customer PO and the quotation (quantities, prices, delivery dates, specifications). Any variance must be acknowledged by the user with a remark before proceeding.

**Functional Behavior:**

This screen enforces ISO 9001 Clause 8.2.3 (Review of requirements for products and services). The system must not allow SO creation if the customer PO has not been reviewed and accepted. If variances exist, the user must either get a revised customer PO or document the accepted deviation with management approval. The customer PO attachment is stored as a controlled document linked to the subsequent SO.

### 7.3 Screen: Sales Order Entry

**Purpose:** Create a formal Sales Order that authorizes procurement, inventory allocation, and dispatch.

**Screen Fields:**

- Sales Order Number — Auto-generated, format: `SO/YYYY-YY/NNNNN`.
- SO Date — Auto-populated.
- Customer — Auto-populated from PO Review.
- Customer PO Reference — Auto-populated from PO Review.
- Reference Quotation — Auto-populated.
- Project Name — Auto-populated.
- Delivery Schedule — Date picker for expected delivery date.
- Payment Terms — Auto-populated from quotation, editable with audit trail.

**Item-Level Grid:**

- Line Item — Auto-populated from quotation.
- Material Description — Auto-populated.
- Specification — Auto-populated.
- Quantity Ordered — Auto-populated from customer PO (may differ from quotation).
- Quantity Dispatched — Auto-calculated from dispatch records. Initially zero.
- Quantity Pending — Auto-calculated: Ordered minus Dispatched.
- Unit Price — Auto-populated from quotation.
- Line Total — Auto-calculated.
- Heat Number — Populated later during inventory reservation/dispatch.
- Status — Item-level status: Open, Partially Dispatched, Fully Dispatched, Closed, Cancelled.

**Functional Behavior:**

On save, the SO is created with status "Open." The SO number becomes the primary reference for all downstream processes. The system must support partial dispatches — i.e., not all items need to be dispatched together. Each partial dispatch updates the quantities and item-level status. Back-order tracking must show items that are pending procurement or pending dispatch. The SO cannot be deleted once created; it can only be amended (with revision control) or cancelled (with management approval and reason documentation).

**ISO 9001 Alignment:** Clause 8.5 — Production and service provision. The SO provides controlled planning for delivery.

### 7.4 Screen: SO Allocation (Inventory Reservation)

**Purpose:** Reserve existing inventory against a Sales Order to prevent the same stock from being promised to multiple customers.

**Screen Fields:**

- Sales Order Number — Selection from open SOs.
- Item Selection — Items from the SO that need inventory reservation.
- Available Stock — System displays available stock matching the item specification, grouped by heat number and warehouse location.
- Heat Number — Selection from available stock. The user picks specific heat numbers to allocate.
- Quantity to Reserve — Numeric, cannot exceed available quantity for the selected heat number.
- Reservation Status — Reserved, Released, Dispatched.

**Functional Behavior:**

When stock is reserved against an SO, it is removed from "Available" status and moved to "Reserved for SO" status. This reserved stock cannot be allocated to another SO. FIFO (First In, First Out) logic must be suggested by default — the system should highlight the oldest stock first — but the user can override this selection if a specific heat number is required by the customer. If reserved stock is later found to be non-conforming (failed QC), the reservation must be released with an NCR reference, and the SO item status updated to reflect the need for re-procurement.

**ISO 9001 Alignment:** FIFO control supports Clause 8.5.4 (Preservation) and heat number allocation supports Clause 8.5.2 (Identification and traceability).

---

## 8. Module 3 — Purchase Order Management

### 8.1 Business Context

When a Sales Order requires material that is not available in inventory, or when stock needs replenishment, the purchase process is initiated. This module handles the complete procurement cycle from requisition through PO creation, vendor selection, and delivery tracking. Vendor management is tightly integrated to ensure only approved vendors are used, directly supporting ISO 9001 Clause 8.4.

### 8.2 Screen: Purchase Requisition (PR) Entry

**Purpose:** Initiate a formal request for procurement, linked to a specific Sales Order or stock replenishment need.

**Screen Fields:**

- PR Number — Auto-generated, format: `PR/YYYY-YY/NNNNN`.
- PR Date — Auto-populated.
- Reference SO — Linked to Sales Order. On selection, auto-populate items that need procurement (where SO quantity exceeds available + reserved stock).
- Requisition Type — Dropdown: Against SO, Stock Replenishment, Emergency.
- Requested By — Auto-populated with logged-in user.

**Item-Level Grid:**

- Material Description — Auto-populated from SO or manually entered for stock replenishment.
- Specification — Auto-populated or manual entry.
- Quantity Required — Numeric.
- Required By Date — Date picker.
- Preferred Vendor — Dropdown from approved vendors in Vendor Master (optional at PR stage).
- Special Instructions — Free text (e.g., "Must comply with NACE MR0175", "Third-party inspection required").

**Functional Behavior:**

The PR goes through an approval workflow. The designated approver reviews the requirement, checks if the procurement is justified (is there really no stock available? Is the SO confirmed?), and approves or rejects. Once approved, the PR is available for conversion to a Purchase Order.

### 8.3 Screen: Vendor Master (Vendor Selection)

**Purpose:** Maintain a database of approved vendors and enforce that only approved vendors are used for procurement.

This screen's detailed fields are covered in Section 5.2 (Master Data). The key functional requirement here is the approval workflow: a vendor must be evaluated and approved before they can be selected in a PO. The system must maintain a vendor performance history showing on-time delivery rates, quality acceptance rates (based on inspection results), and pricing competitiveness. This data feeds into the Vendor Performance report in the MIS module and supports ISO Clause 8.4 requirements for evaluating external providers.

### 8.4 Screen: PO Entry

**Purpose:** Create a formal Purchase Order to an approved vendor.

**Screen Fields:**

- PO Number — Auto-generated, format: `PO/YYYY-YY/NNNNN`.
- PO Date — Auto-populated.
- Revision Number — Starts at Rev 0, increments on amendment.
- Reference PR — Linked to approved PR. Auto-populates items.
- Vendor — Dropdown filtered to show only approved vendors. On selection, auto-populate vendor address, payment terms, bank details.
- Delivery Address — Dropdown of company warehouse addresses.
- Expected Delivery Date — Date picker.
- Payment Terms — Auto-populated from Vendor Master, editable.

**Item-Level Grid:**

- Material Description — Auto-populated from PR.
- Technical Specification — Detailed spec including material grade, standard, size, schedule, end/connection type, coating, special requirements. This is critical for the vendor to supply the correct material.
- Quantity — Numeric.
- UOM — Linked to UOM Master.
- Unit Price — Numeric, manually entered after vendor negotiation.
- Tax — Auto-calculated from Tax Master.
- Line Total — Auto-calculated.
- Reference SO — Auto-populated to maintain traceability back to the customer order.

**Terms & Conditions Section:**

- Inspection requirements (in-house or third-party).
- Documentation requirements (MTC, test reports, certificates of conformity).
- Packing and marking instructions.
- Penalty clauses for late delivery (if applicable).

**Functional Behavior:**

PO creation follows an approval workflow. The designated approver reviews the vendor selection, pricing, and terms before approval. Once approved, the PO can be printed (in a controlled template format) and sent to the vendor. The system must support PO amendments — if specifications, quantities, or dates change after PO release, a new revision is created, the previous version is archived, and the vendor must be notified of the amendment. The PO status tracks through: Draft → Pending Approval → Approved → Sent to Vendor → Partially Received → Fully Received → Closed.

**ISO 9001 Alignment:** Clause 8.4 — Control of externally provided processes. The PO with technical specifications and quality requirements serves as documented evidence of requirements communicated to external providers. Revision control ensures any changes are tracked and communicated.

### 8.5 Screen: PO Tracking

**Purpose:** Monitor delivery status of all open Purchase Orders and flag delays.

**Screen Fields:**

- PO Number, Vendor, Expected Delivery Date, Actual Delivery Date, Status.
- Filter/Search by vendor, date range, status, or material type.
- Delay Alert — System highlights POs where the expected delivery date has passed and the material has not been received.
- Remarks — Free text for recording follow-up notes (e.g., "Vendor confirmed dispatch on 15-Feb", "Material stuck at port").

**Functional Behavior:**

The system must automatically generate delay alerts (visual indicators on dashboard + optional email notifications) when a PO crosses its expected delivery date without a GRN being recorded. This supports ISO Clause 6.1 (Risk identification — supplier delay risk).

---

## 9. Module 4 — Inventory & Stores Management

### 9.1 Business Context

Inventory management in a trading company handling industrial materials requires heat number-level tracking, multiple stock statuses (under inspection, accepted, rejected, reserved), warehouse/location management, and FIFO-based stock issuance. This module handles material receipt, storage, and issuance while maintaining full traceability.

### 9.2 Screen: GRN (Goods Receipt Note) Entry

**Purpose:** Record the receipt of material from a vendor against a Purchase Order.

**Screen Fields:**

- GRN Number — Auto-generated, format: `GRN/YYYY-YY/NNNNN`.
- GRN Date — Auto-populated.
- Reference PO — Linked to approved PO. On selection, auto-populate vendor, items, and expected quantities.
- Vendor — Auto-populated from PO.
- Delivery Challan/Invoice Reference — Manual entry of vendor's delivery document number.
- Vehicle Number — Free text.
- Transporter — Free text.
- Received By — Auto-populated with logged-in stores user.

**Item-Level Grid:**

- Material Description — Auto-populated from PO.
- PO Quantity — Display only.
- Previously Received Quantity — Auto-calculated from prior GRNs against this PO.
- Quantity Received Now — Numeric, manually entered. Cannot exceed (PO Quantity minus Previously Received) without a documented reason.
- Heat Number / Batch Number — Mandatory entry. This is the primary traceability identifier.
- Manufacturer/Mill — Free text or linked to a manufacturer master.
- UOM — Auto-populated.
- Remarks — Free text for noting any visible damage, shortage, or discrepancy.
- MTC Received — Checkbox (Yes/No). If No, a follow-up flag is raised.
- MTC Attachment — File upload for the Mill Test Certificate received with the material.

**Functional Behavior:**

On save, the GRN is created and the material is added to inventory with status "Under Inspection." The material cannot be issued, reserved, or dispatched until QC clears it. The PO status is updated to "Partially Received" or "Fully Received" based on cumulative GRN quantities. If the received quantity exceeds the PO quantity, the system must flag this as an excess receipt requiring acknowledgment. Heat number entry is mandatory and non-negotiable — the system must not allow GRN save without a heat number for each line item.

**ISO 9001 Alignment:** Traceability from PO to physical receipt. Heat number capture at the point of receipt ensures traceability per Clause 8.5.2.

### 9.3 Screen: Stock Location Master

**Purpose:** Define and manage warehouse locations for organized storage and easy retrieval.

**Screen Fields:**

- Location Code — Auto-generated or manually defined.
- Warehouse — Linked to Warehouse Master.
- Zone/Area — Free text (e.g., "Pipe Yard A", "Fitting Store", "Flange Rack").
- Rack/Bay/Shelf — Alphanumeric identifier.
- Location Type — Dropdown: General, Cold Storage, Hazardous, Yard (open area).
- Capacity — Optional numeric field.
- Status — Active / Inactive.

**Functional Behavior:**

Every item in inventory must have a location assignment. During GRN, the stores user assigns the received material to a location. During stock issue, the location is recorded for pick-up reference. Location changes (material moved from one rack to another) must be logged. This supports ISO Clause 8.5.4 (Preservation — ensuring material is stored appropriately).

### 9.4 Screen: Stock Issue

**Purpose:** Issue material from inventory against a Sales Order for dispatch.

**Screen Fields:**

- Issue Slip Number — Auto-generated, format: `ISS/YYYY-YY/NNNNN`.
- Issue Date — Auto-populated.
- Reference SO — Linked to Sales Order. On selection, auto-populate customer and items pending dispatch.
- Issued By — Auto-populated with logged-in stores user.
- Authorized By — Dropdown of users with authorization rights.

**Item-Level Grid:**

- Material Description — Auto-populated from SO.
- SO Quantity — Display only.
- Quantity to Issue — Numeric, manually entered. Cannot exceed available accepted stock or SO pending quantity.
- Heat Number — Selection from available accepted stock matching the item specification. FIFO-suggested by default.
- Location — Auto-populated based on selected heat number.
- Stock Status — Must be "Accepted" (QC-cleared). System must not allow issuance of "Under Inspection," "Rejected," or already "Reserved" (for another SO) stock.

**Functional Behavior:**

On save, the issued quantity is deducted from inventory. The SO item's dispatched quantity is updated. The issue slip serves as the authorization for the stores team to physically pick and hand over the material for packing and dispatch. The system must prevent issuing material that has not been QC-accepted — this is a hard control, not a warning that can be overridden.

---

## 10. Module 5 — Quality Control & MTC Management

### 10.1 Business Context

Quality control is paramount in this industry. Materials used in oil, gas, and petrochemical facilities must meet stringent specifications, and any non-conformance can have safety-critical consequences. This module manages incoming material inspection, MTC verification, non-conformance reporting, and material release decisions. It directly supports multiple ISO 9001 clauses and is a key focus area for auditors.

### 10.2 Screen: Inspection Entry

**Purpose:** Record the results of incoming material inspection against a GRN.

**Screen Fields:**

- Inspection Report Number — Auto-generated, format: `INS/YYYY-YY/NNNNN`.
- Inspection Date — Auto-populated.
- Reference GRN — Linked to GRN. On selection, auto-populate material details, heat number, PO reference, and vendor.
- Inspector Name — Auto-populated or dropdown of QC personnel.
- Inspection Type — Dropdown: Visual, Dimensional, Chemical Analysis, Mechanical Testing, Hydrostatic Test, PMI (Positive Material Identification), Radiography, Ultrasonic, Magnetic Particle.

**Inspection Checklist Grid:**

- Parameter — Predefined based on material type (e.g., for SS 316L pipe: Outer Diameter, Wall Thickness, Length, Straightness, Surface Finish, End Preparation, Markings).
- Specified Value/Range — Auto-populated from PO specification or product standard (e.g., "OD: 168.3mm ± 1%").
- Observed Value — Numeric, manually entered by inspector.
- Result — Auto-calculated: Pass (if within range) or Fail (if outside range). Manual override with mandatory remark.
- Remarks — Free text for observations.

**Chemical Composition Section (if applicable):**

- Element — Predefined (e.g., C, Mn, Si, P, S, Cr, Ni, Mo for SS 316L).
- Specified Range — Auto-populated from material standard.
- MTC Value — Manually entered from the Mill Test Certificate.
- Observed Value — Manually entered if re-tested in-house.
- Result — Pass/Fail.

**Mechanical Properties Section (if applicable):**

- Property — Tensile Strength, Yield Strength, Elongation, Hardness, Impact Value.
- Specified Range — Auto-populated.
- MTC Value — Manually entered.
- Result — Pass/Fail.

**Overall Inspection Decision:**

- Accepted — All parameters pass. Material is released for stock.
- Rejected — One or more critical parameters fail. NCR is mandatory.
- Hold / Conditional Accept — Requires management decision with documented justification.

**Functional Behavior:**

On save with "Accepted" status, the material's inventory status changes from "Under Inspection" to "Accepted," making it available for reservation and dispatch. On "Rejected" status, the material's inventory status changes to "Rejected," and the system automatically prompts NCR creation. On "Hold," the material remains in "Under Inspection" status. The inspection report must be printable and must be linkable to the dispatch documentation for customer reference.

**ISO 9001 Alignment:** Clause 8.6 — Release of products and services. The inspection report is the documented evidence that material was verified before release. Clause 8.7 — Control of nonconforming outputs (triggered on rejection).

### 10.3 Screen: MTC Repository

**Purpose:** Upload, store, and link Mill Test Certificates to specific heat numbers, POs, and SOs for traceability.

**Screen Fields:**

- MTC Record ID — Auto-generated.
- Heat Number — Linked to inventory. This is the primary key for MTC linkage.
- Reference PO — Auto-populated based on heat number's GRN → PO linkage.
- Reference SO — Can be linked when the material is allocated to a specific SO.
- Mill/Manufacturer — Auto-populated from GRN or manual entry.
- MTC Document — File upload (PDF, image). Multiple files allowed per heat number.
- Upload Date — Auto-populated.
- Uploaded By — Auto-populated.
- Version — Numeric, increments on re-upload.
- Verification Status — Pending, Verified (by QC), Discrepant (values don't match inspection).

**Functional Behavior:**

The MTC must be auto-linked to the heat number at the time of GRN or inspection. When a dispatch is created, the system must automatically pull the relevant MTCs for the dispatched heat numbers and include them in the dispatch documentation package. The customer-specific MTC format requirement (some customers need MTCs in their own template format) must be supported — the system should flag this requirement from the SO and alert the QC team. MTCs must be retrievable by searching any of: heat number, PO number, SO number, vendor, or date range.

**ISO 9001 Alignment:** Clause 7.5 — Documented information control. MTCs are critical controlled documents with version management.

### 10.4 Screen: NCR (Non-Conformance Report) Module

**Purpose:** Document, track, and resolve non-conformances found during inspection or at any point in the process.

**Screen Fields:**

- NCR Number — Auto-generated, format: `NCR/YYYY-YY/NNNNN`.
- NCR Date — Auto-populated.
- NCR Type — Dropdown: Incoming Material, In-Process, Customer Complaint, Internal Audit Finding.
- Reference — Linked to Inspection Report (for incoming material NCR), or SO/Dispatch (for customer complaints), or Audit Report (for audit findings).
- Material/Item Description — Auto-populated from reference document.
- Heat Number — Auto-populated if linked to inspection.
- Vendor — Auto-populated if incoming material NCR.
- Non-Conformance Description — Free text, detailed description of the non-conformance.
- Root Cause — Free text, to be filled during investigation.
- Disposition — Dropdown: Return to Vendor, Use As-Is (with customer approval), Rework, Scrap.
- Corrective Action — Free text, mandatory before NCR closure.
- Preventive Action — Free text, recommended to prevent recurrence.
- Responsible Person — Dropdown of users.
- Target Closure Date — Date picker.
- Actual Closure Date — Populated on closure.
- Status — Open, Under Investigation, Corrective Action in Progress, Closed, Verified.
- Closure Approved By — Management user who verifies the corrective action was effective.

**Functional Behavior:**

NCR creation is automatic when an inspection result is "Rejected." NCRs can also be created manually for other types. The system must not allow NCR closure without corrective action documentation and management verification. Open NCRs must be visible on the Quality Dashboard for management review. NCR trends (by vendor, material type, non-conformance type) must feed into the MIS module. The NCR, along with corrective action records, directly supports ISO Clause 10 (Improvement — corrective action tracking).

**ISO 9001 Alignment:** Clause 8.7 — Control of nonconforming outputs. Clause 10.2 — Nonconformity and corrective action.

### 10.5 Screen: QC Release

**Purpose:** Final quality clearance screen where QC authorizes the release of material for dispatch.

**Screen Fields:**

- Release Number — Auto-generated.
- Reference Inspection Report — Linked to inspection report with "Accepted" status.
- Material & Heat Number — Auto-populated.
- Decision — Accept (release to stock) or Reject (block from use).
- Released By — Auto-populated with logged-in QC user.
- Release Date — Auto-populated.
- Remarks — Free text.

**Functional Behavior:**

This screen provides a double-check mechanism. Even after inspection acceptance, the QC head or senior QC engineer performs a final review before changing the stock status to "Accepted." This is particularly important for high-value or critical-application materials.

---

## 11. Module 6 — Dispatch, Invoicing & Payment

### 11.1 Business Context

Once material is QC-accepted and issued against a Sales Order, it must be packed, documented, dispatched to the customer, invoiced, and the payment collected. This module handles the physical and financial closure of the sales cycle with full documentation and GST compliance.

### 11.2 Screen: Packing List Entry

**Purpose:** Create a detailed packing list for material being dispatched against a Sales Order.

**Screen Fields:**

- Packing List Number — Auto-generated, format: `PL/YYYY-YY/NNNNN`.
- Packing List Date — Auto-populated.
- Reference SO — Linked to Sales Order. On selection, auto-populate customer, items, and quantities pending dispatch.
- Customer — Auto-populated.

**Item-Level Grid:**

- Material Description — Auto-populated from SO.
- Heat Number — Auto-populated from stock issue / SO allocation.
- Quantity — Numeric, cannot exceed SO pending quantity.
- Package/Bundle Number — Manual entry for physical identification of packages.
- Gross Weight — Numeric.
- Net Weight — Numeric.
- Dimensions (L × W × H) — For logistics planning.
- Marks & Numbers — Free text for package markings.

**Functional Behavior:**

The packing list is a controlled document that travels with the shipment. It must be printable in a standard format. The system must verify that all items on the packing list have "Accepted" stock status and valid MTCs. If any item lacks an MTC, the system should raise an alert preventing packing list finalization.

**ISO 9001 Alignment:** Verification control — ensuring only accepted material with proper documentation is dispatched.

### 11.3 Screen: Dispatch Note

**Purpose:** Record the physical dispatch of material from the warehouse.

**Screen Fields:**

- Dispatch Note Number — Auto-generated, format: `DN/YYYY-YY/NNNNN`.
- Dispatch Date — Auto-populated.
- Reference Packing List — Linked to Packing List.
- Reference SO — Auto-populated.
- Customer — Auto-populated.
- Delivery Address — Auto-populated from SO, editable.
- Vehicle Number — Mandatory free text.
- Transporter Name — Free text.
- LR (Lorry Receipt) Number — Free text, entered after dispatch.
- LR Date — Date picker.
- E-Way Bill Number — Free text (mandatory for Indian domestic dispatch above threshold value, per GST rules).
- Dispatched By — Auto-populated.

**Functional Behavior:**

On save, the SO item status updates to "Dispatched" (fully or partially based on quantities). Inventory is decremented. The dispatch note, packing list, MTCs, and inspection reports form the complete dispatch documentation package. The system should support generating this complete package as a single PDF bundle for email to the customer. Traceability must be maintained: from this dispatch note, a user must be able to trace back to the SO, PO, GRN, inspection report, and original enquiry.

### 11.4 Screen: Invoice Entry

**Purpose:** Generate a tax-compliant invoice for dispatched material.

**Screen Fields:**

- Invoice Number — Auto-generated, format: `INV/YYYY-YY/NNNNN`.
- Invoice Date — Auto-populated.
- Reference Dispatch Note — Linked to Dispatch Note. On selection, auto-populate customer, items, quantities, and prices from SO.
- Invoice Type — Dropdown: Tax Invoice (domestic), Export Invoice, Proforma Invoice.
- Customer — Auto-populated.
- Customer GSTIN — Auto-populated from Customer Master.
- Place of Supply — Auto-populated for tax determination.
- Billing Address — Auto-populated.
- Shipping Address — Auto-populated from dispatch note.

**Item-Level Grid:**

- Description — Auto-populated.
- HSN Code — Auto-populated from Product Master.
- Quantity — Auto-populated from dispatch.
- UOM — Auto-populated.
- Unit Price — Auto-populated from SO.
- Taxable Value — Auto-calculated.
- CGST Rate & Amount — Auto-calculated (for intra-state).
- SGST Rate & Amount — Auto-calculated (for intra-state).
- IGST Rate & Amount — Auto-calculated (for inter-state).
- Total — Auto-calculated.

**Invoice Totals:**

- Subtotal, Tax Breakup, Grand Total, Amount in Words, TCS (if applicable).
- Round-off adjustment.

**Functional Behavior:**

The invoice must comply with Indian GST invoice format rules (if domestic) or export invoice requirements. The system must auto-determine the applicable tax type (CGST+SGST vs IGST) based on the company's GSTIN state code and the customer's GSTIN state code. Invoice printing must use a controlled template with company letterhead, bank details for payment, and terms. Credit notes and debit notes must be supported for returns, price adjustments, or corrections, with mandatory linkage to the original invoice.

**ISO 9001 Alignment:** Clause 8.5.1 — Service provision control. Financial traceability.

### 11.5 Screen: Receipt Entry (Payment Collection)

**Purpose:** Record payments received from customers against invoices.

**Screen Fields:**

- Receipt Number — Auto-generated, format: `REC/YYYY-YY/NNNNN`.
- Receipt Date — Auto-populated.
- Customer — Dropdown or search.
- Payment Mode — Dropdown: RTGS/NEFT, Cheque, DD, Cash, LC (Letter of Credit), TT.
- Bank Reference / Transaction Number — Free text.
- Cheque Number & Date — Conditional fields if payment mode is cheque.
- Amount Received — Numeric.
- Allocated Against Invoice(s) — Grid showing outstanding invoices for the selected customer, with an allocation column to distribute the received amount across invoices.
- TDS Deducted — Numeric (if the customer deducted TDS at source).
- TDS Certificate Reference — Free text.
- Balance Outstanding — Auto-calculated after allocation.

**Functional Behavior:**

On save, the allocated invoices' outstanding amounts are reduced. A receipt can be allocated across multiple invoices (common in this industry). The system must support partial payments. An ageing report must be available showing outstanding amounts in buckets (0–30 days, 31–60 days, 61–90 days, 90+ days). Bank reconciliation support must allow matching receipts with bank statements.

---

## 12. Module 7 — MIS, Audit & Management Review

### 12.1 Business Context

Management requires real-time visibility into business performance without relying on manual report compilation. This module aggregates data from all other modules into meaningful dashboards and reports. It also serves as the primary tool for ISO 9001 management review meetings (Clause 9.3).

### 12.2 Standard MIS Reports

**Sales Dashboard:** Total enquiries received, quotation conversion rate, total SO value (current month/quarter/year vs previous period), sales by customer, sales by product category, sales by region. Filter by date range, customer, salesperson.

**Quotation Success Ratio:** Number of quotations sent vs. number converted to SOs. Reasons for lost quotations (if captured at enquiry close).

**Inventory Ageing Report:** Stock value and quantity grouped by ageing buckets (0–30, 31–60, 61–90, 90+ days since GRN). Highlights slow-moving and non-moving stock. Identifies stock under inspection for extended periods.

**Vendor Performance Report:** On-time delivery rate (actual delivery date vs PO expected date). Quality acceptance rate (accepted GRN qty vs total GRN qty). NCR count by vendor. Pricing trends.

**Customer Payment Ageing:** Outstanding amounts by customer in ageing buckets. Overdue amounts highlighted. Credit limit utilization.

**NCR & Rejection Analysis:** NCR count by type, vendor, material category, and time period. Trend analysis showing whether quality issues are increasing or decreasing. Corrective action closure rate.

**On-Time Delivery (OTD):** Percentage of SO items delivered on or before the promised delivery date. Analysis by customer, product category, and time period.

### 12.3 Management Dashboard

A single-screen dashboard accessible to the Management role showing real-time KPIs: total open SOs value, total outstanding receivables, inventory value, open POs pending delivery, open NCRs, today's dispatches, and graphical trend charts (sales trend, receivables trend, inventory turnover). Graphical reports must include bar charts, line charts, and pie charts with drill-down capability (clicking a bar should show the underlying data).

### 12.4 MIS Export

All reports must be exportable to Excel and PDF formats. The export must include the report title, date range, generated by, and generation timestamp. This supports ISO Clause 9.1 (Monitoring, measurement, analysis, and evaluation) and Clause 9.3 (Management review input).

---

## 13. End-to-End Traceability Flow

The following traceability chain must be supported and verifiable at any point:

```
Customer Enquiry (ENQ)
    └──→ Quotation (QTN) [with revision history]
            └──→ Sales Order (SO) [linked to Customer PO]
                    ├──→ Purchase Requisition (PR)
                    │        └──→ Purchase Order (PO) [to Approved Vendor]
                    │                └──→ GRN [with Heat Number capture]
                    │                        └──→ Inspection Report
                    │                                ├──→ Accepted → Stock (Available)
                    │                                └──→ Rejected → NCR → Corrective Action
                    ├──→ Inventory Reservation [Heat Number level]
                    │        └──→ Stock Issue
                    │                └──→ Packing List
                    │                        └──→ Dispatch Note [with MTC package]
                    │                                └──→ Invoice
                    │                                        └──→ Payment Receipt
                    └──→ Delivery Performance Tracking
```

**Critical Traceability Points:**

Every dispatched item must be traceable back to its original enquiry within 3 clicks or a single search by heat number. Searching by heat number must return the complete lifecycle of that material: which PO it was purchased on, from which vendor, the GRN details, inspection results, MTC reference, which SO it was allocated to, which customer it was dispatched to, and the invoice number. This is not optional — it is a fundamental requirement of the system and a primary focus area for ISO auditors.

---

## 14. ISO 9001:2018 Compliance Matrix

The following ISO clauses must be supported by the ERP system with specific feature mappings:

**Clause 4.4 — Process Interaction Mapping:** The system's module interlinkages (Enquiry → Quotation → SO → PO → GRN → Inspection → Stock → Dispatch → Invoice → Payment) serve as the process interaction map. The system itself is the documented evidence of process interactions.

**Clause 5.3 — Roles & Responsibilities:** Role-based access control with documented role definitions ensures organizational roles and responsibilities are defined and communicated within the system.

**Clause 6.1 — Risk Identification:** Automated alerts for delivery delays (PO tracking), supplier delays, inventory ageing (slow-moving stock alerts), customer payment overdue (ageing reports), and quality trends (NCR dashboards) serve as risk identification and monitoring mechanisms.

**Clause 7.2 — Competence:** User role mapping ensures only competent, authorized personnel perform specific functions (e.g., only QC-role users can perform inspection entries, only approved approvers can approve quotations/POs).

**Clause 7.5 — Documented Information Control:** Auto document numbering, revision control with version history, approval workflows before release, controlled templates for quotations/POs/invoices/MTCs, soft copy storage with version history, and prevention of unauthorized modification of approved documents.

**Clause 8.2 — Customer Requirements:** Enquiry registration capturing customer specifications, quotation review against requirements, contract review (PO Review screen), and variance documentation.

**Clause 8.4 — External Providers:** Approved vendor management with evaluation records, PO with technical specifications as documented requirements communicated to vendors, vendor performance tracking (delivery and quality).

**Clause 8.5 — Production & Service Provision:** Sales order management with delivery tracking, inventory management with FIFO and preservation controls, dispatch with full documentation.

**Clause 8.5.2 — Identification & Traceability:** Heat number/batch-level tracking from GRN through inspection, stock, dispatch, and invoice. Complete forward and backward traceability.

**Clause 8.5.4 — Preservation:** Stock location management, warehouse/location-wise inventory, and minimum stock level alerts.

**Clause 8.6 — Release of Products:** Inspection and QC release process before material can be dispatched. Material cannot bypass QC.

**Clause 8.7 — Nonconforming Outputs:** NCR module with mandatory corrective action, root cause analysis, disposition decision, and closure verification.

**Clause 9.1 — Monitoring & Measurement:** MIS reports and dashboards providing performance data for all critical processes.

**Clause 9.3 — Management Review:** MIS Export capability providing data for management review meetings. Dashboard with real-time KPIs.

**Clause 10 — Improvement:** NCR tracking with corrective and preventive actions. Trend analysis enabling continual improvement. Corrective action closure verification.

---

## 15. Non-Functional Requirements

### 15.1 Mandatory System Controls (Non-Negotiable)

These controls must be embedded in the system architecture and cannot be bypassed by any user role, including Admin:

**Role-Based Access Control:** Every screen, button, and data field must be governed by role permissions. No user can access functions outside their assigned role.

**Auto Document Numbering:** All document types (enquiry, quotation, SO, PR, PO, GRN, inspection, NCR, packing list, dispatch, invoice, receipt) must have system-generated, sequential, unique document numbers following a defined format. Manual override of document numbers is not permitted.

**Audit Trail:** Every create and edit operation must be logged with user ID, timestamp, screen/field name, old value, and new value. The audit trail must be viewable by Admin and Management roles but not editable or deletable by anyone.

**No Deletion of Approved Records:** Once a record is approved (quotation, PO, inspection report, invoice), it cannot be deleted. It can only be amended (creating a new revision) or cancelled (with documented reason and management approval). Cancelled records remain in the system for audit purposes.

**Mandatory Attachments:** Certain documents require mandatory attachments before they can be finalized: GRN requires MTC upload (or a documented exception), inspection report requires dimensional/test data, dispatch requires packing list and MTC linkage.

### 15.2 Data Retention

All transactional data, documents, attachments, and audit logs must be retained for a minimum of 7 years. Archived data must remain searchable and retrievable. Data purge or archival must be a controlled process with management authorization.

### 15.3 Backup & Recovery

Automated daily backups of the complete database and document repository. Backup integrity verification. Documented disaster recovery procedure with defined Recovery Point Objective (RPO) and Recovery Time Objective (RTO). Off-site or cloud backup for disaster protection.

### 15.4 Performance Benchmarks

Page load time: under 3 seconds for standard screens. Report generation: under 10 seconds for standard reports, under 30 seconds for complex analytical reports. Concurrent users: must support the full team (typically 15–30 users) without performance degradation. Search results: heat number search must return complete traceability results within 5 seconds.

---

## 16. UAT Acceptance Criteria

The following end-to-end scenarios must pass during User Acceptance Testing before the system can be declared production-ready:

**Scenario 1 — Full Sales Cycle:** Create an enquiry → prepare a quotation → approve it → create an SO against a customer PO → verify the SO items flow correctly into procurement and dispatch. The enquiry must be traceable all the way to the final invoice.

**Scenario 2 — Heat Number Traceability:** Receive material via GRN with a specific heat number → inspect it → accept it → reserve it against an SO → dispatch it → invoice it. Then search by heat number and verify the complete lifecycle is returned: PO, vendor, GRN date, inspection result, MTC, SO, customer, dispatch date, invoice number.

**Scenario 3 — NCR Lifecycle:** Reject material during inspection → verify NCR is auto-created → fill in root cause and corrective action → close the NCR with management verification. Verify the NCR appears in the Quality Dashboard and NCR trend reports.

**Scenario 4 — MIS Accuracy:** Generate all standard MIS reports and verify the numbers match manual calculations from the underlying data. Verify Sales Dashboard totals match the sum of all SO values. Verify Inventory Report matches physical stock check. Verify Outstanding Report matches the sum of unpaid invoices minus receipts.

**Scenario 5 — Access Control:** Attempt to access screens and functions from a role that should not have access. Verify the system blocks unauthorized access at every point. Verify audit trail captures all user actions correctly.

**Scenario 6 — Document Control:** Create a quotation, approve it, then revise it. Verify the original version is archived and accessible. Verify the revision number increments. Verify both versions are available for comparison.

---

## 17. Deliverables & Milestones

### 17.1 Expected Deliverables from the Development Team

**Detailed Functional Requirement Document (FRD):** Expanding on this PRD with screen wireframes, field-level validation rules, and workflow state diagrams for each module.

**Database Schema:** Complete entity-relationship diagram with table definitions, data types, constraints, indexes, and relationships. Must demonstrate how traceability is maintained through foreign key linkages.

**UI/UX Mockups:** High-fidelity mockups for all screens listed in this PRD, reviewed and approved by the business team before development begins.

**ISO Compliance Mapping Document:** A matrix showing each ISO 9001:2018 clause, the corresponding ERP feature/screen that supports it, and the type of evidence the system generates for auditors.

**User Manuals:** Role-wise user manuals with step-by-step instructions and screenshots for all processes.

**Training & Support Plan:** Training schedule for each user role, training materials, and post-go-live support plan (helpdesk, bug fix SLA, enhancement request process).

### 17.2 Suggested Project Phases

**Phase 1 — Foundation:** Master data setup, user and access management, document control framework, enquiry and quotation module.

**Phase 2 — Core Operations:** Sales order, purchase order, GRN, inventory, and QC/inspection modules.

**Phase 3 — Closure & Finance:** Dispatch, packing, invoicing, payment, credit/debit notes.

**Phase 4 — Intelligence & Compliance:** MIS dashboards, reports, audit trail, data export, and ISO compliance review.

**Phase 5 — UAT & Go-Live:** User acceptance testing, bug fixes, training, data migration (if applicable), and production deployment.

---

## Appendix A — Document Number Format Reference

| Document Type       | Format                    | Example               |
|---------------------|---------------------------|-----------------------|
| Enquiry             | ENQ/YYYY-YY/NNNNN        | ENQ/2025-26/00001     |
| Quotation           | QTN/YYYY-YY/NNNNN        | QTN/2025-26/00045     |
| Sales Order         | SO/YYYY-YY/NNNNN         | SO/2025-26/00012      |
| Purchase Requisition| PR/YYYY-YY/NNNNN         | PR/2025-26/00008      |
| Purchase Order      | PO/YYYY-YY/NNNNN         | PO/2025-26/00023      |
| GRN                 | GRN/YYYY-YY/NNNNN        | GRN/2025-26/00034     |
| Inspection Report   | INS/YYYY-YY/NNNNN        | INS/2025-26/00034     |
| NCR                 | NCR/YYYY-YY/NNNNN        | NCR/2025-26/00005     |
| Packing List        | PL/YYYY-YY/NNNNN         | PL/2025-26/00020      |
| Dispatch Note       | DN/YYYY-YY/NNNNN         | DN/2025-26/00020      |
| Invoice             | INV/YYYY-YY/NNNNN        | INV/2025-26/00018     |
| Receipt             | REC/YYYY-YY/NNNNN        | REC/2025-26/00015     |
| Stock Issue         | ISS/YYYY-YY/NNNNN        | ISS/2025-26/00022     |

---

## Appendix B — Glossary

| Term  | Definition                                                                 |
|-------|---------------------------------------------------------------------------|
| SO    | Sales Order — internal order created against a customer's PO              |
| PO    | Purchase Order — order placed with a vendor for material procurement      |
| PR    | Purchase Requisition — internal request for procurement                   |
| GRN   | Goods Receipt Note — document recording material received from vendor     |
| MTC   | Mill Test Certificate — quality certificate from the material manufacturer|
| NCR   | Non-Conformance Report — document recording quality deviations            |
| FIFO  | First In First Out — inventory issue method based on receipt date         |
| HSN   | Harmonized System of Nomenclature — product classification for GST       |
| GST   | Goods and Services Tax — Indian indirect tax                              |
| IGST  | Integrated GST — for inter-state supply                                   |
| CGST  | Central GST — central component for intra-state supply                    |
| SGST  | State GST — state component for intra-state supply                        |
| TDS   | Tax Deducted at Source                                                     |
| UAT   | User Acceptance Testing                                                   |
| MIS   | Management Information System                                             |
| QMS   | Quality Management System                                                 |
| OTD   | On-Time Delivery                                                          |
| LR    | Lorry Receipt — transport document                                        |
| PMI   | Positive Material Identification — material verification test             |
| NACE  | National Association of Corrosion Engineers — corrosion resistance standard|
| RBAC  | Role-Based Access Control                                                 |

---

*This PRD must be used as the primary reference by the development team during design, development, and testing phases, and by ISO auditors during certification and surveillance audits.*

**— End of Document —**
