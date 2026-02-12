# NPS ERP System - User Training Manual
**Version:** 1.0
**Date:** February 12, 2026
**Target Audience:** All Users (Sales, Purchase, QC, Stores, Accounts, Management, Admin)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Sales Department Training](#3-sales-department-training)
4. [Purchase Department Training](#4-purchase-department-training)
5. [QC Department Training](#5-qc-department-training)
6. [Stores Department Training](#6-stores-department-training)
7. [Accounts Department Training](#7-accounts-department-training)
8. [Management Training](#8-management-training)
9. [Admin Training](#9-admin-training)
10. [Common Workflows](#10-common-workflows)
11. [Troubleshooting](#11-troubleshooting)
12. [Quick Reference](#12-quick-reference)

---

## 1. Introduction

### 1.1 What is the NPS ERP System?

The NPS ERP System is a comprehensive enterprise resource planning solution designed specifically for piping and tubular trading operations. It replaces all Excel-based processes with an integrated system that provides:

- **End-to-end traceability** from enquiry to payment
- **Heat number level tracking** for complete material traceability
- **ISO 9001:2018 compliance** with built-in quality management
- **Professional documentation** generation (quotations, invoices, MTCs)
- **Real-time dashboards** for management decision-making

### 1.2 System Access

**URL:** `https://erp.npspipe.com` (or your local URL)

**Login Credentials:** Provided by your system administrator

**Supported Browsers:**
- Chrome (recommended)
- Firefox
- Edge
- Safari

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character (!@#$%^&*...)

---

## 2. Getting Started

### 2.1 First Login

1. Open your web browser
2. Navigate to the ERP URL
3. Enter your **email address**
4. Enter your **password**
5. Click **Sign In**

**Note:** Contact your admin if you forget your password.

### 2.2 Dashboard Overview

After logging in, you'll see your personalized dashboard with:

- **Navigation Sidebar** (left) - Access to all modules based on your role
- **Top Bar** (top) - Search, notifications, user menu
- **Main Content Area** (center) - Your current page/module
- **Quick Stats Cards** - Key metrics for your role

### 2.3 Navigation

**Sidebar Sections:**
- **Dashboard** - Home page with key metrics
- **Masters** - Product specs, sizes, customers, vendors
- **Enquiries** - Customer enquiries and RFQs
- **Quotations** - Create and manage quotations
- **Sales** - Sales orders and customer PO management
- **Purchase** - PRs, POs, vendor management
- **Inventory** - Stock, GRN, stock movements
- **Quality** - Inspections, NCRs, MTCs, lab letters
- **Dispatch** - Packing lists, dispatch notes, invoices, payments
- **Reports** - MIS dashboards and analytics
- **Admin** - User management, settings (Admin only)

---

## 3. Sales Department Training

### 3.1 Your Responsibilities

As a Sales team member, you will:
- Register customer enquiries
- Prepare quotations (Domestic, Export, BOM formats)
- Submit quotations for approval
- Email quotations to customers
- Create sales orders from customer POs
- Reserve inventory against sales orders

### 3.2 Module Access

You have access to:
- ✅ Enquiries (create, edit, view)
- ✅ Quotations (create, edit, view)
- ✅ Sales Orders (create, view)
- ✅ Inventory (view only - to check stock availability)
- ✅ Reports (Sales Dashboard, Quotation Analysis)

### 3.3 Workflow: Enquiry to Quotation

#### **Step 1: Register Customer Enquiry**

1. Click **Enquiries** in sidebar
2. Click **+ Create Enquiry** button
3. Fill in enquiry details:
   - **Customer:** Select from dropdown (or create new)
   - **Buyer Name:** Contact person at customer end
   - **Buyer Email:** ⚠️ **IMPORTANT** - This will be used to send quotation
   - **Buyer Contact:** Phone number
   - **Client Inquiry No.:** Customer's reference number (if any)
   - **Enquiry Mode:** How enquiry was received (Email/Phone/Walk-in)
   - **Project Name:** e.g., "2x660MW NTPC Solapur" (if applicable)

4. **Add Line Items:**
   - Click **+ Add Item**
   - **Product:** Select product type (C.S. SEAMLESS PIPE, S.S. SEAMLESS PIPE, etc.)
   - **Material:** Select material grade (auto-filtered based on product)
   - **Size:** Select pipe size (e.g., 6" NB X SCH 40)
   - **Additional Spec:** NACE, HIC, etc. (if required)
   - **Ends:** BE/PE/NPTM/BSPT
   - **Quantity:** In meters
   - **Remarks:** Any special requirements

5. Click **Create Enquiry**
6. **Note the Enquiry Number** - e.g., ENQ/26/00012

#### **Step 2: Check Stock Availability**

Before quoting, check if you have stock:

1. Click **Inventory** in sidebar
2. Use **search** or **filters** to find matching stock
3. Look for:
   - Matching product, material, size
   - Status: **ACCEPTED** (only accepted stock can be sold)
   - Available quantity

**Important:**
- **Reserved stock** is already allocated to other SOs
- Only **ACCEPTED** status stock can be reserved
- Note heat numbers if specific heat needed

#### **Step 3: Prepare Quotation**

**Option A: From Enquiry (Recommended)**

1. Go to **Enquiries** → Find your enquiry
2. Click on enquiry number to view details
3. Click **Create Quotation** button
4. Items will be pre-filled from enquiry

**Option B: Direct Quotation**

1. Go to **Quotations** → Click **+ Create Quotation**
2. Fill manually

**Quotation Form:**

**Header Section:**
- **Customer:** Select customer
- **Quotation Type:**
  - **DOMESTIC** - For Indian customers (INR pricing, standard format)
  - **EXPORT** - For international customers (USD pricing, dual-sheet PDF)
  - **BOM** - For large projects with component positions
- **Currency:** Auto-sets based on type (INR for Domestic, USD for Export)
- **Valid Until:** Quotation validity date (default: +6 days from today)

**Line Items:**

**For DOMESTIC Quotations:**
- Product, Material, Size, Additional Spec
- Quantity (Mtr), Unit Rate, Amount (auto-calculated)
- Delivery time (e.g., "6-8 Weeks")
- Remark/Material Code

**For EXPORT Quotations:**
- Same as domestic, PLUS:
- **Tag Number:** Equipment tag (e.g., P-101)
- **Drawing Reference:** Drawing number
- **Certificate Requirements:** e.g., "EN 10204 3.2"
- **Item Description:** Rich-text multi-line description (optional)
  - Use this for detailed item description instead of table format
  - Will appear in PDF exactly as written

**For BOM Quotations:**
- Same as domestic, PLUS:
- **Component Position:** Position number from customer BOM
- **Drawing Reference:** Customer drawing number
- **Item Type:** Pipe / Tube / Plate
- **WT Type:** MIN (minimum) / AV (average)
- **Tag Number:** Equipment tag
- **For Tubes:**
  - **Tube Length:** Individual tube length (e.g., "6.0 Mtr")
  - **Tube Count:** Number of tubes
  - PDF will show: "48 tubes × 6.0 Mtr each"

**Offer Terms:**
- Pre-filled with standard terms (15 terms)
- Edit any term as needed
- For Export: 9 standard export notes will auto-appear in PDF

7. Click **Create Quotation**
8. **Note the Quotation Number** - e.g., NPS/26/14501

#### **Step 4: Submit for Approval**

1. Go to **Quotations** → Find your quotation
2. Click quotation number to view details
3. Review all details carefully
4. Click **Submit for Approval**
5. Quotation status changes to **PENDING_APPROVAL**
6. Wait for management to approve

**Note:** Only approved quotations can be sent to customers

#### **Step 5: Send Quotation to Customer**

Once approved:

1. Open the approved quotation
2. Click **Send Email** button
3. Email dialog opens:
   - **To:** Pre-filled with buyer email from enquiry
   - **CC:** Add additional recipients (optional)
   - **Subject:** Pre-filled (edit if needed)
   - **Message:** Customize email body

4. Click **Send Email**
5. PDF is automatically attached
6. Quotation status changes to **SENT**

**PDF Formats:**
- **Domestic:** 1 page with standard table
- **Export:** 2 pages (Commercial + Technical)
  - Page 1 (Commercial): Full pricing visible
  - Page 2 (Technical): Pricing replaced with "QUOTED"
- **BOM:** 1 page with BOM-style table

#### **Step 6: Create Sales Order from Customer PO**

When customer sends PO:

1. Go to **Sales** → Click **+ Create Sales Order**
2. **Option A:** From quotation
   - Select reference quotation
   - Items pre-filled
3. **Option B:** Manual entry

4. Fill SO details:
   - **Customer PO Number:** Customer's PO reference
   - **Customer PO Date:** Date on customer PO
   - **Upload PO:** Attach customer PO PDF

5. Review items, adjust quantities if needed
6. Click **Create Sales Order**
7. **SO Number** generated - e.g., SO/26/00045

#### **Step 7: Reserve Stock**

After creating SO:

1. Open the SO detail page
2. Click **Reserve Stock** tab
3. For each item:
   - System shows available stock matching the spec
   - Stock sorted by **FIFO** (oldest MTC date first)
   - Select heat numbers to reserve
   - Enter reserved quantity per heat
   - System tracks: Required → Reserved → Shortfall

4. Click **Reserve Selected Stock**
5. Stock status changes to **RESERVED** for selected heat numbers

**If Shortfall Exists:**
- Shortfall = Required - Reserved
- Create a Purchase Requisition (PR) for the shortfall
- Click **Create PR from Shortfall** button

---

### 3.4 Tips for Sales Team

**DO:**
- ✅ Always check stock before quoting delivery times
- ✅ Use correct quotation type (Domestic/Export/BOM)
- ✅ Double-check pricing and calculations
- ✅ Include all customer requirements in quotation
- ✅ Submit for approval before sending to customer
- ✅ Follow up on sent quotations (mark as WON/LOST)

**DON'T:**
- ❌ Send quotations without approval
- ❌ Promise delivery without checking stock
- ❌ Reserve stock for SOs that don't have confirmed PO
- ❌ Delete approved quotations (system prevents this)

**Common Mistakes:**
- Forgetting to fill buyer email → Can't send quotation
- Wrong quotation type selected → Wrong PDF format
- Not reserving stock → Dispatch team can't fulfill SO

---

## 4. Purchase Department Training

### 4.1 Your Responsibilities

- Review and approve Purchase Requisitions (PRs)
- Create Purchase Orders (POs) to vendors
- Track PO delivery schedules
- Follow up with vendors on pending deliveries
- Amend POs when needed
- Monitor vendor performance

### 4.2 Workflow: PR to PO

#### **Step 1: Review Purchase Requisitions**

PRs are created by:
- Sales team (from SO shortfalls)
- Manual creation for stock replenishment

1. Go to **Purchase** → **Requisitions** tab
2. Filter by **Status: PENDING_APPROVAL**
3. Click on PR to view details
4. Review:
   - Items required
   - Required by date (from SO delivery schedule)
   - Suggested vendor
   - Linked SO (if applicable)

5. **Approve or Reject:**
   - Click **Approve** if requirements are clear
   - Click **Reject** if clarification needed (add remarks)

#### **Step 2: Create Purchase Order**

1. Go to **Purchase** → Click **+ Create PO**
2. **Link to PR:**
   - Select approved PR from dropdown
   - Items auto-filled from PR

3. **PO Header:**
   - **Vendor:** Select from approved vendors
   - **PR Reference:** Auto-linked
   - **SO Reference:** Auto-linked (if PR was from SO)
   - **Delivery Date:** Expected delivery from vendor

4. **Line Items:**
   - Review items from PR
   - Adjust quantities if ordering more/less
   - Enter **Unit Rate** (purchase price)
   - Enter **Delivery Date** per item (if different)
   - **Special Requirements:**
     - NACE testing required?
     - TPI required? (BVIS, TUV, etc.)
     - MTC type: 3.1 or 3.2?
     - Any other vendor instructions

5. Click **Create Purchase Order**
6. **PO Number** generated - e.g., PO/26/00082

**Important:**
- PO is sent to vendor (manual email or system-generated)
- Track PO in **Purchase** → **Orders** tab
- Monitor delivery dates in **PO Follow-up** dashboard

#### **Step 3: Amend Purchase Order**

If changes needed after PO is issued:

1. Open the PO detail page
2. Click **Amend PO** button
3. Fill amendment form:
   - **Change Reason:** Why amending? (e.g., "Quantity increase as per customer request")
   - Modify quantity, rate, delivery date, or other fields
   - System creates **Rev.2** (revision 2)

4. Click **Create Amendment**
5. New PO version created with revision number
6. Original PO preserved in history

**Amendment History:**
- View all revisions on PO detail page
- Click on revision to see changes
- Full audit trail maintained

#### **Step 4: Track Deliveries**

**PO Follow-up Dashboard:**

1. Go to **Purchase** → **PO Follow-up** tab
2. View:
   - **Overdue POs:** POs past delivery date (red alerts)
   - **Upcoming Deliveries:** Next 14 days
   - **Days Overdue:** Automatic calculation
   - **Days Until Delivery:** Countdown

3. **Follow-up Actions:**
   - Call vendor if overdue
   - Update delivery date if vendor confirms delay
   - Escalate to management if critical

**Vendor Performance Scorecard:**

1. Go to **Purchase** → **Vendor Performance** tab
2. View for each vendor:
   - Total POs
   - On-time deliveries
   - Late deliveries
   - On-time percentage
   - Average delay (in days)
   - **Performance Score** (0-100)

**Performance Ratings:**
- **90-100:** Excellent
- **75-89:** Good
- **60-74:** Average
- **Below 60:** Poor (consider alternative vendors)

---

### 4.3 Tips for Purchase Team

**DO:**
- ✅ Approve PRs promptly to avoid SO delays
- ✅ Negotiate best prices with vendors
- ✅ Specify MTC and testing requirements clearly in PO
- ✅ Track delivery dates diligently
- ✅ Amend POs formally (don't do verbal changes)
- ✅ Update vendor performance feedback

**DON'T:**
- ❌ Create PO without approved PR
- ❌ Ignore overdue PO alerts
- ❌ Order from non-approved vendors without approval
- ❌ Forget to specify MTC type in PO

---

## 5. QC Department Training

### 5.1 Your Responsibilities

- Inspect incoming materials (from GRN)
- Upload and link Mill Test Certificates (MTCs)
- Release accepted stock for dispatch
- Raise Non-Conformance Reports (NCRs) for rejected materials
- Generate lab letters for third-party testing
- Maintain MTC repository

### 5.2 Workflow: GRN to QC Release

#### **Step 1: Review Pending Inspections**

1. Go to **Quality** → **Inspections** tab
2. Materials from GRN will be in **UNDER_INSPECTION** status
3. Filter to see materials pending inspection

#### **Step 2: Perform Inspection**

1. Click **+ Create Inspection**
2. Select **GRN** from dropdown
3. Material details auto-filled from GRN
4. Fill inspection parameters:

**Visual Inspection:**
- Pass / Fail
- Remarks (if fail, describe defect)

**Dimensional Checks:**
- Measure OD, WT, Length
- Compare against specification tolerance
- Enter measured values
- System shows: Within tolerance? ✓/✗

**Chemical Analysis:**
- Enter element-wise percentages (from MTC or lab report)
- C, Mn, Si, S, P, Cr, Ni, Mo, etc.
- System validates against spec limits (if configured)

**Mechanical Properties:**
- Yield Strength (MPa)
- Tensile Strength (MPa)
- Elongation (%)
- Hardness (HRC/HRB/BHN) - **Mandatory for NACE materials**

**Impact Test:** (For LTCS, as specified)
- Energy absorbed (Joules)
- Test temperature (°C)

**Other Tests:** (As applicable)
- Flattening Test: Pass/Fail
- Flaring Test: Pass/Fail
- Macro Test: Pass/Fail + upload image
- Micro Test: Pass/Fail + upload image
- IGC Practice E: Pass/Fail (for Stainless Steel)
- Bend Test: Pass/Fail

5. **Overall Result:**
   - **PASS:** All parameters OK → Stock will be **ACCEPTED**
   - **FAIL:** Any parameter out of spec → Stock will be **REJECTED**
   - **HOLD:** Pending further tests or customer approval

6. **Evidence Upload:**
   - Attach photos of defects (if fail)
   - Attach test reports
   - Attach macro/micro test images

7. Click **Submit Inspection**

**Inspection Result Actions:**
- **PASS:** Stock status → **ACCEPTED** (available for reservation/dispatch)
- **FAIL:** Stock status → **REJECTED** → Trigger NCR
- **HOLD:** Stock status → **HOLD** (cannot be reserved until released)

#### **Step 3: Upload and Link MTCs**

**Critical for Traceability!**

1. Go to **Quality** → **MTC Repository**
2. Click **+ Upload MTC**
3. Fill MTC details:
   - **MTC Number:** Certificate number from mill
   - **MTC Date:** Date on certificate
   - **MTC Type:** 3.1 or 3.2 (EN 10204)
   - **Upload PDF:** Attach scanned MTC
   - **Link to:**
     - Heat Number(s)
     - GRN Number
     - PO Number
     - Vendor

4. Click **Upload MTC**
5. MTC is now searchable and traceable

**MTC Search:**
- Search by heat number → Find MTC
- Search by GRN → Find all MTCs for that delivery
- Search by PO → Find all MTCs for that order

#### **Step 4: Raise NCR for Rejected Materials**

If inspection fails:

1. Go to **Quality** → **NCR** tab
2. Click **+ Create NCR**
3. Fill NCR form:
   - **Link to GRN/Heat Number:** Auto-populates material details
   - **Non-conformance Type:**
     - Dimensional
     - Chemical
     - Mechanical
     - Visual
     - Documentation
   - **Description:** Detailed description of issue
   - **Root Cause:** Why did this happen? (fill after investigation)
   - **Corrective Action:** What was done to fix?
   - **Preventive Action:** Steps to prevent recurrence
   - **Disposition:**
     - **Return to Vendor:** Send back to vendor
     - **Rework:** Can be reworked to meet spec
     - **Scrap:** Material is scrap
     - **Use-As-Is:** Customer accepts with concession
   - **Evidence:** Upload photos, test reports

4. Click **Create NCR**
5. **NCR Number** generated - e.g., NCR/26/00003

**NCR Workflow:**
- Status: **OPEN** → **UNDER_INVESTIGATION** → **CLOSED**
- Must fill root cause and CAPA before closing
- ISO 9001 Clause 8.7 & 10.2 compliance

#### **Step 5: Generate Lab Letter**

For materials requiring third-party testing:

1. Go to **Quality** → **Lab Letters**
2. Click **+ Create Lab Letter**
3. Fill details:
   - **Heat Number:** Material to be tested
   - **GRN Reference**
   - **Lab/TPI Agency:** BVIS, TUV, Lloyds, SGS, BV
   - **Select Tests Required:** (12 test types available)
     - ☐ Chemical Analysis
     - ☐ Mechanical Test
     - ☐ Flattening Test
     - ☐ Flaring Test
     - ☐ Macro Test for Seamless
     - ☐ Micro Test
     - ☐ IGC Practice 'E' Test
     - ☐ IGC with Magnification
     - ☐ Hardness Test
     - ☐ Impact Test
     - ☐ Bend Test
   - **Special Instructions:** Any specific requirements

4. Click **Generate Lab Letter**
5. PDF letter generated with material details and test requirements
6. Send to lab via email

---

### 5.3 Tips for QC Team

**DO:**
- ✅ Inspect materials promptly after GRN
- ✅ Upload MTCs immediately (critical for dispatch)
- ✅ Link MTCs to correct heat numbers
- ✅ Fill all inspection parameters completely
- ✅ Raise NCRs for all rejections (ISO requirement)
- ✅ Complete CAPA before closing NCRs
- ✅ Keep MTC repository updated

**DON'T:**
- ❌ Release materials without inspection
- ❌ Accept materials with missing MTCs
- ❌ Skip dimensional checks
- ❌ Forget to upload evidence for NCRs
- ❌ Close NCRs without root cause analysis

**Common Mistakes:**
- Not linking MTC to heat number → Dispatch can't find MTC
- Passing materials without hardness test (NACE requirement)
- Closing NCR without preventive action → ISO non-compliance

---

## 6. Stores Department Training

### 6.1 Your Responsibilities

- Receive materials from vendors (create GRN)
- Manage stock locations (warehouse, racks)
- Issue stock for dispatch against SOs
- Conduct stock audits
- Maintain physical stock accuracy

### 6.2 Workflow: Material Receipt to Dispatch

#### **Step 1: Create GRN (Goods Receipt Note)**

When material arrives from vendor:

1. **Check Material Delivery:**
   - Verify PO number
   - Check packing list from vendor
   - Count pieces
   - Check for physical damage

2. Go to **Inventory** → **GRN** tab
3. Click **+ Create GRN**
4. Fill GRN form:
   - **PO Reference:** Select PO (items auto-fill)
   - **Vendor:** Auto-filled from PO
   - **Material Details:** Auto-filled from PO
   - **Received Quantity (Mtr):** Actual meters received
   - **Pieces:** Number of pipes received
   - **⚠️ CRITICAL: Heat Number Entry:**
     - Enter heat number(s) from pipe marking
     - **One heat number per pipe batch**
     - Heat numbers must be accurate (used for traceability)
   - **Make/Manufacturer:** Mill name (e.g., ISMT, MSL, JSL)
   - **MTC Number:** Certificate number
   - **MTC Date:** Date on MTC
   - **MTC Type:** 3.1 or 3.2
   - **Upload MTC PDF:** Scan and attach MTC
   - **TPI Agency:** BVIS, TUV, etc. (if applicable)
   - **Upload TPI Certificate:** Attach if available
   - **Location:** Warehouse name
   - **Rack Number:** Physical storage location

5. Click **Create GRN**
6. **GRN Number** generated - e.g., GRN/26/00124
7. **Stock Status:** Automatically set to **UNDER_INSPECTION**

**Important:**
- Stock in UNDER_INSPECTION cannot be issued until QC releases it
- Heat numbers are **critical** - verify accuracy
- Attach MTC PDF - QC needs it for inspection

#### **Step 2: Stock Location Management**

**Assign Location:**
1. Go to **Inventory** → **Stock** tab
2. Find the heat number
3. Click to view stock detail
4. Update:
   - **Warehouse:** Main warehouse, Yard, etc.
   - **Rack Number:** Physical rack/bay location
   - **Notes:** Any special storage instructions

**Stock Movement:**
- If moving stock from Warehouse A to Warehouse B
- Update location in stock detail page
- Movement is logged with timestamp and user

**Stock Audit:**
- Periodically verify physical stock matches system
- Report discrepancies to admin
- Adjust stock if needed (with approval)

#### **Step 3: Issue Stock for Dispatch**

When Sales Order is ready to dispatch:

1. Go to **Inventory** → **Stock** tab
2. Filter by:
   - **Status: RESERVED** (reserved against specific SO)
   - **SO Number:** Find stock for specific SO

3. **Prepare Material:**
   - Physically pick material from rack
   - Group by heat number
   - Create bundles if needed
   - Apply marking (paint color, stenciling as per customer requirement)

4. **Create Packing List:**
   - Done by Dispatch team (see Dispatch section)
   - Packing list will reference heat numbers
   - Stores team verifies heat numbers match

---

### 6.3 Tips for Stores Team

**DO:**
- ✅ Verify heat numbers carefully during GRN
- ✅ Upload MTCs immediately
- ✅ Maintain accurate stock locations
- ✅ Report damaged materials to QC
- ✅ Follow FIFO for material issue
- ✅ Keep warehouse organized

**DON'T:**
- ❌ Issue stock that's UNDER_INSPECTION or HOLD
- ❌ Mix heat numbers in bundles
- ❌ Forget to update location after moving stock
- ❌ Accept materials without MTC

**Common Mistakes:**
- Wrong heat number entry → Traceability broken
- Missing MTC upload → QC can't inspect, dispatch blocked
- Issuing HOLD or REJECTED stock → Customer complaint

---

## 7. Accounts Department Training

### 7.1 Your Responsibilities

- Generate invoices from dispatch
- Record payment receipts
- Track customer outstanding
- Manage ageing reports
- Handle credit/debit notes
- Ensure GST compliance

### 7.2 Workflow: Dispatch to Payment

#### **Step 1: Generate Invoice**

After material is dispatched:

1. Go to **Dispatch** → **Invoices** tab
2. Click **+ Create Invoice**
3. Select:
   - **Dispatch Note:** Invoice is against a dispatch
   - OR **Sales Order:** Invoice multiple dispatches
   - Items auto-filled

4. **Invoice Type:**
   - **Domestic (INR):** For Indian customers
   - **Export (USD/EUR/AED):** For international customers

**For Domestic Invoices:**
5. Fill invoice details:
   - **Invoice Number:** Auto-generated (INV/26/00234)
   - **Invoice Date:** Today or select date
   - **Customer:** Auto-filled
   - **Customer GSTIN:** Verify GST number
   - **Place of Supply:** Customer state
   - **Tax Calculation:**
     - **Same State:** CGST + SGST
     - **Different State:** IGST
     - System auto-calculates based on customer state
   - **HSN Codes:** Auto-filled per item type
   - **Tax Rates:** 18% for pipes (configurable)

6. Review:
   - Subtotal (before tax)
   - CGST amount
   - SGST amount
   - OR IGST amount
   - **Grand Total** (including tax)

7. Click **Generate Invoice**
8. **Invoice PDF** generated with GST format

**For Export Invoices:**
5. Currency: USD/EUR/AED
6. Tax Rate: 0% (export)
7. Shipping Terms: FOB, CIF, CFR
8. Export declaration reference

**E-Invoice (Future):**
- System generates e-invoice JSON
- Upload to GST portal for e-invoice number
- (Currently manual, will be automated)

#### **Step 2: Record Payment Receipt**

When customer pays:

1. Go to **Dispatch** → **Payments** tab
2. Click **+ Record Payment**
3. Fill payment details:
   - **Customer:** Select customer
   - **Invoice(s):** Select invoice(s) being paid
   - **Payment Amount:** Amount received
   - **Payment Date:** Date of receipt
   - **Payment Mode:**
     - RTGS
     - NEFT
     - Cheque
     - LC (Letter of Credit)
     - TT (Telegraphic Transfer)
   - **Payment Reference:** Transaction ID, cheque number, etc.
   - **Bank Account:** Which bank account received payment
   - **TDS Deducted:** If customer deducted TDS, enter amount
   - **TDS Certificate:** Upload Form 16A if applicable

4. Click **Record Payment**
5. **Receipt Number** generated - e.g., REC/26/00456

**Partial Payments:**
- If customer pays partial amount:
  - Enter actual amount received
  - Invoice status: **PARTIALLY_PAID**
  - Outstanding = Total - Paid
- When fully paid:
  - Invoice status: **PAID**

#### **Step 3: Track Customer Outstanding**

**Customer Ageing Report:**

1. Go to **Reports** → **Customer Ageing**
2. View outstanding by customer:
   - **0-30 days:** Current
   - **31-60 days:** Watch
   - **61-90 days:** Follow up
   - **90+ days:** Overdue (critical)

3. **Actions:**
   - Send payment reminder emails
   - Call customers with overdue payments
   - Escalate to management if needed
   - Hold new orders if payment significantly overdue

**Payment Reminders:**
- System can send automatic reminders (if configured)
- Customize reminder email template
- Set reminder schedule (e.g., 3 days before due, on due date, 7 days overdue)

---

### 7.3 Tips for Accounts Team

**DO:**
- ✅ Generate invoices promptly after dispatch
- ✅ Verify customer GSTIN before invoicing
- ✅ Apply correct tax (CGST+SGST vs IGST)
- ✅ Record payments same day as receipt
- ✅ Reconcile bank statements with recorded payments
- ✅ Follow up on overdue payments
- ✅ Maintain TDS records

**DON'T:**
- ❌ Invoice without dispatch note/packing list
- ❌ Apply wrong tax rates
- ❌ Forget to record TDS deductions
- ❌ Delay payment recording (affects cash flow reports)

**Common Mistakes:**
- Wrong state code → Incorrect GST calculation
- Not recording TDS → Outstanding shown incorrectly
- Missing payment reference → Hard to reconcile

---

## 8. Management Training

### 8.1 Your Access

- ✅ **View all modules** (read-only for most)
- ✅ **Approve quotations** (critical function)
- ✅ **Approve high-value POs** (if threshold configured)
- ✅ **All MIS dashboards and reports**
- ✅ **Management Review Pack** (ISO 9001)

### 8.2 Key Dashboards

#### **Sales Dashboard**
**Reports → Sales Dashboard**

- Total enquiries (this month, this quarter)
- Quotations prepared (pending, approved, sent)
- Quotation success ratio (Won / Total)
- Revenue trend (monthly chart)
- Top customers by revenue
- Sales funnel visualization

#### **Quotation Analysis**
**Reports → Quotation Analysis**

- Pending vs Approved quotations
- Average quotation response time (Enquiry → Quotation sent)
- Average approval time
- Win/loss analysis
- Quotation ageing (days since created)

#### **Inventory Dashboard**
**Reports → Inventory Dashboard**

- Total stock value (by material category)
- Stock by status (Accepted, Reserved, Under Inspection)
- Heat-wise stock listing
- Location-wise stock

#### **Inventory Ageing**
**Reports → Inventory Ageing**

- Stock older than 30/60/90/180/365 days
- Slow-moving items (no movement in 90+ days)
- Fast-moving items
- Stock turnover ratio

#### **Vendor Performance**
**Reports → Vendor Performance**

- Vendor-wise performance scores
- On-time delivery percentage
- Average delay (in days)
- Total POs per vendor
- Quality rejection rate (from NCRs)

#### **On-Time Delivery (OTD)**
**Reports → On-Time Delivery**

- Overall OTD percentage
- Dispatch date vs promised date
- Late deliveries (days late)
- Customer-wise OTD performance
- Trend chart (last 6 months)

#### **NCR Analysis**
**Reports → NCR Analysis**

- NCR count by vendor
- NCR count by material type
- NCR count by non-conformance type
- Open vs Closed NCRs
- Average NCR closure time
- Trend analysis (monthly NCR count)

#### **Customer Payment Ageing**
**Reports → Customer Ageing**

- Customer-wise outstanding
- Ageing buckets (0-30, 31-60, 61-90, 90+)
- Total outstanding
- Customers with overdue payments

#### **Management Review Pack** (ISO 9001 Clause 9.3)
**Reports → Management Review**

Combined KPIs for quarterly ISO review meeting:
- Customer satisfaction metrics
- Quality objectives achievement
- Process performance (OTD, NCR rate)
- Resource adequacy
- Improvement opportunities
- Actions from previous review

Export as PDF for management meeting.

### 8.3 Quotation Approval Process

**Your Critical Role:**

1. Daily, check: **Quotations → Filter: PENDING_APPROVAL**
2. Review each quotation:
   - Customer name
   - Items being quoted
   - Pricing and margin
   - Offer terms
   - Delivery commitments

3. **Approve or Reject:**
   - Click **Approve** if quotation is good
   - Click **Reject** if issues found
   - Add **Approval Remarks** (especially if rejecting)

4. Approved quotations can be sent by Sales team

**Rejection Reasons:**
- Pricing too low (margin insufficient)
- Delivery commitment unrealistic
- Terms not acceptable
- Missing information

---

### 8.4 Tips for Management

**DO:**
- ✅ Review dashboards daily for key metrics
- ✅ Approve/reject quotations within 24 hours
- ✅ Monitor vendor performance and address poor performers
- ✅ Review NCR trends for quality issues
- ✅ Conduct quarterly management review using system data
- ✅ Use system data for business decisions

**DON'T:**
- ❌ Bypass approval process (weakens controls)
- ❌ Ignore overdue payment alerts
- ❌ Delay quotation approvals (affects sales)

---

## 9. Admin Training

### 9.1 Your Responsibilities

- User management (create, edit, deactivate users)
- Role assignment
- System configuration
- Audit log review
- Master data management
- Backup and system health monitoring

### 9.2 User Management

**Create New User:**

1. Go to **Admin** → **Users** tab
2. Click **+ Create User**
3. Fill user details:
   - **Name:** Full name
   - **Email:** Work email (used for login)
   - **Role:** Select role (determines access)
     - SALES
     - PURCHASE
     - QC
     - STORES
     - ACCOUNTS
     - MANAGEMENT
     - ADMIN
   - **Temporary Password:** User must change on first login
   - **Active:** Check to enable login

4. Click **Create User**
5. User receives email with login credentials

**Edit User:**
- Change role
- Reset password
- Deactivate user (don't delete - preserves audit trail)

**Password Reset:**
- Admin can reset user password
- User will be prompted to change on next login

### 9.3 Audit Log Review

**Track All User Activity:**

1. Go to **Admin** → **Audit Logs** tab
2. Filter by:
   - Date range
   - User
   - Action type (CREATE, UPDATE, DELETE)
   - Module (Quotation, SO, PO, etc.)

3. View audit details:
   - Who did what
   - When (timestamp)
   - Before and after values (for updates)
   - IP address

**Use Cases:**
- Investigate data changes
- Compliance audits (ISO 9001 Clause 7.5)
- Security reviews
- User activity monitoring

### 9.4 Heat Number Traceability

**Critical Feature - PRD Section 6.3:**

1. Go to **Admin** → **Traceability** tab
2. Enter **Heat Number** in search
3. View complete lifecycle:
   - **Purchase:** Which PO, from which vendor
   - **Receipt:** GRN number, received date, MTC
   - **Inspection:** QC results, acceptance status
   - **Reservation:** Reserved for which SO, customer
   - **Dispatch:** Packing list, dispatch note, invoice
   - **Customer:** Final delivery to which customer

**One-Click Drill-Down:**
- Click on any reference to jump to that record
- E.g., Click PO number → Opens PO detail page

---

### 9.5 Tips for Admin

**DO:**
- ✅ Create users with appropriate roles only
- ✅ Deactivate users who leave the company (don't delete)
- ✅ Review audit logs periodically
- ✅ Monitor system performance
- ✅ Ensure daily backups are running
- ✅ Keep master data up-to-date

**DON'T:**
- ❌ Share admin credentials
- ❌ Give all users ADMIN role
- ❌ Delete users (use deactivate instead)
- ❌ Bypass security controls

---

## 10. Common Workflows

### 10.1 End-to-End Process: Enquiry to Payment

**Complete workflow across all departments:**

| Step | Department | Action | System Module |
|------|------------|--------|---------------|
| 1 | Sales | Register customer enquiry | Enquiries |
| 2 | Sales | Check stock availability | Inventory (view) |
| 3 | Sales | Prepare quotation | Quotations |
| 4 | Management | Approve quotation | Quotations |
| 5 | Sales | Send quotation to customer | Quotations (Email) |
| 6 | Sales | Create SO from customer PO | Sales Orders |
| 7 | Sales | Reserve stock (if available) | SO → Reserve Stock |
| 8 | Sales | Create PR (if shortfall) | Purchase Requisitions |
| 9 | Purchase | Approve PR | Purchase Requisitions |
| 10 | Purchase | Create PO to vendor | Purchase Orders |
| 11 | Purchase | Track PO delivery | PO Follow-up |
| 12 | Stores | Receive material (GRN) | Inventory → GRN |
| 13 | QC | Inspect material | Quality → Inspections |
| 14 | QC | Upload MTC | Quality → MTC Repository |
| 15 | QC | Release material (ACCEPTED) | Stock status update |
| 16 | Sales | Reserve newly received stock | SO → Reserve Stock |
| 17 | Stores | Prepare material for dispatch | Physical preparation |
| 18 | Dispatch | Create packing list | Dispatch → Packing Lists |
| 19 | Dispatch | Create dispatch note | Dispatch → Dispatch Notes |
| 20 | Accounts | Generate invoice | Dispatch → Invoices |
| 21 | Accounts | Record payment receipt | Dispatch → Payments |
| 22 | Sales | Close SO | SO status → CLOSED |

---

### 10.2 Quick Task Guides

#### **How to: Find Stock for a Specific Specification**

1. Go to **Inventory** → **Stock** tab
2. Use **Global Search** (top bar) or filters:
   - **Product:** e.g., "C.S. SEAMLESS PIPE"
   - **Material:** e.g., "ASTM A106 GR.B"
   - **Size:** e.g., "6\" NB X SCH 40"
   - **Status:** ACCEPTED (only accepted stock)
3. Click **Search**
4. View available heat numbers with quantities

#### **How to: Find MTC for a Heat Number**

1. Go to **Quality** → **MTC Repository**
2. Enter **Heat Number** in search box
3. Click **Search**
4. View MTC details and download PDF

#### **How to: Check Quotation Status**

1. Go to **Quotations**
2. Find your quotation using:
   - Quotation Number
   - Customer name (search)
   - Date range filter
3. Check **Status** badge:
   - **DRAFT:** Not submitted yet
   - **PENDING_APPROVAL:** Waiting for management
   - **APPROVED:** Can be sent to customer
   - **SENT:** Emailed to customer
   - **WON:** Customer accepted
   - **LOST:** Customer rejected

#### **How to: Track Sales Order Progress**

1. Go to **Sales** → Open SO
2. Check:
   - **Reservation Status:** Reserved / Partially Reserved / Shortfall
   - **Dispatch Status:** Not Dispatched / Partially Dispatched / Fully Dispatched
   - **Invoice Status:** Not Invoiced / Invoiced
   - **Payment Status:** Unpaid / Partially Paid / Paid

---

## 11. Troubleshooting

### 11.1 Common Issues and Solutions

#### **Issue: Can't login**

**Solution:**
- Check email address (case-sensitive)
- Check password (case-sensitive)
- Ensure Caps Lock is OFF
- Check with admin if account is active
- Request password reset from admin

#### **Issue: "Unauthorized" error when accessing a module**

**Solution:**
- Your role doesn't have access to that module
- Contact admin to verify your role assignment
- Admin may need to grant additional permissions

#### **Issue: Can't send quotation - "Buyer email required"**

**Solution:**
- Go back to Enquiry
- Edit enquiry and fill **Buyer Email** field
- Return to quotation and try sending again

#### **Issue: Can't reserve stock for SO - "No matching stock"**

**Solution:**
- Check if specification matches exactly:
  - Product type
  - Material grade
  - Size
  - Additional specs (NACE, HIC, etc.)
- Check if stock status is **ACCEPTED** (not UNDER_INSPECTION or HOLD)
- Check if stock is already **RESERVED** for another SO

#### **Issue: Can't create GRN - "PO not found"**

**Solution:**
- Verify PO number
- Check if PO status is OPEN (not CLOSED or CANCELLED)
- Check if you're selecting the correct vendor

#### **Issue: Can't generate invoice - "Dispatch note required"**

**Solution:**
- Create Dispatch Note first
- Then generate invoice against that dispatch note
- Or select existing dispatch note when creating invoice

#### **Issue: Heat number not showing in traceability**

**Solution:**
- Check if heat number was entered correctly in GRN
- System is case-sensitive - ensure exact match
- Contact admin if heat number was entered incorrectly

---

### 11.2 Who to Contact

| Issue Type | Contact Department |
|------------|-------------------|
| Login problems | Admin |
| Access/permission issues | Admin |
| Quotation approvals | Management |
| Stock availability questions | Stores / Inventory |
| MTC missing/incorrect | QC |
| Invoice/payment issues | Accounts |
| Vendor delivery delays | Purchase |
| System bugs/errors | Admin / IT Support |

---

## 12. Quick Reference

### 12.1 Document Number Formats

| Document | Format | Example | Reset Cycle |
|----------|--------|---------|-------------|
| Enquiry | ENQ/YY/NNNNN | ENQ/26/00012 | Financial Year (April) |
| Quotation | NPS/YY/NNNNN | NPS/26/14501 | Financial Year |
| Sales Order | SO/YY/NNNNN | SO/26/00045 | Financial Year |
| Purchase Req | PR/YY/NNNNN | PR/26/00032 | Financial Year |
| Purchase Order | PO/YY/NNNNN | PO/26/00082 | Financial Year |
| GRN | GRN/YY/NNNNN | GRN/26/00124 | Financial Year |
| Inspection | IR/YY/NNNNN | IR/26/00089 | Financial Year |
| NCR | NCR/YY/NNNNN | NCR/26/00003 | Financial Year |
| Packing List | PL/YY/NNNNN | PL/26/00067 | Financial Year |
| Dispatch Note | DN/YY/NNNNN | DN/26/00056 | Financial Year |
| Invoice | INV/YY/NNNNN | INV/26/00234 | Financial Year |
| Export Invoice | EXP/YY/NNNNN | EXP/26/00045 | Financial Year |
| Receipt | REC/YY/NNNNN | REC/26/00456 | Financial Year |

**Note:** Indian Financial Year runs April to March

### 12.2 Stock Status Flow

```
GRN Created → UNDER_INSPECTION
              ↓
         QC Inspection
              ↓
    ┌─────────┼─────────┐
    ↓         ↓         ↓
ACCEPTED   HOLD    REJECTED
    ↓                   ↓
  Can be            Trigger NCR
 Reserved
    ↓
RESERVED (against SO)
    ↓
DISPATCHED
```

### 12.3 Quotation Types Summary

| Type | Currency | PDF Pages | Use Case |
|------|----------|-----------|----------|
| **DOMESTIC** | INR | 1 page | Indian customers, standard table format |
| **EXPORT** | USD/EUR/AED | 2 pages | International customers, Commercial + Technical sheets |
| **BOM** | INR/USD | 1 page | Large projects, component positions, drawing refs |

### 12.4 User Roles and Access Summary

| Module | Sales | Purchase | QC | Stores | Accounts | Management | Admin |
|--------|-------|----------|----|----|----------|------------|-------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Enquiries | ✅ Create/Edit | View | View | - | - | View | ✅ |
| Quotations | ✅ Create | View | - | - | - | ✅ Approve | ✅ |
| Sales Orders | ✅ Create | View | View | View | View | View | ✅ |
| Purchase | View | ✅ Create/Edit | View | View | View | View | ✅ |
| Inventory | View | View | View | ✅ Create GRN | View | View | ✅ |
| Quality | View | View | ✅ All | View | - | View | ✅ |
| Dispatch | View | View | View | View | ✅ All | View | ✅ |
| Reports | Sales Reports | Purchase Reports | Quality Reports | - | Finance Reports | ✅ All | ✅ All |
| Admin | - | - | - | - | - | - | ✅ All |

---

## Appendix A: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Global search |
| `Ctrl + S` | Save current form (in create/edit pages) |
| `Esc` | Close current dialog/modal |
| `Alt + N` | Create new (in list pages) |
| `Alt + E` | Edit current record (in detail pages) |

---

## Appendix B: Support and Help

**System Support:**
- **Email:** erp-support@npspipe.com
- **Phone:** +91-22-XXXX-XXXX
- **Hours:** Monday-Friday, 9:00 AM - 6:00 PM IST

**Training Requests:**
- **Contact:** training@npspipe.com
- One-on-one training sessions available
- Refresher training quarterly

**Feedback and Suggestions:**
- **Email:** erp-feedback@npspipe.com
- Your feedback helps improve the system!

---

**END OF USER TRAINING MANUAL**

**Document Version:** 1.0
**Last Updated:** February 12, 2026
**Next Review:** May 12, 2026 (Quarterly)
**Prepared By:** ERP Implementation Team

---

**Remember:**
- ✅ The ERP system is your tool - use it consistently!
- ✅ Accurate data entry = Accurate reports
- ✅ Ask for help if unsure - better than making mistakes
- ✅ Report bugs and issues immediately
- ✅ Suggest improvements - we listen!

**Happy ERPing! 🎉**
