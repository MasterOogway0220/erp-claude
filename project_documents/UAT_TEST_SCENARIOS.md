# NPS ERP System - UAT Test Scenarios
**Version:** 1.0
**Date:** February 12, 2026
**Purpose:** User Acceptance Testing - Ready-to-Execute Test Cases

---

## Table of Contents

1. [Test Environment Setup](#1-test-environment-setup)
2. [Test Data](#2-test-data)
3. [UAT Test Cases (All 12)](#3-uat-test-cases)
4. [Test Execution Checklist](#4-test-execution-checklist)
5. [Defect Reporting](#5-defect-reporting)

---

## 1. Test Environment Setup

### 1.1 Prerequisites

- [ ] Test environment is running
- [ ] Database is seeded with master data
- [ ] Test users created for all roles:
  - `sales@erp.com` / `Test@123` (SALES role)
  - `purchase@erp.com` / `Test@123` (PURCHASE role)
  - `qc@erp.com` / `Test@123` (QC role)
  - `stores@erp.com` / `Test@123` (STORES role)
  - `accounts@erp.com` / `Test@123` (ACCOUNTS role)
  - `management@erp.com` / `Test@123` (MANAGEMENT role)
  - `admin@erp.com` / `Admin@123` (ADMIN role - already exists)
- [ ] Email SMTP configured (for quotation email tests)
- [ ] PDF generation working

### 1.2 Test Users Roles and Access

| User | Role | Primary Modules |
|------|------|-----------------|
| sales@erp.com | SALES | Enquiries, Quotations, Sales Orders |
| purchase@erp.com | PURCHASE | Purchase Requisitions, Purchase Orders |
| qc@erp.com | QC | Inspections, NCR, MTC, Lab Letters |
| stores@erp.com | STORES | Inventory, GRN, Stock management |
| accounts@erp.com | ACCOUNTS | Invoices, Payments, Ageing reports |
| management@erp.com | MANAGEMENT | All reports, Quotation approvals |
| admin@erp.com | ADMIN | All modules, User management |

---

## 2. Test Data

### 2.1 Test Customer Data

**Customer 1: Reliance Industries Ltd.**
- Name: Reliance Industries Ltd.
- Address: Reliance Corporate Park, Thane-Belapur Road
- City: Navi Mumbai
- State: Maharashtra
- PIN: 400701
- GST: 27AAACR5055K1Z5
- Contact Person: Mr. Rajesh Kumar
- Email: rajesh.kumar@ril.test (use your actual test email)
- Phone: +91-9876543210

**Customer 2: NTPC Ltd.**
- Name: NTPC Ltd.
- Address: NTPC Bhawan, Scope Complex
- City: New Delhi
- State: Delhi
- PIN: 110003
- GST: 07AAACN4582P1Z3
- Contact Person: Mr. Amit Singh
- Email: amit.singh@ntpc.test (use your actual test email)
- Phone: +91-9988776655
- Project: 2x660MW Solapur Thermal Power Plant

**Customer 3: Saudi Aramco** (Export customer)
- Name: Saudi Aramco
- Address: Dhahran Industrial City
- City: Dhahran
- State: Eastern Province (for export, use as text field)
- Country: Saudi Arabia
- Contact Person: Mr. Ahmed Al-Faris
- Email: ahmed.alfaris@aramco.test (use your actual test email)

### 2.2 Test Product Specifications

**Spec 1:**
- Product: C.S. SEAMLESS PIPE
- Material: ASTM A106 GR.B
- Size: 6" NB X SCH 40
- OD: 168.3 mm
- WT: 7.11 mm
- Unit Weight: 28.264 kg/m
- Ends: BE
- Length: 9.00-11.80 Mtr

**Spec 2:**
- Product: S.S. SEAMLESS PIPE
- Material: ASTM A312 TP316L
- Size: 4" NB X SCH 40S
- OD: 114.3 mm
- WT: 6.02 mm
- Unit Weight: 16.081 kg/m
- Ends: BE
- Length: 5.00-7.00 Mtr

**Spec 3:**
- Product: A.S. SEAMLESS PIPE
- Material: ASTM A335 P11
- Size: 2" NB X SCH 80
- OD: 60.3 mm
- WT: 5.54 mm
- Unit Weight: 7.495 kg/m
- Ends: BE
- Additional Spec: NACE MR0175
- Length: 9.00-12.00 Mtr

### 2.3 Test Vendor Data

**Vendor 1: ISMT Limited**
- Name: ISMT Limited
- Address: MIDC Industrial Area, Butibori
- City: Nagpur
- State: Maharashtra
- GST: 27AABCI5674J1Z9
- Contact: Mr. Vinod Sharma
- Email: vinod@ismt.test
- Phone: +91-712-6634000
- Products: CS Seamless Pipes, AS Seamless Pipes

**Vendor 2: Maharashtra Seamless Ltd. (MSL)**
- Name: Maharashtra Seamless Ltd.
- Address: Plot No. 1, MIDC Kagal
- City: Kolhapur
- State: Maharashtra
- GST: 27AABCM5634L1Z2
- Contact: Mr. Prakash Desai
- Email: prakash@msl.test
- Phone: +91-231-2666000
- Products: AS Seamless Pipes, Alloy Steel Pipes

---

## 3. UAT Test Cases

### **UAT-001: Create Enquiry, Prepare Quotation, Approve, Email to Customer**
**Priority:** CRITICAL
**PRD Reference:** Section 5.1
**Estimated Time:** 30 minutes

#### **Objective:**
Test the complete quotation workflow from enquiry registration to emailing professional PDF matching template.

#### **Test Steps:**

**STEP 1: Register Customer Enquiry (as Sales User)**

1. Login as `sales@erp.com` / `Test@123`
2. Navigate to **Enquiries** → Click **+ Create Enquiry**
3. Fill enquiry form:
   - Customer: Select **Reliance Industries Ltd.** (or create if not exists)
   - Buyer Name: `Mr. Rajesh Kumar`
   - Buyer Designation: `Senior Manager - Procurement`
   - Buyer Email: `{your-test-email}@gmail.com` ⚠️ USE REAL EMAIL TO TEST
   - Buyer Contact: `+91-9876543210`
   - Client Inquiry No.: `RIL/PUR/2026/0045`
   - Inquiry Date: Select today's date
   - Enquiry Mode: **EMAIL**
   - Project Name: `Jamnagar Refinery Expansion`

4. **Add Line Items:**

   **Item 1:**
   - Click **+ Add Item**
   - Product: `C.S. SEAMLESS PIPE`
   - Material: `ASTM A106 GR.B` (select from filtered list)
   - Size: Search and select `6" NB X SCH 40`
     - Verify auto-fill: OD = 168.3, WT = 7.11, Unit Weight = 28.264
   - Length: `9.00-11.80 Mtr`
   - Ends: `BE`
   - Quantity: `500` (meters)
   - Remarks: `For high-pressure steam lines`

   **Item 2:**
   - Click **+ Add Item**
   - Product: `S.S. SEAMLESS PIPE`
   - Material: `ASTM A312 TP316L`
   - Size: `4" NB X SCH 40S`
     - Verify auto-fill: OD = 114.3, WT = 6.02, Unit Weight = 16.081
   - Length: `5.00-7.00 Mtr`
   - Ends: `BE`
   - Quantity: `300` (meters)
   - Remarks: `For chemical process lines`

5. Click **Create Enquiry**
6. **Capture:** Note the Enquiry Number (e.g., ENQ/26/00001)
7. **Verify:** Enquiry appears in enquiry list with status **OPEN**

**Expected Result:** ✅ Enquiry created successfully with all details captured

---

**STEP 2: Prepare Quotation from Enquiry**

8. From Enquiries list, click on the enquiry number to view details
9. Click **Create Quotation** button
10. Quotation form opens with pre-filled data:
    - **Verify:** Customer auto-filled
    - **Verify:** Items auto-filled from enquiry
    - **Verify:** Buyer details auto-filled
11. Select **Quotation Type:** `DOMESTIC`
12. **Verify:** Currency auto-set to `INR`
13. Valid Until: Set to 6 days from today (or auto-calculated if implemented)

14. **Fill Pricing for Items:**

    **Item 1 (CS 6" NB X SCH 40):**
    - Unit Rate: `850.00` (INR/Mtr)
    - **Verify:** Amount auto-calculated: 500 × 850 = `425,000.00`
    - **Verify:** Total Weight MT: 500 × 28.264 / 1000 = `14.1320 MT`
    - Delivery: `6-8 Weeks`
    - Additional Spec: (leave blank or add `API 5L GR.B`)

    **Item 2 (SS 4" NB X SCH 40S):**
    - Unit Rate: `2,450.00` (INR/Mtr)
    - **Verify:** Amount: 300 × 2,450 = `735,000.00`
    - **Verify:** Total Weight MT: 300 × 16.081 / 1000 = `4.8243 MT`
    - Delivery: `8-10 Weeks`

15. **Verify Totals at Bottom:**
    - Total Amount: INR `1,160,000.00`
    - Total Weight: `18.9563 MT`

16. **Review Offer Terms** (should be pre-filled with 15 standard terms)
    - Verify all 15 terms are present
    - Edit if needed (e.g., change delivery location)

17. Click **Create Quotation**
18. **Capture:** Note Quotation Number (e.g., NPS/26/14501)
19. **Verify:** Quotation status is **DRAFT**

**Expected Result:** ✅ Quotation created with status DRAFT, all calculations correct

---

**STEP 3: Submit for Approval**

20. From Quotations list, click quotation number to view details
21. Review all details one final time
22. Click **Submit for Approval** button
23. Confirm submission
24. **Verify:** Status changes to **PENDING_APPROVAL**
25. **Verify:** "Submit for Approval" button is now disabled/hidden

**Expected Result:** ✅ Quotation submitted, status = PENDING_APPROVAL

---

**STEP 4: Approve Quotation (as Management User)**

26. Logout from Sales user
27. Login as `management@erp.com` / `Test@123`
28. Navigate to **Quotations**
29. Filter by Status: **PENDING_APPROVAL**
30. Click on the quotation to view details
31. Review:
    - Customer details
    - Items and pricing
    - Margins (if visible)
    - Offer terms
32. Click **Approve** button
33. In approval dialog:
    - Approval Remarks: `Approved. Good margins. Proceed to send.`
34. Click **Confirm Approval**
35. **Verify:** Status changes to **APPROVED**
36. **Verify:** Version shows `Rev.1` (first approved version)
37. **Verify:** Approval date and approver name displayed

**Expected Result:** ✅ Quotation approved, status = APPROVED, Rev.1

---

**STEP 5: Generate and Review PDF**

38. Still as management or switch back to sales user
39. Open the approved quotation
40. Click **Generate PDF** or **Download PDF** button
41. PDF downloads/opens in new tab
42. **Review PDF Content:**
    - ✅ Company letterhead visible
    - ✅ Quotation number (NPS/26/14501) on top right
    - ✅ Quotation date on top right
    - ✅ Customer name and address on left
    - ✅ Buyer name, designation, email visible
    - ✅ Client inquiry reference visible
    - ✅ Valid until date visible
    - ✅ Prepared by name and email visible
    - ✅ **Table format:**
      - S/N column
      - Product/Material column (with sub-text for material grade)
      - Size column (with sub-text for ends)
      - Qty (Mtr) column
      - Rate (INR/Mtr) column
      - Amount (INR) column
    - ✅ Item 1 details all visible and correct
    - ✅ Item 2 details all visible and correct
    - ✅ Total row showing: INR 1,160,000.00
    - ✅ Total Weight row showing: 18.9563 MT
    - ✅ **Offer Terms section** with all 15 terms formatted correctly
    - ✅ Footer text:
      - "This is a computer generated document hence not signed."
      - "YOUR ORDER WILL BE GREATLY APPRECIATED..."
      - Registered address visible
    - ✅ Professional layout, readable fonts, proper spacing

43. **Compare with PRD template** (PIPES_QUOTATION_FORMAT.xlsx)
    - Verify format matches template

**Expected Result:** ✅ PDF generated matching PRD template exactly, professional quality

---

**STEP 6: Send Quotation Email to Customer**

44. Login as `sales@erp.com` (if not already)
45. Open the approved quotation
46. Click **Send Email** button
47. Email dialog opens:
    - **Verify:** To: Pre-filled with `{your-test-email}@gmail.com` (buyer email from enquiry)
    - CC: (leave blank or add `sales@npspipe.com`)
    - Subject: **Verify default:** `Quotation NPS/26/14501 - Reliance Industries Ltd.`
      - Edit if needed to: `Quotation for Jamnagar Refinery - Pipes Supply`
    - Message: **Verify default message** is populated
      - Edit to add personal touch:
        ```
        Dear Mr. Rajesh Kumar,

        Thank you for your inquiry dated [today's date] for pipes required for Jamnagar Refinery Expansion project.

        Please find attached our competitive quotation for your reference. We have quoted for both Carbon Steel and Stainless Steel seamless pipes as per your requirements.

        Key highlights:
        - Total Quantity: 800 meters (500m CS + 300m SS)
        - Total Value: INR 11,60,000.00
        - Delivery: 6-10 weeks ex-works
        - Valid until: [6 days from today]

        Should you require any clarification or technical details, please feel free to contact us.

        We look forward to your valued order.

        Best regards,
        Sales Team
        ```

48. Click **Send Email**
49. **Verify:** Success message appears: "Quotation sent successfully"
50. **Verify:** Quotation status changes to **SENT**
51. **Verify:** Sent Date and Sent To email are recorded

**Expected Result:** ✅ Email sent successfully, status = SENT

---

**STEP 7: Verify Email Receipt**

52. Open your test email inbox (the email you used for buyer)
53. **Check for email:**
    - ✅ Email received within 1-2 minutes
    - ✅ From: NPS Piping <noreply@npspipe.com> or configured sender
    - ✅ Subject: Matches what was entered
    - ✅ **Email Body:**
      - Professional HTML formatting
      - Greeting with buyer name
      - Custom message visible
      - Quotation summary box showing:
        - Customer: Reliance Industries Ltd.
        - Date: Today's date
        - Total Items: 2
        - Total Amount: INR 1,160,000.00
        - Valid Until: [date]
      - Closing with prepared by name and email
      - Footer text
    - ✅ **PDF Attachment:**
      - File name: NPS-26-14501.pdf
      - File size: ~50-100 KB (reasonable size)
      - Opens correctly when clicked
      - Matches PDF from Step 5

54. Forward this email to management/test coordinator for record

**Expected Result:** ✅ Professional email received with correct PDF attached

---

#### **Test Completion Checklist:**

- [ ] Enquiry created successfully
- [ ] Quotation prepared from enquiry with all items pre-filled
- [ ] Pricing and calculations correct
- [ ] Quotation submitted for approval
- [ ] Management user can see pending quotation
- [ ] Quotation approved successfully with remarks
- [ ] PDF generated matching PRD template
- [ ] Email sent successfully
- [ ] Email received with professional formatting
- [ ] PDF attachment correct and opens properly
- [ ] Quotation status updated to SENT
- [ ] All audit trail captured (who created, who approved, when sent)

#### **Pass Criteria:**
- All checkboxes above must be ✅
- PDF must match template format from PRD
- Email must be professional and deliver within 2 minutes
- NO errors or crashes during workflow

#### **Defects Found:**
_(Record any issues below)_

| # | Issue Description | Severity | Screenshot |
|---|-------------------|----------|------------|
| 1 | | | |
| 2 | | | |

---

### **UAT-002: Export Quotation (Commercial + Technical Sheets)**
**Priority:** CRITICAL
**PRD Reference:** Section 5.1.3, Appendix C
**Estimated Time:** 25 minutes

#### **Objective:**
Verify dual-sheet export quotation generation (Commercial with pricing + Technical with "QUOTED")

#### **Test Steps:**

**STEP 1: Create Enquiry for Export Customer**

1. Login as `sales@erp.com`
2. Navigate to **Enquiries** → **+ Create Enquiry**
3. Fill enquiry:
   - Customer: **Saudi Aramco** (create if not exists)
   - Buyer Name: `Mr. Ahmed Al-Faris`
   - Buyer Email: `{your-test-email}@gmail.com`
   - Client Inquiry No.: `ARAMCO/SCM/2026/1234`
   - Project Name: `Jafurah Gas Field Development`

4. **Add Export Line Items:**

   **Item 1:**
   - Product: `C.S. SEAMLESS PIPE`
   - Material: `API 5L GR. X65 PSL-2`
   - Size: `10" NB X SCH XS`
   - Additional Spec: `NACE MR0175/MR0103`
   - Length: `10.00-12.00 Mtr`
   - Ends: `BE`
   - Quantity: `1200` Mtr
   - Remarks: `For sour gas service, H2S environment`

   **Item 2:**
   - Product: `S.S. SEAMLESS PIPE`
   - Material: `ASTM A312 TP316L`
   - Size: `8" NB X SCH 40S`
   - Length: `9.00-11.80 Mtr`
   - Ends: `BE`
   - Quantity: `800` Mtr
   - Remarks: `For water injection lines`

5. Click **Create Enquiry**
6. Note Enquiry Number

**Expected Result:** ✅ Export enquiry created

---

**STEP 2: Create Export Quotation**

7. From enquiry detail, click **Create Quotation**
8. **CRITICAL:** Select Quotation Type: **EXPORT**
9. **Verify:** Currency auto-changes to **USD**
10. Items pre-filled from enquiry

11. **Fill Export-Specific Fields:**

    **For Item 1 (10" NB CS X65):**
    - Unit Rate (USD/Mtr): `125.00`
    - Amount auto-calc: 1200 × 125 = `150,000.00 USD`
    - **Tag Number:** `P-101`
    - **Drawing Reference:** `DWG-JGF-001`
    - **Certificate Requirements:** `EN 10204 3.2, NACE MR0175`
    - **Item Description (Rich Text):**
      ```
      CARBON STEEL SEAMLESS PIPE AS PER API 5L GR. X65 PSL-2
      SIZE: 10" NB X SCH XS | OD: 273.1mm | WT: 12.70mm
      ENDS: BEVELED END (BE) | LENGTH: 10.00-12.00 Meters Random
      ADDITIONAL SPEC: NACE MR0175/MR0103 for Sour Gas Service
      TAG NO: P-101 | DWG REF: DWG-JGF-001
      CERTIFICATE: EN 10204 3.2 MTC + TPI by BVIS
      ```

    **For Item 2 (8" NB SS 316L):**
    - Unit Rate (USD/Mtr): `245.00`
    - Amount: 800 × 245 = `196,000.00 USD`
    - **Tag Number:** `P-102`
    - **Drawing Reference:** `DWG-JGF-002`
    - **Certificate Requirements:** `EN 10204 3.1`
    - **Item Description:**
      ```
      STAINLESS STEEL SEAMLESS PIPE AS PER ASTM A312 TP316L
      SIZE: 8" NB X SCH 40S | OD: 219.1mm | WT: 8.18mm
      ENDS: BEVELED END (BE) | LENGTH: 9.00-11.80 Meters Random
      TAG NO: P-102 | DWG REF: DWG-JGF-002
      CERTIFICATE: EN 10204 3.1 MTC
      ```

12. **Verify Totals:**
    - Total: USD `346,000.00`
    - Total Weight: (calculate manually to verify)

13. **Review Offer Terms** (edit for export):
    - Price: `FOB Jebel Ali, UAE`
    - Delivery: `12-14 Weeks from PO`
    - Payment: `30% Advance, 70% against shipping documents`
    - Certification: `EN 10204 3.1 & 3.2 as specified`

14. **Scroll to Bottom:**
    - **Verify:** **9 Export Notes Preview Box** is visible
    - Read through all 9 notes
    - Verify they match PRD Appendix C

15. Click **Create Quotation**
16. Note Quotation Number (e.g., NPS/26/14502)

**Expected Result:** ✅ Export quotation created with USD currency

---

**STEP 3: Submit and Approve**

17. Submit quotation for approval
18. Login as `management@erp.com`
19. Approve the export quotation
20. Status → **APPROVED**

**Expected Result:** ✅ Export quotation approved

---

**STEP 4: Generate Dual-Sheet PDF**

21. Login as `sales@erp.com`
22. Open approved export quotation
23. Click **Generate PDF** or **Download PDF**
24. **CRITICAL VERIFICATION:**
    - ✅ PDF has **2 PAGES** (not 1!)

**PAGE 1: COMMERCIAL QUOTATION**
25. Review Commercial Sheet:
    - ✅ Title: "COMMERCIAL QUOTATION" (centered, bold)
    - ✅ Quotation number visible (NPS/26/14502)
    - ✅ Currency: USD
    - ✅ Customer: Saudi Aramco
    - ✅ **Items Section:**
      - S/N column
      - **Item Description column** (wide, multi-line)
      - Qty (Mtr) column
      - Rate (USD/Mtr) column
      - Amount (USD) column
    - ✅ Item 1 description shows full rich-text (TAG NO, DWG REF, CERT visible)
    - ✅ Item 2 description shows full rich-text
    - ✅ **Pricing VISIBLE:**
      - Rate column shows: 125.00, 245.00
      - Amount column shows: 150,000.00, 196,000.00
      - **Total shows: USD 346,000.00**
    - ✅ Offer terms section visible
    - ✅ **9 EXPORT NOTES section:**
      - Heading: "NOTES:"
      - All 9 notes numbered and listed
      - Text matches PRD Appendix C exactly
    - ✅ Footer with standard text

**PAGE 2: TECHNICAL QUOTATION**
26. Review Technical Sheet:
    - ✅ Title: "TECHNICAL QUOTATION" (not "Commercial")
    - ✅ Same quotation number
    - ✅ Same customer
    - ✅ **Items Section:**
      - Same layout as Commercial
      - Same item descriptions
      - Same quantities
    - ✅ **Pricing HIDDEN:**
      - Rate column shows: **"QUOTED"** (not 125.00)
      - Amount column shows: **"QUOTED"** (not 150,000.00)
      - **Total amount NOT SHOWN** (row hidden or removed)
    - ✅ Total Weight row still shows
    - ✅ Offer terms visible (same as Commercial)
    - ✅ 9 Export Notes visible (same as Commercial)
    - ✅ Footer visible

27. **Compare Both Sheets:**
    - ✅ Only difference: Pricing visible vs "QUOTED"
    - ✅ All other content identical

**Expected Result:** ✅ Dual-sheet PDF with Commercial (pricing) + Technical ("QUOTED")

---

**STEP 5: Email Verification**

28. Send export quotation via email
29. Check received email:
    - ✅ PDF attachment opens showing 2 pages
    - ✅ Both pages in single PDF file
    - ✅ Commercial sheet (Page 1) for customer pricing review
    - ✅ Technical sheet (Page 2) for engineering/project team

**Expected Result:** ✅ Email with 2-page PDF received correctly

---

#### **Test Completion Checklist:**

- [ ] Export quotation type selected
- [ ] Currency auto-changed to USD
- [ ] Export-specific fields (Tag No, Drawing Ref, Cert Req) visible
- [ ] Item description rich-text field works
- [ ] 9 Export Notes preview box shows during creation
- [ ] PDF generates 2 pages (not 1)
- [ ] Page 1 (Commercial) shows full pricing
- [ ] Page 2 (Technical) shows "QUOTED" instead of prices
- [ ] 9 Export Notes appear on both pages
- [ ] Email delivers 2-page PDF correctly
- [ ] Format matches export template

#### **Pass Criteria:**
- **MUST have 2 pages in PDF** (dual-sheet requirement)
- Page 2 MUST show "QUOTED" (not actual pricing)
- All 9 notes from PRD Appendix C must appear
- Rich-text item descriptions must be preserved

---

### **UAT-003: Create SO → Auto-Reserve Inventory (FIFO)**
**Priority:** CRITICAL
**PRD Reference:** Section 5.2.3
**Estimated Time:** 20 minutes

#### **Objective:**
Test inventory reservation with FIFO (First In First Out) ordering by MTC date.

#### **Prerequisites:**
- At least 2-3 inventory records for same specification with different MTC dates
- Stock status: ACCEPTED (not UNDER_INSPECTION or RESERVED)

#### **Test Data Setup (if not already present):**

Create 3 inventory batches for **6" NB X SCH 40, CS SEAMLESS, A106 GR.B**:

**Batch 1 (Oldest - FIFO first):**
- Heat No: `TEST-HEAT-001`
- Quantity: 200 Mtr
- MTC Date: 2025-11-15 (oldest)
- Make: ISMT
- Status: ACCEPTED

**Batch 2 (Middle):**
- Heat No: `TEST-HEAT-002`
- Quantity: 350 Mtr
- MTC Date: 2025-12-20
- Make: ISMT
- Status: ACCEPTED

**Batch 3 (Newest - FIFO last):**
- Heat No: `TEST-HEAT-003`
- Quantity: 450 Mtr
- MTC Date: 2026-01-10 (newest)
- Make: ISMT
- Status: ACCEPTED

**Total Available:** 1000 Mtr (200 + 350 + 450)

---

#### **Test Steps:**

**STEP 1: Create Sales Order**

1. Login as `sales@erp.com`
2. Navigate to **Sales** → **+ Create Sales Order**
3. Fill SO form:
   - Customer: **Reliance Industries Ltd.**
   - Customer PO Number: `RIL-PO-2026-0123`
   - Customer PO Date: Today
   - Upload PO: (Optional) Upload sample PDF

4. **Add Line Item:**
   - Product: `C.S. SEAMLESS PIPE`
   - Material: `ASTM A106 GR.B`
   - Size: `6" NB X SCH 40`
   - Quantity: `500` Mtr (note: we have 1000 total, so can fulfill)
   - Unit Rate: `850.00` (from previous quotation)
   - Delivery Date: 60 days from today

5. Click **Create Sales Order**
6. Note SO Number (e.g., SO/26/00001)

**Expected Result:** ✅ SO created successfully

---

**STEP 2: Reserve Stock (FIFO Verification)**

7. From SO detail page, click **Reserve Stock** button/tab
8. System shows **Stock Reservation** page
9. **For the line item (6" NB X SCH 40), verify:**

   **Available Stock List:**
   - ✅ System shows 3 heat numbers
   - ✅ **CRITICAL: Stock sorted by MTC Date (oldest first)**
   - ✅ Order should be:
     1. **TEST-HEAT-001** (MTC: 2025-11-15) - 200 Mtr available
     2. **TEST-HEAT-002** (MTC: 2025-12-20) - 350 Mtr available
     3. **TEST-HEAT-003** (MTC: 2026-01-10) - 450 Mtr available

10. **Reserve Following FIFO Logic:**

    **Reservation 1:**
    - Select Heat No: `TEST-HEAT-001`
    - Reserved Qty: `200` Mtr (full quantity from oldest batch)
    - Click **Reserve**

    **Reservation 2:**
    - Select Heat No: `TEST-HEAT-002`
    - Reserved Qty: `300` Mtr (partial quantity from middle batch)
    - Click **Reserve**

    **Summary:**
    - Required: 500 Mtr
    - Reserved: 200 + 300 = 500 Mtr
    - Shortfall: 0 Mtr
    - ✅ **Newest batch (TEST-HEAT-003) NOT touched** (FIFO followed)

11. Click **Save Reservations** or **Confirm**

**Expected Result:** ✅ Stock reserved following FIFO, oldest batches used first

---

**STEP 3: Verify Reservation Impact**

12. Navigate to **Inventory** → **Stock** tab
13. Search for heat numbers:

    **TEST-HEAT-001:**
    - ✅ Status changed to: **RESERVED**
    - ✅ Reserved Qty: 200 Mtr
    - ✅ Reserved For: SO/26/00001
    - ✅ Available Qty: 0 Mtr

    **TEST-HEAT-002:**
    - ✅ Status: **RESERVED** (or PARTIALLY_RESERVED if implemented)
    - ✅ Reserved Qty: 300 Mtr
    - ✅ Reserved For: SO/26/00001
    - ✅ Available Qty: 50 Mtr (350 - 300)

    **TEST-HEAT-003:**
    - ✅ Status: **ACCEPTED** (unchanged)
    - ✅ Reserved Qty: 0 Mtr
    - ✅ Available Qty: 450 Mtr (full quantity still available)

**Expected Result:** ✅ Reservation recorded correctly, FIFO logic enforced

---

**STEP 4: Test Shortfall Scenario**

14. Create another SO for same specification
15. Quantity: `600` Mtr (more than available unreserved stock)
16. Try to reserve stock:
    - Available unreserved: 50 (from HEAT-002) + 450 (from HEAT-003) = 500 Mtr
    - Required: 600 Mtr
    - **Shortfall:** 100 Mtr

17. **Verify:**
    - ✅ System shows shortfall: 100 Mtr
    - ✅ Button/option to **Create PR from Shortfall** appears
    - ✅ Can reserve 500 Mtr (partial reservation)

18. Click **Create PR from Shortfall**
19. PR creation page opens with:
    - ✅ Item pre-filled
    - ✅ Quantity: 100 Mtr (the shortfall)
    - ✅ Linked to SO

**Expected Result:** ✅ Shortfall detected, auto PR creation works

---

#### **Test Completion Checklist:**

- [ ] SO created successfully
- [ ] Stock reservation page shows available stock
- [ ] Stock sorted by MTC date (FIFO - oldest first)
- [ ] Can select heat numbers to reserve
- [ ] Reserved quantity tracked per heat number
- [ ] Stock status changes to RESERVED
- [ ] Available quantity decreases after reservation
- [ ] SO shows reserved status
- [ ] Shortfall detection works
- [ ] Auto PR creation from shortfall works
- [ ] Cannot reserve UNDER_INSPECTION or HOLD stock

#### **Pass Criteria:**
- Stock MUST be sorted by MTC date (FIFO)
- Oldest stock should be suggested/reserved first
- Reserved stock should be excluded from other SOs
- Shortfall calculation accurate

---

### **UAT-004: Full Cycle - Enquiry to Invoice with Heat Traceability**
**Priority:** CRITICAL
**PRD Reference:** Section 6.1 (End-to-End Flow), Section 6.3 (Heat Traceability)
**Estimated Time:** 60-90 minutes

#### **Objective:**
Execute complete end-to-end workflow across all departments, then verify heat number traceability.

#### **Test Flow:**

**PHASE 1: Sales (Enquiry to SO)**
1. Create Enquiry → Create Quotation → Approve → Send Email → Create SO → Reserve Stock
   - _(Follow steps from UAT-001 and UAT-003)_
   - Note Heat Number reserved: e.g., `E2E-HEAT-12345`

**PHASE 2: Purchase (PR to PO)**
2. If shortfall exists, create PR
3. Approve PR (as management)
4. Create PO from PR (as purchase)
   - Vendor: ISMT
   - Expected Delivery: 30 days
   - Note PO Number: e.g., PO/26/00010

**PHASE 3: Stores (Material Receipt)**
5. Login as `stores@erp.com`
6. Create GRN against PO
   - Received Qty: (as per PO)
   - **Heat Number:** `E2E-HEAT-67890` (new heat for traceability test)
   - MTC No: `MTC-TEST-2026-001`
   - MTC Date: Today
   - Upload MTC PDF (sample)
   - Status auto-set: UNDER_INSPECTION
   - Note GRN Number: e.g., GRN/26/00015

**PHASE 4: Quality (Inspection & MTC)**
7. Login as `qc@erp.com`
8. Create Inspection for GRN/26/00015
   - Visual: PASS
   - Dimensional: PASS (all within tolerance)
   - Chemical: PASS (enter sample values)
   - Mechanical: PASS
   - Overall Result: **PASS**
9. Stock status auto-changes to: **ACCEPTED**
10. Upload MTC to MTC Repository
    - Link to Heat No: E2E-HEAT-67890
    - Link to GRN: GRN/26/00015
    - Link to PO: PO/26/00010

**PHASE 5: Sales (Reserve New Stock)**
11. Login as `sales@erp.com`
12. Go to original SO
13. Reserve newly received stock (E2E-HEAT-67890) for remaining shortfall

**PHASE 6: Dispatch (Packing & Dispatch)**
14. Login as `stores@erp.com` or dispatch user
15. Create Packing List for SO
    - Heat Numbers: E2E-HEAT-12345 + E2E-HEAT-67890
    - Pieces per heat
    - Bundle details
    - Note Packing List No: PL/26/00005
16. Create Dispatch Note
    - Link to Packing List
    - Vehicle No: MH-01-AB-1234
    - LR No: LR-123456
    - E-Way Bill: 123456789012
    - Note Dispatch Note No: DN/26/00004

**PHASE 7: Accounts (Invoice & Payment)**
17. Login as `accounts@erp.com`
18. Create Invoice from Dispatch Note
    - Invoice Type: Domestic
    - Verify GST calculation
    - Note Invoice No: INV/26/00025
19. Record Payment Receipt
    - Amount: Full invoice amount
    - Payment Mode: RTGS
    - Payment Ref: RTGS-2026-001234
    - Note Receipt No: REC/26/00012

**PHASE 8: Heat Number Traceability**
20. Login as `admin@erp.com` or any user
21. Go to **Admin** → **Traceability** OR use Global Search
22. Search for Heat Number: `E2E-HEAT-67890`
23. **Verify Complete Lifecycle:**
    - ✅ **Purchase:**
      - PO Number: PO/26/00010
      - Vendor: ISMT
      - Order Date: [date]
    - ✅ **Receipt:**
      - GRN Number: GRN/26/00015
      - Received Date: [date]
      - Received Qty: [qty] Mtr
    - ✅ **MTC:**
      - MTC Number: MTC-TEST-2026-001
      - MTC Date: [date]
      - MTC Type: 3.2
      - Download MTC PDF link
    - ✅ **Inspection:**
      - Inspection Report: IR/26/[xxx]
      - Result: PASS
      - Inspection Date: [date]
    - ✅ **Reservation:**
      - Reserved for SO: SO/26/00001
      - Customer: Reliance Industries Ltd.
      - Reserved Qty: [qty] Mtr
    - ✅ **Dispatch:**
      - Packing List: PL/26/00005
      - Dispatch Note: DN/26/00004
      - Dispatch Date: [date]
      - Vehicle No: MH-01-AB-1234
    - ✅ **Invoice:**
      - Invoice Number: INV/26/00025
      - Invoice Date: [date]
      - Invoice Amount: [amount]
    - ✅ **Payment:**
      - Receipt Number: REC/26/00012
      - Payment Date: [date]
      - Payment Mode: RTGS

24. **Click on each reference** to drill down:
    - Click PO/26/00010 → Opens PO detail page
    - Click GRN/26/00015 → Opens GRN detail page
    - Click SO/26/00001 → Opens SO detail page
    - Click INV/26/00025 → Opens Invoice detail page
    - **Verify all cross-links work**

**Expected Result:** ✅ Complete traceability from purchase to payment for single heat number

---

#### **Test Completion Checklist:**

- [ ] Complete workflow executed without errors
- [ ] Each phase completed by appropriate user role
- [ ] All document numbers generated correctly
- [ ] Heat number entered at GRN
- [ ] Heat number linked to MTC
- [ ] Heat number reserved for SO
- [ ] Heat number appears in packing list
- [ ] Heat number traceable end-to-end
- [ ] Traceability page shows all lifecycle stages
- [ ] All drill-down links work
- [ ] Backward traceability works (from invoice → find heat)
- [ ] Forward traceability works (from heat → find invoice)

#### **Pass Criteria:**
- **CRITICAL:** Complete traceability chain must be intact
- No broken links in traceability
- All document references clickable and navigate correctly
- PRD Section 6.3 requirement met: "single most important feature"

---

### **UAT-005: Receive Material → GRN → MTC Upload → QC**
**Priority:** CRITICAL
**PRD Reference:** Section 5.4.1, 5.5
**Estimated Time:** 30 minutes

#### **Test Steps:**

**STEP 1: Create GRN**
1. Login as `stores@erp.com`
2. Create GRN against a PO (use existing PO or create new)
3. Fill GRN details:
   - Heat No: `QC-TEST-HEAT-999`
   - Qty: 250 Mtr
   - Pieces: 42
   - MTC No: `MTC-QC-TEST-001`
   - MTC Date: Today
   - **Upload MTC PDF** (critical - use sample PDF)
   - TPI Agency: BVIS
   - **Upload TPI Certificate** (sample PDF)
4. Click Create GRN
5. **Verify:** Stock status = UNDER_INSPECTION

**Expected Result:** ✅ GRN created, material in UNDER_INSPECTION status

---

**STEP 2: QC Inspection**
6. Login as `qc@erp.com`
7. Go to Quality → Inspections → + Create Inspection
8. Select GRN from dropdown
9. Material details auto-fill
10. **Fill Inspection Parameters:**
    - Visual Inspection: PASS, Remarks: "No surface defects"
    - Dimensional Check:
      - Measured OD: 168.5 mm (within tolerance of 168.3 ± 0.5)
      - Measured WT: 7.15 mm (within tolerance of 7.11 ± 0.08)
      - Length: Random 9.5 - 11.2 Mtr
      - Result: Within Tolerance ✓
    - Chemical Analysis:
      - C: 0.28%
      - Mn: 0.85%
      - Si: 0.25%
      - S: 0.018%
      - P: 0.020%
      - (All within ASTM A106 GR.B limits)
    - Mechanical Properties:
      - Yield: 285 MPa (min 240)
      - Tensile: 485 MPa (min 415)
      - Elongation: 28% (min 20%)
      - Result: PASS ✓
    - Hardness Test: 85 HRB (acceptable range)
    - Flattening Test: PASS
    - Flaring Test: PASS
11. **Overall Result:** PASS
12. Upload evidence: (optional photos)
13. Click **Submit Inspection**

**Expected Result:** ✅ Inspection recorded, overall result = PASS

---

**STEP 3: Stock Status Update**
14. **Verify:** Stock status auto-changes from UNDER_INSPECTION to **ACCEPTED**
15. Navigate to Inventory → Stock
16. Search for heat QC-TEST-HEAT-999
17. **Verify:**
    - Status: ACCEPTED
    - Available for reservation
    - Linked Inspection Report visible

**Expected Result:** ✅ Stock status = ACCEPTED after QC pass

---

**STEP 4: MTC Repository**
18. Navigate to Quality → MTC Repository
19. Search for Heat No: QC-TEST-HEAT-999
20. **Verify:**
    - MTC found in repository
    - MTC Number: MTC-QC-TEST-001
    - Linked to correct heat number
    - Linked to GRN
    - Linked to PO
    - **PDF download link** works
21. Click Download MTC PDF
22. **Verify:** PDF opens correctly (the one uploaded in GRN)

**Expected Result:** ✅ MTC searchable, downloadable, linked correctly

---

**STEP 5: Test Rejection Flow**
23. Create another GRN with Heat No: `QC-REJECT-HEAT-001`
24. Create Inspection
25. **Fill with FAIL result:**
    - Visual: FAIL - "Rust spots visible"
    - Dimensional: FAIL - "WT below min: 6.8mm (min 7.03mm)"
    - Overall Result: **FAIL**
26. Upload evidence photos
27. Submit Inspection
28. **Verify:**
    - Stock status: **REJECTED**
    - NCR auto-created OR prompt to create NCR

29. If not auto-created, create NCR:
    - Link to GRN
    - Link to Heat No: QC-REJECT-HEAT-001
    - Non-conformance Type: Dimensional
    - Description: "Wall thickness below specification. Min required: 7.03mm, Measured: 6.8mm"
    - Disposition: **Return to Vendor**
    - Status: OPEN
30. Submit NCR
31. **Verify:**
    - NCR Number generated: NCR/26/00001
    - NCR linked to heat number
    - NCR visible in Quality → NCR tab

**Expected Result:** ✅ Rejection flow works, NCR created, stock status = REJECTED

---

#### **Test Completion Checklist:**

- [ ] GRN created successfully
- [ ] MTC PDF uploaded
- [ ] Stock initially in UNDER_INSPECTION status
- [ ] QC inspection form allows all parameter entry
- [ ] Inspection result calculated correctly
- [ ] PASS result changes stock to ACCEPTED
- [ ] MTC searchable in repository
- [ ] MTC downloadable
- [ ] MTC linked to heat, GRN, PO
- [ ] FAIL result changes stock to REJECTED
- [ ] NCR triggered/created for rejected stock
- [ ] Cannot reserve REJECTED stock

#### **Pass Criteria:**
- Stock status workflow must work: UNDER_INSPECTION → ACCEPTED/REJECTED
- MTC must be mandatory (system should warn if not uploaded)
- Inspection results must update stock status automatically

---

### **UAT-006: Raise NCR for Rejected Material → Complete CAPA Cycle**
**Priority:** HIGH
**PRD Reference:** Section 5.5.3 (NCR Management), Section 10 (CAPA)
**Estimated Time:** 30-40 minutes

#### **Objective:**
Test the complete Non-Conformance Report (NCR) and Corrective & Preventive Action (CAPA) workflow.

#### **Prerequisites:**
- Test uses the rejected material from UAT-005: Heat No `QC-REJECT-HEAT-001`
- Or create a new GRN with failed inspection

#### **Test Steps:**

**STEP 1: Create/Verify NCR**
1. Login as `qc@erp.com`
2. Go to **Quality** → **NCR** → **+ Create NCR**
3. Fill NCR details:
   - **Linked Entity Type:** GRN
   - **Linked Entity:** GRN/26/[xxx] (the one with rejected material)
   - **Heat Number:** QC-REJECT-HEAT-001
   - **Non-conformance Type:** Dimensional Deviation
   - **Category:** Material Quality
   - **Description:** "Wall thickness below specification. Min required: 7.03mm, Measured: 6.8mm. Material does not meet ASTM A106 Grade B requirements."
   - **Detected By:** QC Inspector (auto-filled)
   - **Detected Date:** Today
   - **Severity:** Major
   - **Disposition:** Return to Vendor
   - **Upload Evidence:** Photos of measurement showing 6.8mm reading
4. Click **Create NCR**
5. **Verify:**
   - NCR Number generated: `NCR/26/00001`
   - Status: OPEN
   - Linked to heat number
   - Linked to GRN

**Expected Result:** ✅ NCR created successfully with auto-generated number

---

**STEP 2: Root Cause Analysis**
6. Open NCR/26/00001
7. Click **Add Root Cause Analysis** tab/section
8. Fill RCA details:
   - **Analysis Date:** Today
   - **Analyzed By:** QC Manager (current user)
   - **Root Cause Category:** Vendor Process Issue
   - **5 Why Analysis:**
     - Why 1: Why is wall thickness below spec? → Vendor's rolling mill deviation
     - Why 2: Why did rolling mill deviate? → Worn out rolls
     - Why 3: Why were rolls worn out? → Lack of preventive maintenance
     - Why 4: Why lack of maintenance? → Vendor's PM schedule not followed
     - Why 5: Why not followed? → Inadequate monitoring by vendor QC
   - **Root Cause:** Vendor's inadequate quality control and preventive maintenance
   - **Ishikawa Diagram:** (Optional - can be text description)
     - Man: Inadequate QC inspection at vendor
     - Machine: Worn out rolling mill rolls
     - Method: Poor PM schedule adherence
     - Material: N/A
     - Measurement: N/A
     - Environment: N/A
9. Save Root Cause Analysis
10. **Verify:** RCA saved and linked to NCR

**Expected Result:** ✅ Root cause identified and documented

---

**STEP 3: Corrective Action Plan**
11. Click **Add Corrective Action** button
12. Fill CA details:
   - **Action Type:** Corrective Action
   - **Action Description:** "Return material to vendor ISMT. Request replacement with certified MTC showing WT within spec (7.03-7.19mm). Conduct incoming inspection at 100% for next 3 batches from this vendor."
   - **Assigned To:** Purchase Manager (select from user dropdown)
   - **Target Date:** Today + 15 days
   - **Priority:** High
   - **Action Status:** Open
13. Save Corrective Action
14. **Verify:** CA added to NCR

**Expected Result:** ✅ Corrective action created and assigned

---

**STEP 4: Preventive Action Plan**
15. Click **Add Preventive Action** button
16. Fill PA details:
   - **Action Type:** Preventive Action
   - **Action Description:**
     - "1. Add vendor audit clause in all future POs"
     - "2. Request vendor to share PM schedule for rolling mills"
     - "3. Add WT measurement to our incoming inspection checklist (sample 10%)"
     - "4. Update vendor rating system to penalize quality issues"
   - **Assigned To:** Purchase Manager
   - **Target Date:** Today + 30 days
   - **Priority:** Medium
   - **Action Status:** Open
17. Save Preventive Action
18. **Verify:** PA added to NCR

**Expected Result:** ✅ Preventive action created

---

**STEP 5: Execute Actions (Simulate)**
19. Logout and login as `purchase@erp.com`
20. Go to **My Tasks** or **Purchase** → **NCR Actions**
21. See assigned Corrective Action
22. Click on action
23. **Update Progress:**
   - Update Status: In Progress
   - Add Comment: "Raised Debit Note DN/26/001 for material return. Contacted vendor for replacement material. Expected delivery: [date]"
   - Upload Debit Note PDF
24. Save progress
25. After few minutes (simulate time), update again:
   - Update Status: Completed
   - Add Comment: "Replacement material received with GRN/26/[new]. Wall thickness verified: 7.15mm (within spec). Batch inspected 100% as per CA."
   - Completion Date: Today
   - Upload new GRN copy
26. Save completion

**Expected Result:** ✅ Corrective action marked completed with evidence

---

**STEP 6: Close NCR**
27. Logout and login back as `qc@erp.com`
28. Go to Quality → NCR → NCR/26/00001
29. Review:
   - Root Cause: Completed ✓
   - Corrective Action: Completed ✓
   - Preventive Action: (Can be kept open as it's long term)
30. Click **Close NCR** button
31. Fill closure details:
   - **Closed By:** QC Manager (auto)
   - **Closure Date:** Today
   - **Effectiveness Verification:** "Replacement material received and inspected. Quality confirmed. Vendor put on watch list for next 3 batches with 100% inspection."
   - **Closure Approved By:** Select Management user
32. Click **Submit for Closure**
33. **Verify:**
   - NCR Status: Pending Approval for Closure
   - Awaiting management approval

**Expected Result:** ✅ NCR submitted for closure approval

---

**STEP 7: Approve NCR Closure**
34. Login as `admin@erp.com` or management user
35. Go to **Approvals** or **Quality** → **NCR Pending Approval**
36. Open NCR/26/00001
37. Review:
   - Root cause analysis
   - Actions taken
   - Evidence uploaded
   - Closure remarks
38. Click **Approve Closure**
39. Add approval comment: "NCR closure approved. Corrective action effective. Preventive action will be monitored."
40. Submit approval
41. **Verify:**
   - NCR Status: **CLOSED**
   - Closed Date: Today
   - Complete audit trail visible

**Expected Result:** ✅ NCR fully closed with management approval

---

#### **Test Completion Checklist:**

- [ ] NCR created from rejected material
- [ ] NCR linked to heat number and GRN
- [ ] Root Cause Analysis completed using 5 Why
- [ ] Corrective action created and assigned
- [ ] Preventive action created and assigned
- [ ] Actions visible in assignee's task list
- [ ] Actions can be updated with progress
- [ ] Evidence can be uploaded
- [ ] Actions can be marked completed
- [ ] NCR can be submitted for closure
- [ ] Management approval required for closure
- [ ] NCR status changes to CLOSED after approval
- [ ] Complete audit trail maintained

#### **Pass Criteria:**
- Complete CAPA workflow must be functional
- NCR cannot be closed without completing corrective actions
- Management approval mandatory for closure
- All evidence and comments must be stored and retrievable
- NCR should be searchable by heat number

---

### **UAT-007: Generate Packing List → Dispatch Note → Invoice (Partial SO)**
**Priority:** CRITICAL
**PRD Reference:** Section 5.6 (Dispatch), Section 5.7 (Invoicing)
**Estimated Time:** 40-50 minutes

#### **Objective:**
Test partial dispatch and invoicing workflow where an SO is fulfilled in multiple shipments.

#### **Prerequisites:**
- Create SO with Qty: 500 Mtr (e.g., SO/26/00005)
- Reserve stock from multiple heats
- Ensure sufficient stock available

#### **Test Steps:**

**STEP 1: Create Sales Order (Full Quantity)**
1. Login as `sales@erp.com`
2. Create SO with:
   - Customer: Larsen & Toubro Ltd.
   - Item: SMLS Pipe, A106 GR.B, 168.3 x 7.11mm
   - **Quantity: 500 Mtr**
   - Delivery: 15 days
3. Create SO (let it be SO/26/00005)
4. Reserve stock:
   - Heat 1: 250 Mtr (oldest)
   - Heat 2: 150 Mtr
   - Heat 3: 100 Mtr
   - **Total Reserved: 500 Mtr** ✓
5. **Verify:**
   - SO Status: Stock Reserved
   - All 500 Mtr reserved
   - Dispatched Qty: 0 Mtr
   - Balance: 500 Mtr

**Expected Result:** ✅ SO created with full quantity reserved

---

**STEP 2: Create Partial Packing List (First Dispatch)**
6. Login as `stores@erp.com` or dispatch user
7. Go to **Dispatch** → **Packing Lists** → **+ Create**
8. Select SO: SO/26/00005
9. **Partial Dispatch Details:**
   - **Dispatch Quantity:** 250 Mtr (only Heat 1)
   - Select Heat: Heat 1 (250 Mtr)
   - **Pieces:** 42
   - **Bundle Details:**
     - Bundle 1: 20 pcs × 6.0 Mtr = 120 Mtr
     - Bundle 2: 22 pcs × 5.91 Mtr = 130 Mtr
   - **Gross Weight:** 2,650 kg
   - **Net Weight:** 2,580 kg
   - **Package Type:** Hexagonal Bundling
   - **Marking:** "L&T PROJECT / HEAT NO: [Heat-1] / SO/26/00005"
10. Click **Create Packing List**
11. **Verify:**
    - Packing List No: `PL/26/00010`
    - Status: Created
    - Linked to SO/26/00005
    - Quantity: 250 Mtr
    - SO balance updated: **250 Mtr pending**
12. **Download/View Packing List PDF**
13. **Verify PDF contains:**
    - Customer details
    - Bundle-wise breakdown
    - Heat numbers
    - Piece count per bundle
    - Weight details

**Expected Result:** ✅ Partial packing list created (250/500 Mtr)

---

**STEP 3: Create Dispatch Note (First Dispatch)**
14. Go to **Dispatch** → **Dispatch Notes** → **+ Create**
15. Select Packing List: PL/26/00010
16. Fill dispatch details:
    - **Vehicle No:** MH-12-CD-5678
    - **Driver Name:** Ramesh Kumar
    - **Driver Mobile:** +91-9876543210
    - **LR Number:** LR-2026-45678
    - **LR Date:** Today
    - **Transporter:** VRL Logistics
    - **E-Way Bill No:** 123456789012
    - **E-Way Bill Date:** Today
    - **E-Way Bill Valid Till:** Today + 3 days
    - **Destination:** L&T Construction Site, Pune
    - **Expected Delivery:** Today + 2 days
17. Click **Create Dispatch Note**
18. **Verify:**
    - Dispatch Note No: `DN/26/00010`
    - Status: Dispatched
    - Linked to PL/26/00010
    - Linked to SO/26/00005
    - Heat 1 stock status: **DISPATCHED**
19. **Download/View Dispatch Note PDF**

**Expected Result:** ✅ Dispatch note created, stock marked as dispatched

---

**STEP 4: Create Invoice (First Dispatch)**
20. Login as `accounts@erp.com`
21. Go to **Accounts** → **Invoices** → **+ Create**
22. Select Dispatch Note: DN/26/00010
23. Invoice auto-fills from DN:
    - Customer: L&T
    - Quantity: 250 Mtr
    - Heat No: Heat 1
    - Rate: (from SO)
    - Amount calculation:
      - Base Amount: ₹ X
      - CGST 9%: ₹ Y
      - SGST 9%: ₹ Z
      - **Total: ₹ (X+Y+Z)**
24. Add additional charges (if any):
    - Freight: ₹ 5,000
    - Loading: ₹ 2,000
25. **Payment Terms:** 30 days from invoice date
26. Click **Create Invoice**
27. **Verify:**
    - Invoice No: `INV/26/00045`
    - Invoice Date: Today
    - Status: Pending Payment
    - Linked to DN/26/00010
    - Linked to SO/26/00005
    - Amount: Calculated correctly
28. **Download/View Invoice PDF**
29. **Verify Invoice PDF:**
    - GST details correct
    - HSN code present
    - Heat number visible
    - Bundle details from packing list
    - IRN (Invoice Reference Number) if e-invoice enabled

**Expected Result:** ✅ First invoice created for partial dispatch

---

**STEP 5: Verify SO Status (After First Dispatch)**
30. Go to **Sales** → **Sales Orders** → SO/26/00005
31. **Verify SO details:**
    - Total Quantity: 500 Mtr
    - Dispatched Qty: **250 Mtr** (50%)
    - Balance Qty: **250 Mtr** (50%)
    - Status: **Partially Dispatched**
    - Reserved stock for Heat 2 & 3: Still reserved (250 Mtr)
32. **Verify linked documents:**
    - Packing List: PL/26/00010 (250 Mtr)
    - Dispatch Note: DN/26/00010 (250 Mtr)
    - Invoice: INV/26/00045 (250 Mtr)
    - Pending: 250 Mtr (Heat 2 + Heat 3)

**Expected Result:** ✅ SO shows partial dispatch status accurately

---

**STEP 6: Create Second Packing List (Complete Remaining)**
33. Login as `stores@erp.com`
34. Create another Packing List for SO/26/00005
35. **Dispatch remaining quantity:**
    - Dispatch Qty: 250 Mtr (Heat 2: 150 Mtr + Heat 3: 100 Mtr)
    - Bundle details for Heat 2 and Heat 3 separately
36. Create Packing List: `PL/26/00011`
37. Create Dispatch Note: `DN/26/00011`
38. Create Invoice: `INV/26/00046` (as accounts user)
39. **Verify SO/26/00005 final status:**
    - Total Quantity: 500 Mtr
    - Dispatched Qty: **500 Mtr** (100%)
    - Balance Qty: **0 Mtr**
    - Status: **Fully Dispatched** / **Closed**
    - 2 Packing Lists
    - 2 Dispatch Notes
    - 2 Invoices

**Expected Result:** ✅ SO fully dispatched in 2 shipments, all documents linked

---

#### **Test Completion Checklist:**

- [ ] SO created with full quantity
- [ ] Stock reserved for full quantity
- [ ] Partial packing list created (first batch)
- [ ] Dispatch note created for first batch
- [ ] Invoice generated for first batch
- [ ] SO status shows "Partially Dispatched"
- [ ] Dispatched and balance quantities correct
- [ ] Second packing list created for remaining qty
- [ ] Second dispatch note and invoice created
- [ ] SO status changes to "Fully Dispatched"
- [ ] All documents correctly linked to SO
- [ ] Cannot create packing list for more than balance qty
- [ ] Stock status updates correctly (Reserved → Dispatched)
- [ ] Heat numbers tracked in all documents

#### **Pass Criteria:**
- System must support partial dispatch
- SO balance calculation must be accurate
- Cannot over-dispatch (qty > SO qty)
- Each dispatch must have separate invoice
- All heat numbers must be traceable in invoices

---

### **UAT-008: MIS Dashboard Shows Real-Time KPIs Without Manual Input**
**Priority:** HIGH
**PRD Reference:** Section 6.5 (MIS Dashboards), Section 9.3 (Performance: 5 sec)
**Estimated Time:** 20-30 minutes

#### **Objective:**
Verify that all MIS dashboards auto-populate with real-time data from transactions without manual data entry.

#### **Test Steps:**

**STEP 1: Access MIS Dashboard**
1. Login as `admin@erp.com` or management user
2. Go to **MIS** → **Dashboard** (or Home page if dashboard is default)
3. **Verify page loads within 5 seconds** (PRD requirement)
4. Note timestamp of dashboard data refresh

**Expected Result:** ✅ Dashboard loads quickly with real-time data

---

**STEP 2: Verify Sales KPIs**
5. **Sales Dashboard Section** should show:
   - **Enquiries:**
     - Total Enquiries (Current Month): [Auto-calculated count]
     - Enquiry Conversion Rate: [Converted to Quotation %]
     - Pending Enquiries: [Count with status = OPEN]
   - **Quotations:**
     - Total Quotations (Current Month): [Count]
     - Value (INR): [Sum of quotation amounts]
     - Approval Pending: [Count with status = PENDING_APPROVAL]
     - Approved: [Count with status = APPROVED]
     - Conversion to SO: [%]
   - **Sales Orders:**
     - Total SOs (Current Month): [Count]
     - SO Value (INR): [Sum]
     - Open SOs: [Count]
     - Closed SOs: [Count]
     - Partially Dispatched: [Count]
   - **Charts:**
     - Month-wise SO trend (Line chart)
     - Top 5 customers by value (Bar chart)
6. **Verify data is NOT manually entered** - Check that each figure matches actual transaction count from respective modules
7. Click on any KPI number (e.g., "15 Quotations") → Should drill down to actual quotation list

**Expected Result:** ✅ All sales KPIs auto-calculated and drill-down works

---

**STEP 3: Verify Purchase KPIs**
8. **Purchase Dashboard Section** should show:
   - **Purchase Requisitions:**
     - Total PRs (Current Month): [Count]
     - Pending Approval: [Count]
     - Approved: [Count]
     - Converted to PO: [Count]
   - **Purchase Orders:**
     - Total POs (Current Month): [Count]
     - PO Value (INR): [Sum]
     - Open POs: [Count]
     - Partially Received: [Count]
     - Closed POs: [Count]
   - **Vendor Performance:**
     - On-Time Delivery Rate: [%]
     - Quality Rejection Rate: [% based on NCRs]
     - Top 5 Vendors by Purchase Value
   - **Pending POs (Overdue):**
     - List of POs where Expected Delivery Date < Today and GRN not received
9. Click on "Overdue POs" → Should show list with PO numbers, vendors, due dates
10. **Verify data auto-syncs** with Purchase module

**Expected Result:** ✅ Purchase KPIs accurate and real-time

---

**STEP 4: Verify Inventory KPIs**
11. **Inventory Dashboard Section** should show:
    - **Stock Summary:**
      - Total Stock Value (INR): [Sum of inventory value]
      - Total Quantity (MT): [Sum across all products]
      - Stock Status Breakdown:
        - Accepted: [Count]
        - Under Inspection: [Count]
        - Hold: [Count]
        - Rejected: [Count]
        - Reserved: [Count]
        - Dispatched: [Count]
    - **Low Stock Alerts:**
      - Items below reorder level
      - Count of products requiring replenishment
    - **Stock Aging:**
      - 0-30 days: [Value]
      - 31-90 days: [Value]
      - 91-180 days: [Value]
      - >180 days: [Value] (aged stock)
    - **Fast Moving Items:** Top 5 by dispatch frequency
    - **Slow Moving Items:** Items with no dispatch in last 90 days
12. Click on "Low Stock" → Should show product list with current qty and reorder level
13. Click on "Aged Stock" → Should show inventory items with MTC date > 180 days

**Expected Result:** ✅ Inventory KPIs calculated from live stock transactions

---

**STEP 5: Verify Quality KPIs**
14. **Quality Dashboard Section** should show:
    - **Inspections:**
      - Total Inspections (Current Month): [Count]
      - Pass Rate: [% where result = PASS]
      - Fail Rate: [% where result = FAIL]
      - Pending Inspections: [Count where status = PENDING]
    - **NCRs:**
      - Open NCRs: [Count]
      - Closed NCRs (Current Month): [Count]
      - Average Closure Time: [Days]
      - NCR by Category: [Chart showing Dimensional, Material, Handling, etc.]
    - **MTC Repository:**
      - Total MTCs Uploaded: [Count]
      - MTCs Pending Upload: [GRNs without MTC]
    - **Vendor Quality:**
      - Rejection Rate by Vendor: [Table]
15. Click on "Open NCRs" → Should show NCR list with current status

**Expected Result:** ✅ Quality metrics auto-populated from QC module

---

**STEP 6: Verify Financial KPIs**
16. **Finance Dashboard Section** should show:
    - **Receivables:**
      - Total Outstanding (INR): [Sum of unpaid invoices]
      - Overdue (>30 days): [Amount]
      - Overdue (>60 days): [Amount]
      - Overdue (>90 days): [Amount]
      - Top 5 Customers with Outstanding
    - **Payables:**
      - Total Payable (INR): [Vendor invoices pending payment]
      - Overdue Payables: [Amount]
    - **Revenue:**
      - Current Month Revenue: [Sum of invoices]
      - Year-to-Date Revenue: [Sum]
      - Month-on-Month Growth: [%]
    - **Charts:**
      - Monthly revenue trend
      - Receivables aging chart
17. Click on "Overdue Receivables" → Should show customer-wise list

**Expected Result:** ✅ Financial KPIs calculated from invoice and payment data

---

**STEP 7: Test Real-Time Update**
18. Keep dashboard open in one browser tab
19. Open another tab → Login as `sales@erp.com`
20. Create a new enquiry
21. Create and approve a quotation
22. Go back to MIS Dashboard tab
23. **Refresh dashboard** (click Refresh button or F5)
24. **Verify:**
    - Enquiry count increased by 1
    - Quotation count increased by 1
    - Data updated in real-time
25. **Check timestamp** of last refresh - should show current time

**Expected Result:** ✅ Dashboard reflects new transactions immediately after refresh

---

**STEP 8: Test Export Functionality**
26. On MIS Dashboard, click **Export to Excel** button (if available)
27. **Verify:** Excel file downloads with all KPI data
28. Open Excel → Verify data matches dashboard
29. Click **Export to PDF** (if available)
30. Verify PDF contains dashboard snapshot

**Expected Result:** ✅ Dashboard data exportable for management review

---

#### **Test Completion Checklist:**

- [ ] Dashboard loads within 5 seconds
- [ ] All sales KPIs auto-calculated
- [ ] All purchase KPIs auto-calculated
- [ ] Inventory metrics accurate
- [ ] Quality metrics accurate
- [ ] Financial metrics accurate
- [ ] Drill-down links work for each KPI
- [ ] Real-time updates work (refresh shows new data)
- [ ] No manual data entry required
- [ ] Export to Excel works
- [ ] Export to PDF works
- [ ] Charts render correctly
- [ ] Overdue/Alert sections highlight critical items

#### **Pass Criteria:**
- **CRITICAL:** No manual data entry - all KPIs must auto-calculate
- Dashboard must load within 5 seconds (PRD requirement)
- Data must be accurate (match source module counts)
- Drill-down must work for at least 80% of KPIs
- Real-time refresh must work

---

### **UAT-009: Search Any Heat Number → See Full Lifecycle**
**Priority:** CRITICAL
**PRD Reference:** Section 6.3 (Heat Number Traceability - "Single Most Important Feature")
**Estimated Time:** 15-20 minutes

#### **Objective:**
Verify that heat number traceability works perfectly - search any heat number and see complete lifecycle from purchase to payment.

#### **Test Steps:**

**STEP 1: Global Heat Number Search**
1. Login as any user (e.g., `admin@erp.com`)
2. In top navigation bar, find **Global Search** box
3. Type heat number: `E2E-HEAT-67890` (from UAT-004)
4. Press Enter or click Search
5. **Verify search results show:**
   - Heat Number: E2E-HEAT-67890
   - Product: SMLS Pipe, A106 GR.B, 168.3 x 7.11mm
   - Current Status: Dispatched
   - Current Location: Dispatched to [Customer]
   - Quantity: [Original qty] Mtr
   - Remaining Qty: 0 Mtr (fully consumed)

**Expected Result:** ✅ Heat number found instantly with current status

---

**STEP 2: View Complete Lifecycle Timeline**
6. Click on heat number or **View Traceability** button
7. System opens **Heat Number Traceability** page
8. **Verify visual timeline showing all stages:**
   - ✅ Purchase
   - ✅ Receipt
   - ✅ MTC
   - ✅ Inspection
   - ✅ Acceptance
   - ✅ Reservation
   - ✅ Dispatch
   - ✅ Invoice
   - ✅ Payment

**Expected Result:** ✅ Visual timeline shows all completed stages

---

**STEP 3: Verify Purchase Details**
9. Click on **Purchase** stage
10. **Verify details displayed:**
    - **PO Number:** PO/26/00010 (clickable link)
    - **Vendor:** ISMT Ltd.
    - **PO Date:** [Date]
    - **Order Quantity:** [Qty] Mtr
    - **Unit Rate:** ₹ [Rate]
    - **PO Amount:** ₹ [Amount]
    - **Expected Delivery:** [Date]
    - **PO Status:** Closed
11. Click PO Number link → Opens PO detail page
12. Verify heat number is listed in PO (if entered at PO stage)
13. Go back to Traceability page

**Expected Result:** ✅ Complete purchase history visible with clickable PO link

---

**STEP 4: Verify Receipt Details**
14. Click on **Receipt** stage
15. **Verify details displayed:**
    - **GRN Number:** GRN/26/00015 (clickable)
    - **Received Date:** [Date]
    - **Received Quantity:** [Qty] Mtr
    - **Pieces:** [Count]
    - **Supplier:** ISMT Ltd.
    - **Vehicle No:** [If captured]
    - **Gate Entry No:** [If captured]
16. Click GRN Number → Opens GRN detail page
17. Verify heat number matches
18. Go back

**Expected Result:** ✅ Receipt details complete with GRN link

---

**STEP 5: Verify MTC Details**
19. Click on **MTC** stage
20. **Verify details displayed:**
    - **MTC Number:** MTC-TEST-2026-001
    - **MTC Type:** 3.2 (EN 10204)
    - **MTC Date:** [Date]
    - **Upload Date:** [Date]
    - **Uploaded By:** [User name]
    - **PDF Available:** ✓ (Download link)
21. Click **Download MTC** button
22. **Verify:** PDF opens and matches the original MTC uploaded at GRN
23. Go back

**Expected Result:** ✅ MTC accessible and downloadable

---

**STEP 6: Verify Inspection Details**
24. Click on **Inspection** stage
25. **Verify details displayed:**
    - **Inspection Report No:** IR/26/[xxx] (clickable)
    - **Inspection Date:** [Date]
    - **Inspected By:** [QC user name]
    - **Inspection Result:** PASS
    - **Visual:** PASS
    - **Dimensional:** PASS (OD, WT, Length within tolerance)
    - **Chemical:** PASS (C, Mn, Si, S, P values)
    - **Mechanical:** PASS (Yield, Tensile, Elongation)
26. Click Inspection Report No → Opens full inspection report
27. Verify heat number matches
28. Go back

**Expected Result:** ✅ Complete inspection results visible

---

**STEP 7: Verify Acceptance & Stock Status**
29. Click on **Acceptance** stage
30. **Verify details:**
    - **Acceptance Date:** [Date after inspection pass]
    - **Accepted By:** [QC Manager]
    - **Stock Status Changed:** UNDER_INSPECTION → ACCEPTED
    - **Stock Location:** [Warehouse/Rack if captured]
    - **Available for Reservation:** Yes

**Expected Result:** ✅ Acceptance status and stock transition tracked

---

**STEP 8: Verify Reservation Details**
31. Click on **Reservation** stage
32. **Verify details:**
    - **Reserved for SO:** SO/26/00001 (clickable)
    - **Customer:** Reliance Industries Ltd.
    - **Reserved Date:** [Date]
    - **Reserved Quantity:** [Qty] Mtr
    - **Reservation Type:** FIFO (oldest stock)
33. Click SO Number → Opens SO detail page
34. Verify heat number listed in reserved stock
35. Go back

**Expected Result:** ✅ Reservation linked to SO and customer

---

**STEP 9: Verify Dispatch Details**
36. Click on **Dispatch** stage
37. **Verify details:**
    - **Packing List No:** PL/26/00005 (clickable)
    - **Dispatch Note No:** DN/26/00004 (clickable)
    - **Dispatch Date:** [Date]
    - **Vehicle No:** MH-01-AB-1234
    - **LR No:** LR-123456
    - **E-Way Bill:** 123456789012
    - **Destination:** [Customer address]
    - **Transporter:** [Name]
    - **Dispatched Quantity:** [Qty] Mtr
    - **Bundle Details:** [If captured]
38. Click Packing List No → Opens packing list PDF
39. Verify heat number appears in packing list
40. Go back, click Dispatch Note No → Opens dispatch note
41. Verify heat number
42. Go back

**Expected Result:** ✅ Complete dispatch details with heat number in all documents

---

**STEP 10: Verify Invoice Details**
43. Click on **Invoice** stage
44. **Verify details:**
    - **Invoice Number:** INV/26/00025 (clickable)
    - **Invoice Date:** [Date]
    - **Invoice Amount:** ₹ [Amount]
    - **Customer:** Reliance Industries Ltd.
    - **Billed Quantity:** [Qty] Mtr (should match dispatched qty for this heat)
    - **GST Amount:** ₹ [CGST + SGST/IGST]
    - **Total Amount:** ₹ [Total]
45. Click Invoice Number → Opens invoice PDF
46. **Verify in invoice PDF:**
    - Heat number mentioned in item description
    - Quantity matches
    - MTC reference (if included)
47. Go back

**Expected Result:** ✅ Invoice details complete with heat number traceability

---

**STEP 11: Verify Payment Details**
48. Click on **Payment** stage
49. **Verify details:**
    - **Receipt Number:** REC/26/00012 (clickable)
    - **Payment Date:** [Date]
    - **Payment Amount:** ₹ [Amount matching invoice]
    - **Payment Mode:** RTGS/Cheque/etc.
    - **Payment Reference:** RTGS-2026-001234
    - **Bank:** [Customer's bank]
50. Click Receipt Number → Opens payment receipt
51. Verify receipt links back to invoice
52. Go back

**Expected Result:** ✅ Complete payment traceability

---

**STEP 12: Backward Traceability (From Invoice → Heat)**
53. Navigate to **Accounts** → **Invoices**
54. Open any invoice (e.g., INV/26/00025)
55. **In invoice detail page, verify:**
    - Heat numbers are listed/visible
    - Click on heat number link
    - **Should navigate back to Heat Traceability page**
56. **Verify bidirectional linking works**

**Expected Result:** ✅ Backward traceability works (from any document → heat)

---

**STEP 13: Test with Multiple Heat Search**
57. Go back to Global Search
58. Search for partial heat number: e.g., "HEAT-67"
59. **Verify:** System shows all matching heat numbers
60. Click on any heat → Opens traceability
61. Search for heat number that doesn't exist: "INVALID-HEAT-000"
62. **Verify:** System shows "No heat number found" message

**Expected Result:** ✅ Search handles partial match and invalid searches

---

#### **Test Completion Checklist:**

- [ ] Global search finds heat number instantly
- [ ] Visual timeline shows all lifecycle stages
- [ ] Purchase details visible with PO link
- [ ] Receipt details visible with GRN link
- [ ] MTC downloadable from traceability page
- [ ] Inspection details complete with result
- [ ] Acceptance status tracked
- [ ] Reservation linked to SO and customer
- [ ] Dispatch details with packing list and DN
- [ ] Invoice details with amount and date
- [ ] Payment details complete
- [ ] All document numbers are clickable links
- [ ] Clicking document opens detail page/PDF
- [ ] Backward traceability works (from doc → heat)
- [ ] Forward traceability works (from heat → all docs)
- [ ] Partial search works
- [ ] Invalid search handled gracefully

#### **Pass Criteria:**
- **CRITICAL:** Complete traceability from purchase to payment must work
- No broken links in traceability chain
- Heat number must appear in ALL documents (PO, GRN, Packing List, Invoice)
- Traceability page must load within 2 seconds
- PRD Section 6.3 requirement FULLY met

---

### **UAT-010: Quotation Revision → Modify Approved Quotation → New Version Created**
**Priority:** HIGH
**PRD Reference:** Section 5.2.6 (Quotation Revisions), Section 10 (No Deletion of Approved Records)
**Estimated Time:** 20-25 minutes

#### **Objective:**
Test quotation revision workflow where approved quotations can be modified, creating new versions while preserving history.

#### **Test Steps:**

**STEP 1: Create and Approve Original Quotation**
1. Login as `sales@erp.com`
2. Create quotation:
   - Customer: Tata Steel Ltd.
   - Item: ERW Pipe, ASTM A53 GR.B, 114.3 x 3.6mm
   - Quantity: 500 Mtr
   - Rate: ₹ 85 per Mtr
   - Amount: ₹ 42,500
   - Valid Upto: Today + 30 days
   - Terms: Standard payment terms
3. Create Quotation → Note number: `NPS/26/00020`
4. **Verify:** Quotation status = DRAFT, Revision = 0
5. Click **Submit for Approval**
6. Logout, login as `admin@erp.com` (approver)
7. Go to Approvals → Approve quotation NPS/26/00020
8. **Verify:**
   - Status changed to APPROVED
   - Revision: 0 (original)
   - Approved Date: Today
   - Approved By: Admin

**Expected Result:** ✅ Original quotation approved (Rev 0)

---

**STEP 2: Attempt to Edit Approved Quotation (Should be Blocked)**
9. Login as `sales@erp.com`
10. Go to Quotations → Open NPS/26/00020
11. Try to click **Edit** button
12. **Verify:**
    - Edit button is either:
      - Disabled/Grayed out, OR
      - Shows message: "Cannot edit approved quotation. Use 'Create Revision' instead."
13. **Verify:** Cannot modify any fields directly
14. **Verify:** Delete button is NOT visible (PRD: No deletion of approved records)

**Expected Result:** ✅ Direct editing of approved quotation is prevented

---

**STEP 3: Create Revision (Customer requests price change)**
15. Click **Create Revision** button (or **Revise** button)
16. System shows confirmation dialog:
    - "This will create Revision 1 of quotation NPS/26/00020"
    - "Original quotation will be preserved in history"
    - "Continue?"
17. Click **Yes, Create Revision**
18. System creates new revision and opens edit form
19. **Verify pre-filled data:**
    - Quotation No: Still NPS/26/00020
    - **Revision:** 1 (NEW)
    - Status: DRAFT (new revision starts as draft)
    - Customer: Same (Tata Steel Ltd.)
    - Items: Same as Rev 0
    - Terms: Same as Rev 0
20. **Verify revision note field** appears:
    - "Reason for Revision:" (text area)

**Expected Result:** ✅ Revision 1 created with all original data

---

**STEP 4: Modify Quotation (Revision 1)**
21. Make changes:
    - **Change Rate:** ₹ 85 → ₹ 82 per Mtr (price reduction)
    - **Change Valid Upto:** Extend by 15 days
    - **Add Revision Note:** "Revised rate as per customer negotiation. Price reduced by ₹3/Mtr to match competitor quote."
22. **Verify:**
    - Amount recalculated: ₹ 41,000 (500 Mtr × ₹82)
    - Changed fields highlighted (optional UI feature)
23. Click **Save as Draft**
24. **Verify:**
    - Quotation NPS/26/00020 Rev 1 saved
    - Status: DRAFT

**Expected Result:** ✅ Revision 1 modified and saved as draft

---

**STEP 5: View Revision History**
25. On quotation detail page, click **Revision History** tab/button
26. **Verify history shows:**
    ```
    Revision 0 (Original)
    - Created Date: [date]
    - Approved Date: [date]
    - Rate: ₹85/Mtr
    - Amount: ₹42,500
    - Status: SUPERSEDED (or ARCHIVED)
    - View button

    Revision 1 (Current)
    - Created Date: [date]
    - Rate: ₹82/Mtr
    - Amount: ₹41,000
    - Status: DRAFT
    - Reason: "Revised rate as per customer negotiation..."
    - Edit button (since it's draft)
    ```
27. Click **View** on Revision 0
28. **Verify:**
    - Opens Rev 0 in read-only mode
    - Shows original rate ₹85
    - Shows original amount ₹42,500
    - Shows "SUPERSEDED" watermark or status
    - **Cannot edit** Rev 0
29. **Verify:** Both revisions have same quotation number but different revision numbers

**Expected Result:** ✅ Complete revision history maintained

---

**STEP 6: Approve Revision 1**
30. Go back to current revision (Rev 1)
31. Click **Submit for Approval**
32. Logout, login as `admin@erp.com`
33. Go to Approvals → See quotation NPS/26/00020 Rev 1
34. Open and review:
    - View revision note
    - Compare with Rev 0 (if system provides comparison view)
35. **Approve** Revision 1
36. **Verify:**
    - Rev 1 status: APPROVED
    - Rev 0 status: SUPERSEDED
    - Current active revision: 1

**Expected Result:** ✅ Revision 1 approved, Rev 0 marked superseded

---

**STEP 7: Generate PDF (Verify Revision Number)**
37. Login as `sales@erp.com`
38. Open quotation NPS/26/00020
39. Click **Download PDF** or **Email to Customer**
40. **Verify PDF shows:**
    - Quotation No: **NPS/26/00020 (Rev. 1)**
    - Date: [Rev 1 creation date]
    - Rate: ₹82 (revised rate)
    - Revision note/reason may appear in header or footer
41. **Verify:** PDF does NOT show Rev 0 data (old rate)

**Expected Result:** ✅ PDF clearly shows revision number

---

**STEP 8: Create SO from Revised Quotation**
42. Click **Create Sales Order** from NPS/26/00020 Rev 1
43. SO auto-fills from Rev 1 (rate ₹82, not ₹85)
44. Create SO → Note SO Number: SO/26/00015
45. **Verify SO links to:**
    - Quotation: NPS/26/00020
    - Quotation Revision: 1
46. Open quotation NPS/26/00020
47. **Verify:** Shows linked SO: SO/26/00015

**Expected Result:** ✅ SO created from correct revision

---

**STEP 9: Create Second Revision (Further Changes)**
48. Click **Create Revision** again on NPS/26/00020 Rev 1
49. **Verify:** System creates Revision 2
50. Make changes:
    - Add additional item (Elbow 114.3mm, Qty: 50, Rate: ₹150)
    - Revision Note: "Added elbow fittings as per customer request"
51. Save and submit for approval
52. Approve as admin
53. **Verify Revision History now shows:**
    - Revision 0: SUPERSEDED, ₹42,500
    - Revision 1: SUPERSEDED, ₹41,000 (has linked SO)
    - Revision 2: APPROVED (Current), ₹48,500
54. **Verify:** Rev 1 still shows linked SO (history preserved)

**Expected Result:** ✅ Multiple revisions supported, history intact

---

**STEP 10: Audit Trail Verification**
55. Login as `admin@erp.com`
56. Go to **Admin** → **Audit Trail**
57. Filter by Document: NPS/26/00020
58. **Verify audit log shows:**
    - Created Rev 0 by [user] on [date]
    - Approved Rev 0 by Admin on [date]
    - Created Rev 1 by [user] on [date] - Reason: "customer negotiation"
    - Modified Rev 1 - Changed rate from 85 to 82
    - Approved Rev 1 by Admin on [date]
    - Rev 0 marked SUPERSEDED on [date]
    - Created Rev 2 by [user] on [date]
    - And so on...
59. **Verify:** Complete change history logged

**Expected Result:** ✅ Full audit trail maintained for all revisions

---

#### **Test Completion Checklist:**

- [ ] Original quotation created and approved (Rev 0)
- [ ] Direct editing of approved quotation is blocked
- [ ] Delete button not available for approved quotation
- [ ] "Create Revision" button available
- [ ] Revision creates new version with incremented number
- [ ] Original data copied to new revision
- [ ] Revision can be modified
- [ ] Revision note/reason field mandatory
- [ ] Revision history view shows all versions
- [ ] Can view but not edit old revisions
- [ ] Approval workflow works for revisions
- [ ] Approved revision marks previous as SUPERSEDED
- [ ] PDF shows revision number clearly
- [ ] SO can be created from specific revision
- [ ] SO links to correct revision number
- [ ] Multiple revisions supported (Rev 0, 1, 2, ...)
- [ ] Audit trail logs all revision activities
- [ ] No data loss - all revisions accessible

#### **Pass Criteria:**
- **CRITICAL:** Approved quotations cannot be directly edited or deleted
- Revision workflow must preserve complete history
- Each revision must have unique identifier (revision number)
- Documents (SO, PO) must link to specific revision
- Audit trail must track all changes across revisions

---

### **UAT-011: BOM Quotation for Project with Multiple Materials and Drawing Refs**
**Priority:** HIGH
**PRD Reference:** Section 5.2.4 (BOM Quotation Format), Appendix D (BOM Template)
**Estimated Time:** 30-35 minutes

#### **Objective:**
Test BOM (Bill of Materials) quotation format for project-based sales with component positions, drawing references, and fabrication details.

#### **Test Steps:**

**STEP 1: Create Project Enquiry**
1. Login as `sales@erp.com`
2. Create enquiry:
   - **Customer:** Thermax Ltd.
   - **Project Name:** "Boiler Heat Exchanger - Unit 3"
   - **Enquiry Type:** Project/BOM
   - **Reference:** Customer Drawing No. TH-BOILER-2026-003
   - **Items:** (Preliminary list)
     - Tubes for heat exchanger
     - Plates for tube sheets
     - Pipes for headers
3. Create Enquiry → Note number: ENQ/26/00025

**Expected Result:** ✅ Project enquiry created

---

**STEP 2: Create BOM Quotation**
4. From enquiry, click **Create Quotation**
5. On quotation form:
   - **Quotation Type:** Select **BOM**
   - **Currency:** INR (or USD if export)
   - **Project Name:** Auto-filled from enquiry
   - **Valid Upto:** 45 days (longer for project quotes)
6. **Verify:** Form shows BOM-specific fields

**Expected Result:** ✅ BOM quotation form loaded

---

**STEP 3: Add BOM Items (Tubes for Heat Exchanger)**
7. Click **+ Add Item**
8. Fill first BOM item - **Tubes:**
   - **S.No:** 1 (auto)
   - **Component Position:** "Heat Exchanger Tubes"
   - **Drawing Ref:** TH-BOILER-2026-003, Sheet 2
   - **Item Type:** Tube
   - **Product:** SMLS Tube
   - **Material:** ASTM A179 (Carbon Steel)
   - **Additional Spec:** Cold Drawn, Normalized
   - **Size:** 38.1 x 3.2mm (OD x WT)
   - **Length per Tube:** 6.0 Mtr
   - **Number of Tubes:** 248
   - **Total Length:** 248 × 6.0 = **1,488 Mtr** (auto-calculated)
   - **WT Type:** MIN (Minimum wall thickness)
   - **Unit Weight:** 7.25 kg/Mtr
   - **Total Weight:** 1,488 × 7.25 = **10.788 MT**
   - **Unit Rate:** ₹ 125 per Mtr
   - **Amount:** 1,488 × 125 = **₹ 1,86,000**
   - **Delivery:** 45 days
   - **Certificate Required:** MTC 3.2 + PMI Test Report
   - **Remark:** "Tubes to be supplied in 6 Mtr straight lengths, bundled"
9. Click **Add Item**
10. **Verify:** Item added to table

**Expected Result:** ✅ Tube item with fabrication details added

---

**STEP 4: Add Second BOM Item (Tube Sheet Plates)**
11. Click **+ Add Item** again
12. Fill second item - **Plates:**
    - **S.No:** 2 (auto)
    - **Component Position:** "Tube Sheets (Front & Rear)"
    - **Drawing Ref:** TH-BOILER-2026-003, Sheet 3
    - **Item Type:** Plate
    - **Product:** Carbon Steel Plate
    - **Material:** ASTM A516 GR. 70
    - **Additional Spec:** Normalized, UT Tested
    - **Size (Plate):** 1500mm × 1500mm × 40mm THK
    - **Quantity:** 2 Nos (Front + Rear tube sheet)
    - **Unit Weight:** 560 kg each
    - **Total Weight:** 1.12 MT
    - **Unit Rate:** ₹ 65,000 per piece
    - **Amount:** ₹ 1,30,000
    - **Delivery:** 60 days
    - **Certificate Required:** MTC 3.2 + UT Report
    - **Remark:** "Plates to be drilled as per drawing, hole dia 39mm"
13. Add item

**Expected Result:** ✅ Plate item added

---

**STEP 5: Add Third BOM Item (Header Pipes)**
14. Add third item - **Header Pipes:**
    - **S.No:** 3
    - **Component Position:** "Inlet/Outlet Headers"
    - **Drawing Ref:** TH-BOILER-2026-003, Sheet 4
    - **Item Type:** Pipe
    - **Product:** SMLS Pipe
    - **Material:** ASTM A106 GR.B
    - **Additional Spec:** Seamless, Hydrotest
    - **Size:** 219.1 x 8.18mm
    - **Length:** Random (6-12 Mtr)
    - **Quantity:** 80 Mtr
    - **Unit Weight:** 35.5 kg/Mtr
    - **Total Weight:** 2.84 MT
    - **Unit Rate:** ₹ 95 per Mtr
    - **Amount:** ₹ 7,600
    - **Delivery:** 45 days
    - **Certificate Required:** MTC 3.2
15. Add item
16. **Verify all three items in table:**
    - Item 1: Tubes (1,488 Mtr)
    - Item 2: Plates (2 Nos)
    - Item 3: Pipes (80 Mtr)
    - **Grand Total:** ₹ 3,23,600

**Expected Result:** ✅ All BOM items added with mixed units (Mtr, Nos)

---

**STEP 6: Add Terms & Conditions (Project-specific)**
17. Scroll to **Terms & Conditions** section
18. Add/modify terms:
    - **Delivery:** "Staggered delivery - Tubes in 45 days, Plates in 60 days, Pipes in 45 days"
    - **Payment:** "30% Advance, 60% against delivery, 10% within 30 days of installation"
    - **Inspection:** "Material subject to third-party inspection by BVIS at our works before dispatch"
    - **Warranty:** "Material warranty as per respective ASTM standards. Manufacturing defects covered for 12 months."
    - **Validity:** "45 days from quotation date"
    - **Freight:** "Extra as actual"
    - **GST:** "18% extra as applicable"
    - **Drawing Approval:** "Final material dispatch subject to customer's drawing approval"
19. Save terms

**Expected Result:** ✅ Project-specific terms added

---

**STEP 7: Save and Submit for Approval**
20. Click **Save as Draft**
21. **Verify:** Quotation saved with number: NPS/26/00035
22. Click **Submit for Approval**
23. Logout, login as `admin@erp.com`
24. Approve quotation NPS/26/00035
25. **Verify:** Status = APPROVED

**Expected Result:** ✅ BOM quotation approved

---

**STEP 8: Generate BOM Quotation PDF**
26. Login as `sales@erp.com`
27. Open quotation NPS/26/00035
28. Click **Download PDF** or **Preview**
29. **Verify BOM PDF format:**

    **Header:**
    - Company logo and details
    - Quotation No: NPS/26/00035
    - Date
    - Customer: Thermax Ltd.
    - Project: Boiler Heat Exchanger - Unit 3
    - Reference: Drawing TH-BOILER-2026-003

    **Table Columns (BOM Format):**
    | S.No | Component Position | Drawing Ref | Item Description | Size | Qty | Unit | Unit Wt (kg) | Total Wt (MT) | Rate | Amount |
    |------|-------------------|-------------|------------------|------|-----|------|--------------|---------------|------|--------|
    | 1 | Heat Exchanger Tubes | Sheet 2 | SMLS Tube, A179, 38.1x3.2mm, Cold Drawn | 38.1x3.2mm | 248 tubes × 6.0 Mtr each = 1488 Mtr | Mtr | 7.25 | 10.788 | ₹125 | ₹1,86,000 |
    | 2 | Tube Sheets (Front & Rear) | Sheet 3 | CS Plate A516 Gr.70, 1500x1500x40mm THK, Normalized, UT | 1500x1500x40 | 2 | Nos | 560 | 1.12 | ₹65,000 | ₹1,30,000 |
    | 3 | Inlet/Outlet Headers | Sheet 4 | SMLS Pipe A106 GR.B, 219.1x8.18mm | 219.1x8.18 | 80 | Mtr | 35.5 | 2.84 | ₹95 | ₹7,600 |
    | | | | | | | | **Total Weight:** | **14.748 MT** | **Total:** | **₹3,23,600** |

    **GST Calculation:**
    - Basic Amount: ₹3,23,600
    - GST @18%: ₹58,248
    - **Grand Total: ₹3,81,848**

    **Terms & Conditions:**
    - All project-specific terms listed

    **Certificates Required:**
    - MTC 3.2 for all materials
    - PMI Test Report for tubes
    - UT Report for plates

30. **Verify fabrication details:**
    - "248 tubes × 6.0 Mtr each" format used
    - Component positions clear
    - Drawing references visible
31. **Compare with Solapur template** (if available as reference):
    - Format matches template structure
    - All required columns present

**Expected Result:** ✅ BOM PDF matches PRD Appendix D format

---

**STEP 9: Email BOM Quotation**
32. Click **Email to Customer**
33. **Verify email:**
    - To: customer email
    - Subject: "Quotation NPS/26/00035 - Boiler Heat Exchanger Project"
    - Body: Professional email template
    - Attachment: BOM quotation PDF
34. Send email
35. Check email delivery (if test email configured)
36. **Verify:** Email received with correct PDF

**Expected Result:** ✅ BOM quotation emailed successfully

---

**STEP 10: Create Sales Order from BOM Quotation**
37. From quotation page, click **Create Sales Order**
38. **Verify SO form:**
    - All 3 items copied
    - Component positions copied
    - Drawing refs copied
    - Project name copied
39. Fill additional SO details:
    - Delivery Schedule: As per terms (staggered)
    - Customer PO No: CUST-PO-2026-550
    - Customer PO Date: Today
40. Create SO → Note: SO/26/00020
41. **Verify SO links to BOM quotation**

**Expected Result:** ✅ SO created from BOM quotation

---

**STEP 11: View BOM Quotation in Reports**
42. Go to **Reports** → **Quotation Register**
43. Filter by Type: BOM
44. **Verify:** NPS/26/00035 appears in list
45. **Verify report shows:**
    - Quotation No
    - Customer
    - Project Name
    - Total Value
    - Status: Approved
    - Linked SO (if converted)

**Expected Result:** ✅ BOM quotations filterable in reports

---

#### **Test Completion Checklist:**

- [ ] BOM quotation type available in dropdown
- [ ] Component Position field available
- [ ] Drawing Ref field available
- [ ] Item Type field (Tube/Pipe/Plate) available
- [ ] Tube fabrication format supported ("248 tubes × 6.0 Mtr")
- [ ] Multiple unit types in single quotation (Mtr, Nos, MT)
- [ ] Total weight calculation works
- [ ] Project-specific terms can be added
- [ ] BOM PDF format matches template
- [ ] Table columns correct for BOM format
- [ ] Component positions visible in PDF
- [ ] Drawing references visible in PDF
- [ ] Certificate requirements listed in PDF
- [ ] Email works with BOM PDF
- [ ] SO can be created from BOM quotation
- [ ] SO preserves component and drawing details
- [ ] BOM quotations filterable in reports

#### **Pass Criteria:**
- BOM format must match Solapur template (PRD Appendix D)
- Fabrication details must be clear: "X tubes × Y Mtr each = Total"
- Component positions and drawing refs mandatory and visible
- Mixed units (Mtr, Nos, Kgs, MT) must work in same quotation
- Certificate requirements clearly listed

---

### **UAT-012: Audit Trail → Verify All Edits Logged with User and Timestamp**
**Priority:** CRITICAL
**PRD Reference:** Section 9.2 (Security - Complete Audit Trail), Section 10 (Mandatory System Controls)
**Estimated Time:** 25-30 minutes

#### **Objective:**
Verify that every create/update/delete operation is logged with user, timestamp, and old/new values for audit compliance.

#### **Test Steps:**

**STEP 1: Access Audit Trail Module**
1. Login as `admin@erp.com`
2. Go to **Admin** → **Audit Trail** (or System → Audit Log)
3. **Verify:** Audit trail page opens with search filters
4. **Available filters:**
   - Date Range
   - User
   - Module (Quotation, SO, PO, Inventory, etc.)
   - Action Type (CREATE, UPDATE, DELETE, APPROVE, REJECT)
   - Document Number

**Expected Result:** ✅ Audit trail accessible to admin users

---

**STEP 2: Test CREATE Action Logging**
5. Open another browser tab → Login as `sales@erp.com`
6. Create a new quotation:
   - Customer: BHEL
   - Item: Pipe, 219.1 x 8.18mm, Qty: 100 Mtr
   - Rate: ₹95
7. Save quotation → Note number: NPS/26/00040
8. Note timestamp (e.g., 10:25:30 AM)
9. Go back to Admin tab (Audit Trail)
10. Refresh or search for today's date
11. **Find and verify audit log entry:**
    ```
    Timestamp: 2026-02-12 10:25:30
    User: sales@erp.com (Salesperson Name)
    Module: Quotation
    Action: CREATE
    Document: NPS/26/00040
    Details: Created new quotation for customer BHEL, Amount: ₹9,500
    IP Address: 192.168.1.x (if captured)
    Old Value: (null)
    New Value: { quotationNo: "NPS/26/00040", customer: "BHEL", ... }
    ```
12. **Verify log entry contains:**
    - Exact timestamp (within 1 second of action)
    - User who created (sales@erp.com)
    - Action type: CREATE
    - Document number
    - New record data (at least key fields)

**Expected Result:** ✅ CREATE action logged with complete details

---

**STEP 3: Test UPDATE Action Logging**
13. In Sales tab, open quotation NPS/26/00040 (still in DRAFT)
14. Edit quotation:
    - **Change Rate:** ₹95 → ₹92
    - **Change Quantity:** 100 Mtr → 120 Mtr
    - **Change Valid Upto:** Add 10 more days
15. Save changes → Note timestamp: 10:28:45 AM
16. Go to Admin Audit Trail tab
17. Refresh and search for NPS/26/00040
18. **Find UPDATE log entry:**
    ```
    Timestamp: 2026-02-12 10:28:45
    User: sales@erp.com
    Module: Quotation
    Action: UPDATE
    Document: NPS/26/00040
    Field Changed: rate
    Old Value: 95
    New Value: 92
    ---
    Field Changed: quantity
    Old Value: 100
    New Value: 120
    ---
    Field Changed: validUpto
    Old Value: 2026-03-14
    New Value: 2026-03-24
    ```
19. **Verify:**
    - Each changed field logged separately OR in single entry with all changes
    - Old value captured
    - New value captured
    - User and timestamp correct

**Expected Result:** ✅ UPDATE action logged with old and new values

---

**STEP 4: Test APPROVE Action Logging**
20. In Sales tab, submit quotation NPS/26/00040 for approval
21. Note timestamp: 10:30:00 AM
22. Login as `admin@erp.com` in another tab
23. Approve quotation NPS/26/00040
24. Note timestamp: 10:32:15 AM
25. Go to Audit Trail
26. Search for NPS/26/00040
27. **Verify two log entries:**
    ```
    Entry 1:
    Timestamp: 2026-02-12 10:30:00
    User: sales@erp.com
    Action: SUBMIT_FOR_APPROVAL
    Document: NPS/26/00040
    Old Status: DRAFT
    New Status: PENDING_APPROVAL

    Entry 2:
    Timestamp: 2026-02-12 10:32:15
    User: admin@erp.com (Admin Name)
    Action: APPROVE
    Document: NPS/26/00040
    Old Status: PENDING_APPROVAL
    New Status: APPROVED
    Approval Comment: (if any)
    ```

**Expected Result:** ✅ Approval workflow fully logged

---

**STEP 5: Test DELETE/VOID Action Logging**
28. Create a draft enquiry (Sales user)
29. Delete the draft enquiry (should be allowed for drafts)
30. Note timestamp
31. Go to Audit Trail (Admin)
32. **Verify DELETE log:**
    ```
    Timestamp: [time]
    User: sales@erp.com
    Action: DELETE
    Module: Enquiry
    Document: ENQ/26/[xxx]
    Status at deletion: DRAFT
    Reason: (if system asks for reason)
    Deleted Data: { ... snapshot of deleted record ... }
    ```
33. **Verify:** Deleted data is logged (soft delete or data snapshot)
34. Try to delete an approved quotation (should be blocked)
35. **Verify:** System prevents deletion, shows error message
36. **Verify:** Attempted deletion may also be logged as ATTEMPTED_DELETE (optional)

**Expected Result:** ✅ DELETE action logged; approved records cannot be deleted

---

**STEP 6: Test Multi-Module Audit Trail (GRN Example)**
37. Login as `stores@erp.com`
38. Create GRN:
    - PO: (select existing PO)
    - Heat No: AUDIT-TEST-HEAT-001
    - Qty: 100 Mtr
    - MTC No: MTC-AUDIT-001
    - Upload MTC PDF
39. Create GRN → Note: GRN/26/00030
40. Note timestamp
41. Go to Audit Trail (Admin)
42. Filter: Module = GRN OR search GRN/26/00030
43. **Verify log:**
    ```
    Timestamp: [time]
    User: stores@erp.com
    Module: GRN
    Action: CREATE
    Document: GRN/26/00030
    Details: GRN created for PO [PONo], Qty: 100 Mtr, Heat: AUDIT-TEST-HEAT-001
    Attachments: MTC-AUDIT-001.pdf uploaded
    Stock Impact: +100 Mtr added to inventory (status: UNDER_INSPECTION)
    ```
44. **Verify:** Stock changes also logged

**Expected Result:** ✅ GRN and inventory changes logged

---

**STEP 7: Test Inventory Transaction Logging**
45. Login as `qc@erp.com`
46. Create inspection for GRN/26/00030
47. Result: PASS
48. Submit inspection → Stock status changes to ACCEPTED
49. Go to Audit Trail
50. Search for Heat No: AUDIT-TEST-HEAT-001 OR GRN/26/00030
51. **Verify inventory status change log:**
    ```
    Timestamp: [time]
    User: qc@erp.com
    Module: Inventory
    Action: STATUS_CHANGE
    Heat Number: AUDIT-TEST-HEAT-001
    Old Status: UNDER_INSPECTION
    New Status: ACCEPTED
    Triggered By: Inspection PASS (IR/26/[xxx])
    ```

**Expected Result:** ✅ Stock status changes logged with trigger reason

---

**STEP 8: Test User Login/Logout Logging**
52. Logout from all sessions
53. Login as `sales@erp.com`
54. Note timestamp
55. Logout
56. Login as `admin@erp.com`
57. Go to Audit Trail
58. Filter: Action Type = LOGIN or LOGOUT
59. **Verify session logs:**
    ```
    Timestamp: [time]
    User: sales@erp.com
    Action: LOGIN
    IP Address: 192.168.1.x
    Browser: Chrome 122

    Timestamp: [time]
    User: sales@erp.com
    Action: LOGOUT
    Session Duration: 2 minutes
    ```

**Expected Result:** ✅ Login/logout events logged

---

**STEP 9: Test Audit Trail Export**
60. On Audit Trail page, select date range (e.g., today)
61. Click **Export to Excel** or **Download CSV**
62. **Verify:** File downloads successfully
63. Open Excel file
64. **Verify columns:**
    - Timestamp
    - User
    - Module
    - Action
    - Document No
    - Old Value
    - New Value
    - IP Address (if captured)
65. **Verify:** All today's activities present in Excel

**Expected Result:** ✅ Audit trail exportable for compliance reporting

---

**STEP 10: Test Audit Trail Search and Filters**
66. Test various filters:
    - **By Date Range:** Last 7 days → Should show last 7 days' logs
    - **By User:** Filter user = sales@erp.com → Should show only their actions
    - **By Module:** Filter module = Quotation → Should show only quotation-related logs
    - **By Document:** Search NPS/26/00040 → Should show all logs for this quotation
    - **By Action:** Filter action = APPROVE → Should show all approvals
67. **Verify:** Each filter works correctly
68. **Test combined filters:**
    - User = sales@erp.com AND Module = Quotation AND Date = Today
    - Should show only today's quotation activities by sales user

**Expected Result:** ✅ All filters work correctly

---

**STEP 11: Test Audit Trail for Sensitive Data (Pricing)**
69. Go to Audit Trail
70. Search for quotation NPS/26/00040 UPDATE action (where rate was changed)
71. **Verify:**
    - Old rate visible: ₹95
    - New rate visible: ₹92
    - Complete pricing history maintained
72. **Verify:** Admin can see pricing in audit logs (for compliance)
73. Test with non-admin user (if audit trail has limited access):
    - Login as `sales@erp.com`
    - Try to access Audit Trail
    - **Verify:** Either blocked OR can only see own actions (role-based)

**Expected Result:** ✅ Sensitive data changes logged, access controlled

---

**STEP 12: Test Audit Trail Integrity (No Editing/Deletion)**
74. As Admin, try to:
    - Edit an audit log entry (should be blocked)
    - Delete an audit log entry (should be blocked)
75. **Verify:** System prevents any modification to audit logs
76. **Verify:** No "Edit" or "Delete" buttons on audit trail entries
77. **Verify:** Audit logs are append-only (cannot be tampered)

**Expected Result:** ✅ Audit trail is immutable

---

#### **Test Completion Checklist:**

- [ ] Audit trail accessible to admin users
- [ ] CREATE actions logged with complete data
- [ ] UPDATE actions logged with old and new values
- [ ] Field-level changes captured
- [ ] DELETE actions logged with snapshot
- [ ] Approved records cannot be deleted
- [ ] APPROVE/REJECT actions logged
- [ ] Login/logout events logged
- [ ] IP addresses captured (if implemented)
- [ ] Stock status changes logged
- [ ] Multi-module audit trail works
- [ ] Timestamp accurate (within 1 second)
- [ ] User identification correct
- [ ] Document numbers linked (clickable to original doc)
- [ ] Audit trail searchable by multiple filters
- [ ] Export to Excel works
- [ ] Audit logs immutable (cannot edit/delete)
- [ ] Role-based access to audit trail
- [ ] Sensitive data changes (pricing) logged

#### **Pass Criteria:**
- **CRITICAL:** EVERY create/update/delete must be logged (100% coverage)
- Old and new values must be captured for updates
- Timestamp must be accurate
- User must be identified
- Audit logs must be immutable (no editing/deletion)
- Logs must be exportable for compliance audits
- PRD Section 9.2 requirement FULLY met: "Complete audit trail for every create/update/delete operation"

---

## 4. Test Execution Checklist

### 4.1 Pre-Testing

- [ ] Test environment stable and accessible
- [ ] All test users created with correct roles
- [ ] Master data seeded (products, sizes, customers, vendors)
- [ ] Sample test data prepared
- [ ] Test email accounts ready
- [ ] Screen recording tool ready (optional but recommended)
- [ ] Defect tracking sheet prepared

### 4.2 During Testing

- [ ] Take screenshots of critical steps
- [ ] Note actual vs expected results
- [ ] Record defect details immediately when found
- [ ] Mark timestamp for each test execution
- [ ] Get stakeholder sign-off on PASS/FAIL

### 4.3 Post-Testing

- [ ] Compile test results summary
- [ ] Categorize defects by severity
- [ ] Create defect tickets in tracking system
- [ ] Schedule defect fix and retest
- [ ] Update test cases if process changes
- [ ] Archive test evidence (screenshots, PDFs, emails)

---

## 5. Defect Reporting

### 5.1 Defect Severity Levels

| Severity | Description | Example |
|----------|-------------|---------|
| **CRITICAL** | System crash, data loss, blocking issue | Cannot create quotation, application crashes |
| **HIGH** | Major functionality broken, no workaround | PDF not generating, email not sending |
| **MEDIUM** | Functionality issue with workaround | Calculation wrong but can manually fix |
| **LOW** | Minor issue, cosmetic, does not block testing | Typo in label, alignment issue |

### 5.2 Defect Report Template

```
DEFECT ID: [Auto-generated or manual]
TEST CASE: UAT-XXX
SEVERITY: [CRITICAL/HIGH/MEDIUM/LOW]
REPORTED BY: [Tester Name]
DATE: [YYYY-MM-DD]
BROWSER: [Chrome/Firefox/Edge]

SUMMARY:
[One-line description of issue]

STEPS TO REPRODUCE:
1. [Step 1]
2. [Step 2]
3. [Step 3]

EXPECTED RESULT:
[What should happen]

ACTUAL RESULT:
[What actually happened]

SCREENSHOT/EVIDENCE:
[Attach screenshot or describe]

WORKAROUND (if any):
[Temporary solution if available]

NOTES:
[Any additional context]
```

---

## 6. UAT Sign-Off

### 6.1 Test Execution Summary

| UAT ID | Test Case | Status | Tester | Date | Comments |
|--------|-----------|--------|--------|------|----------|
| UAT-001 | Enquiry to Email | | | | |
| UAT-002 | Export Quotation | | | | |
| UAT-003 | FIFO Reservation | | | | |
| UAT-004 | End-to-End with Traceability | | | | |
| UAT-005 | GRN to QC | | | | |
| UAT-006 | NCR to CAPA | | | | |
| UAT-007 | Packing to Invoice | | | | |
| UAT-008 | MIS Dashboards | | | | |
| UAT-009 | Heat Traceability | | | | |
| UAT-010 | Quotation Revision | | | | |
| UAT-011 | BOM Quotation | | | | |
| UAT-012 | Audit Trail | | | | |

**Status Legend:** PASS / FAIL / BLOCKED / NOT TESTED

### 6.2 Acceptance Criteria

**System is ACCEPTED for production if:**
- ✅ All CRITICAL test cases (UAT-001, 002, 003, 004, 005, 009) = **PASS**
- ✅ At least 10 out of 12 test cases = **PASS**
- ✅ No CRITICAL or HIGH severity defects open
- ✅ All MEDIUM defects have workarounds documented
- ✅ Stakeholder sign-off obtained

### 6.3 Sign-Off

**Tested By:**
- Sales Team Rep: __________________ Date: __________
- Purchase Team Rep: __________________ Date: __________
- QC Team Rep: __________________ Date: __________
- Accounts Team Rep: __________________ Date: __________
- Management Rep: __________________ Date: __________

**Approved By:**
- Project Manager: __________________ Date: __________
- Business Owner: __________________ Date: __________

---

**END OF UAT TEST SCENARIOS**

**Document Version:** 1.0
**Prepared By:** ERP Implementation Team
**Date:** February 12, 2026
**Next Review:** Post-UAT execution
