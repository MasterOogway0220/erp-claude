# NPS ERP — Comprehensive Testing Checklist

> Format: `- [ ] Test description — expected result`
> Grouped by feature/screen. Run on Chrome (primary), Edge, and mobile viewport.

---

## 1. AUTHENTICATION & SESSION

### Login
- [ ] Submit valid email + password — redirected to dashboard, session cookie set
- [ ] Submit wrong password — toast error "Invalid credentials", stay on login
- [ ] Submit blank email — form validation prevents submit
- [ ] Submit blank password — form validation prevents submit
- [ ] Submit invalid email format — form validation prevents submit
- [ ] Submit email of disabled/inactive user — error "Account is inactive", no session created
- [ ] Login as SUPER_ADMIN — full sidebar visible (all modules + Admin + Company switcher)
- [ ] Login as ADMIN — full sidebar for own company, no global company switcher
- [ ] Login as SALES — only quotation, sales, dispatch links visible in sidebar
- [ ] Login as PURCHASE — only purchase links visible
- [ ] Login as QC — only quality/inventory read links visible
- [ ] Login as STORES — only inventory, dispatch links visible
- [ ] Login as ACCOUNTS — only dispatch/finance links visible
- [ ] Login as MANAGEMENT — all modules visible (read + approve), no write to masters
- [ ] Session persists on page refresh — user remains logged in
- [ ] Session expires after 24 hours — redirected to login on next request
- [ ] Logout — session cleared, redirected to login, back button does not restore session

### Password Change
- [ ] Change password with correct current password — success toast, can log in with new password
- [ ] Change password with wrong current password — error toast
- [ ] New password < minimum length — validation error shown
- [ ] New password = current password — error "must be different"

### Unauthorized Access
- [ ] SALES role navigates to `/admin` — redirected or 403 shown
- [ ] PURCHASE role navigates to `/dispatch/invoices` — 403 shown
- [ ] Unauthenticated user navigates to `/quotations` — redirected to `/login`
- [ ] Expired session makes API call — 401 returned, redirected to login

### Multi-company (SUPER_ADMIN)
- [ ] SUPER_ADMIN switches company — all data on dashboard reflects new company
- [ ] SUPER_ADMIN sees data from Company A, switches to Company B — Company A data not visible
- [ ] Non-SUPER_ADMIN has no company switcher — switcher UI absent

---

## 2. DASHBOARD

### Happy Path
- [ ] Dashboard loads — shows Open SO Value, Active Quotations, Open POs, Outstanding Receivables cards
- [ ] Compact stats visible — Sales Orders, Inventory Items, Under Inspection, On-Time Delivery %, Dispatches Today, Open NCRs, Accepted Stock
- [ ] Low stock alerts table renders — shows items with qty below threshold
- [ ] "Create Quotation" quick action — navigates to `/quotations/create`
- [ ] "New GRN" quick action — navigates to `/inventory/grn/create`
- [ ] "New Inspection" quick action — navigates to correct inspection page

### Edge Cases
- [ ] No data for company (fresh install) — cards show zero values, no error
- [ ] Management review API slow — loading skeleton shown while waiting
- [ ] Management review API fails (500) — error message shown, not blank page

---

## 3. QUOTATIONS

### 3.1 List Page (`/quotations`)
- [ ] List loads all quotations — quotation number, date, customer, type, category, status shown
- [ ] Search by quotation number — filtered results shown
- [ ] Search by customer name — filtered results shown
- [ ] Filter by status DRAFT — only DRAFT quotations shown
- [ ] Filter by status WON — only WON quotations shown
- [ ] Filter by STANDARD category — only standard quotations shown
- [ ] Filter by NON_STANDARD category — only non-standard quotations shown
- [ ] Filter by ORIGINAL revision type — only version-1 quotations shown
- [ ] Filter by REVISED — only revised quotations shown
- [ ] Filter Conversion: PENDING — quotations without SO shown
- [ ] Filter Conversion: CONVERTED — quotations linked to SO shown
- [ ] SUPERSEDED and REVISED status quotations hidden by default — not visible in default list
- [ ] Download PDF (Quoted variant) — PDF opens/downloads, shows prices
- [ ] Download PDF (Unquoted variant) — PDF opens/downloads, rates column blank
- [ ] "Create SO" button visible only on APPROVED/SENT quotations — absent on DRAFT/LOST
- [ ] Pagination works — page 2 shows next set of records

### 3.2 Create Standard Quotation
- [ ] Select customer → Buyer dropdown populates — buyers for that customer shown
- [ ] Select DOMESTIC customer → Market Type auto-sets to Domestic, Currency INR — fields set automatically
- [ ] Select INTERNATIONAL customer → Market Type auto-sets to Export, Currency USD — fields set automatically
- [ ] Override auto-set Currency to EUR — currency stays EUR (user override works)
- [ ] Select EXPORT market type manually → Currency auto-switches to USD — currency changes
- [ ] Select DOMESTIC market type manually → Currency auto-switches to INR — currency changes
- [ ] Add item → empty row appears — new row with blank fields
- [ ] Select material code → `pastQuote` and `pastQuotePrice` fields show previous reference — NO product/material/size auto-fill
- [ ] Select past quote from dropdown → only `pastQuotePrice` populated — other item fields unchanged
- [ ] Past quote dropdown only shows STANDARD category quotations — no NON_STANDARD in dropdown
- [ ] Select size → OD, WT, NPS, Schedule auto-fill — size master data applied
- [ ] Enter Qty × Rate → Amount auto-calculates — `qty × rate = amount`
- [ ] Apply 10% additional discount → Grand Total reduced — `subtotal × 0.9 = discounted total`
- [ ] Enable RCM → Tax amount line shows ₹0, RCM note appears — GST not added to invoice
- [ ] Enable Round-off → Grand total rounds to nearest rupee — correct rounding shown
- [ ] Add second item — two-row items table
- [ ] Remove item (when >1 items) — row deleted
- [ ] Cannot remove last item — remove button disabled or item remains
- [ ] Customer-specific terms auto-load on customer + quotation type change — terms section populated
- [ ] Submit without customer — validation error "Customer is required"
- [ ] Submit with zero rate — validation error
- [ ] Submit with zero quantity — validation error
- [ ] Submit successfully → redirected to quotation detail page — new quotation number shown
- [ ] Add buyer inline ("+" button) → modal opens, buyer created, appears in dropdown — no page reload

### 3.3 Create Non-Standard Quotation
- [ ] Free-text item description field present — user can type any description
- [ ] Past quote dropdown shows only NON_STANDARD quotations — standard quotes absent
- [ ] Material code selected → only `pastQuote` and `pastQuotePrice` set — no auto-fill of other fields
- [ ] All calculations (subtotal, tax, grand total) work same as standard — correct math

### 3.4 Quotation Detail (`/quotations/[id]`)
- [ ] Overview tab shows header details — customer, buyer, type, currency, validity, deal owner
- [ ] Items tab shows all line items — correct product, qty, rate, amount
- [ ] Terms tab shows all terms — name, value, included/excluded
- [ ] History tab shows audit trail — create, update, approve, send events
- [ ] Revisions tab shows all versions — v1, v2, v3 etc.
- [ ] DRAFT status → Edit, Delete, Submit for Approval buttons visible
- [ ] PENDING_APPROVAL status → Approve/Reject buttons visible to MANAGEMENT/ADMIN; Edit visible
- [ ] APPROVED status → Revise, Send, Convert to SO, Cancel buttons visible
- [ ] SENT status → Mark Won, Mark Lost, Revise buttons visible
- [ ] WON/LOST status → No action buttons except view
- [ ] SALES role cannot see Approve button — approval UI absent
- [ ] Submit for Approval → status changes to PENDING_APPROVAL — toast success, status badge updates
- [ ] Approve → status changes to APPROVED — remarks stored, approval date shown
- [ ] Reject with remarks → status changes to REJECTED — remarks saved
- [ ] Reject without remarks → validation error "Remarks required" — cannot reject blank
- [ ] Send email → Email dialog opens, pre-filled with customer email — can edit To/CC/Subject
- [ ] Send email successfully → email log entry created, status stays APPROVED or becomes SENT
- [ ] Convert to SO from APPROVED → SO created, quotation stays APPROVED — success toast, SO link shown
- [ ] Revise quotation → revision dialog opens — trigger type and notes required
- [ ] Revision created → new version (v+1) created, old version becomes SUPERSEDED — both visible in Revisions tab
- [ ] Mark Lost → loss reason dialog — reason required
- [ ] Mark Won → confirmation shown — status becomes WON
- [ ] Delete DRAFT → confirmation dialog → quotation deleted — redirected to list
- [ ] Cannot delete non-DRAFT — delete button absent

### 3.5 Quotation Compare (`/quotations/[id]/compare`)
- [ ] Side-by-side table loads — current version vs previous version shown
- [ ] Changed fields highlighted — price/qty differences visible

### 3.6 Quotation PDF
- [ ] Quoted PDF — all item rates and amounts shown
- [ ] Unquoted PDF — rate column blank
- [ ] PDF contains company letterhead/logo — correct branding
- [ ] PDF shows customer GSTIN, address — correct customer data
- [ ] PDF amount in words correct — Indian numbering (Lakhs, Crores)

---

## 4. SALES MODULE

### 4.1 Sales Orders List (`/sales`)
- [ ] List loads — SO number, date, customer, status, PO Acceptance status shown
- [ ] Filter by OPEN — only open SOs shown
- [ ] Filter by FULLY_DISPATCHED — correct SOs shown
- [ ] "Pending PO Acceptance Review" tab — SOs with PENDING acceptance listed
- [ ] Create PR from SO shortfall — PR created with shortfall items pre-filled

### 4.2 Sales Order Detail (`/sales/[id]`)
- [ ] Header shows linked quotation, customer PO — links clickable
- [ ] Stock reservation section shows reserved qty vs required — correct counts
- [ ] Reserve stock → inventory status updates to RESERVED — confirmation shown
- [ ] Release reservation → stock returns to ACCEPTED — confirmation shown
- [ ] "Create Dispatch Note" — navigates to dispatch creation pre-filled with SO
- [ ] "Create Invoice" — navigates to invoice creation pre-filled with SO

### 4.3 Client PO Register
- [ ] Create CPO with valid SO reference — CPO number generated
- [ ] CPO status transitions: DRAFT → REGISTERED — save and submit works
- [ ] Edit CPO while in DRAFT — fields editable
- [ ] Cannot edit REGISTERED CPO without admin role — fields read-only

### 4.4 PO Acceptance
- [ ] Create PO acceptance against CPO — acceptance letter generated
- [ ] Status ACCEPTED → green badge — visual confirmation
- [ ] Status REJECTED → red badge — visual confirmation
- [ ] Status HOLD → orange badge — visual confirmation
- [ ] Generate acceptance letter PDF — opens/downloads correctly
- [ ] Send acceptance email → email log recorded — toast "Email sent"

### 4.5 PO Tracking
- [ ] List shows all customer POs with fulfillment % — correct percentages
- [ ] Detail view shows line-item fulfillment — each item's dispatched qty vs ordered qty
- [ ] PO variance alert shown when amendment > 10% qty or 5% rate — warning highlighted

---

## 5. PURCHASE MODULE

### 5.1 Purchase Requisitions
- [ ] Create PR manually with items — PR number generated `PR/{FY}/{SEQ}`
- [ ] Create PR from SO with shortfall — items pre-populated from SO shortfall
- [ ] Submit PR → status PENDING_APPROVAL — submit button disabled post-click
- [ ] MANAGEMENT approves PR → status APPROVED — approval date stored
- [ ] MANAGEMENT rejects PR with remarks → status REJECTED — remarks saved
- [ ] PURCHASE role cannot approve — approval button absent
- [ ] Submit without items — validation error "At least one item required"
- [ ] Required-by date in the past — validation error

### 5.2 RFQ
- [ ] Create RFQ from approved PR — vendors selectable
- [ ] Select multiple vendors — all listed in RFQ vendor section
- [ ] Send RFQ email to vendors — email log created, status SENT
- [ ] Record vendor response → status changes to PARTIALLY_RESPONDED / ALL_RESPONDED
- [ ] Close RFQ — status CLOSED, no further vendor responses accepted

### 5.3 Supplier Quotations
- [ ] Record supplier quotation against RFQ — price, delivery date, terms saved
- [ ] Mark quotation as REVISED — new version created
- [ ] Mark quotation EXPIRED — status updates

### 5.4 Comparative Statement
- [ ] Create CS from PR + supplier quotations — vendor comparison matrix displayed
- [ ] Select preferred vendor per item — selection saved
- [ ] Submit CS for approval → status PENDING_APPROVAL
- [ ] Approve CS → status APPROVED — PO creation unlocked
- [ ] PO created from CS — vendor and items pre-filled

### 5.5 Purchase Orders
- [ ] Create PO from approved PR — vendor, items auto-filled
- [ ] Create PO from approved CS — selected vendor pre-filled
- [ ] Submit PO for approval → status PENDING_APPROVAL
- [ ] MANAGEMENT approves PO → status OPEN
- [ ] Send PO to vendor (email) → status SENT_TO_VENDOR, email log created
- [ ] Generate PO PDF — downloads with all items and terms
- [ ] Amend PO qty > 10% → variance flag shown — warning badge/alert
- [ ] Amend PO rate > 5% → variance flag shown — warning badge/alert
- [ ] GRN created against PO → PO status PARTIALLY_RECEIVED
- [ ] All GRN items received → PO status FULLY_RECEIVED
- [ ] Cancel PO in DRAFT → confirmation, status CANCELLED
- [ ] Cannot cancel FULLY_RECEIVED PO — cancel button absent

### 5.6 Purchase Dashboard
- [ ] Metrics load — Open PRs, Pending RFQs, Vendor responses, Open POs, Delivery performance
- [ ] Clicking metric card navigates to filtered list — correct filter applied

---

## 6. INVENTORY MODULE

### 6.1 GRN Create (`/inventory/grn/create`)
- [ ] Select PO → vendor auto-fills, PO items listed — correct data shown
- [ ] Enter heat number for each item — field accepts alphanumeric
- [ ] Submit GRN without heat number — validation error "Heat Number is mandatory for item 1"
- [ ] Enter received qty > PO qty × 105% — error "Excess receipt: Cannot receive more than 105% of PO quantity"
- [ ] Submit valid GRN → inventory stock records created with UNDER_INSPECTION status — stock list shows new entries
- [ ] GRN number generated `GRN/{FY}/{SEQ}` — correct format
- [ ] Submit GRN without PO link — validation error

### 6.2 Stock View (`/inventory`)
- [ ] All stock items listed — product, size, material, heat number, qty, status, warehouse
- [ ] Filter by ACCEPTED status — only accepted stock shown
- [ ] Filter by UNDER_INSPECTION — inspection items shown
- [ ] Filter by RESERVED — reserved items shown
- [ ] Filter by product — filtered list correct
- [ ] Filter by warehouse — only that warehouse's items shown
- [ ] Click stock item → pipe details (NPS, Schedule, OD, WT) shown — correct master data

### 6.3 Stock Issue
- [ ] Create stock issue from SO — items pre-filled
- [ ] Submit for authorization → status PENDING_AUTHORIZATION
- [ ] MANAGEMENT/ADMIN authorizes → status AUTHORIZED, stock marked as DISPATCHED
- [ ] Reject stock issue — status REJECTED
- [ ] Cannot issue more qty than available — validation error
- [ ] Generate issue slip PDF — downloads correctly

### 6.4 Heat Lifecycle
- [ ] Enter heat number → full lifecycle shown: GRN → Inspection → QC Release → Stock → Dispatch → Invoice
- [ ] Unknown heat number → "Not found" message — no crash

---

## 7. QUALITY MODULE

### 7.1 Inspections
- [ ] Create inspection against GRN — GRN items listed
- [ ] Record PASS result → QC Release unlocked — button appears
- [ ] Record FAIL result → item cannot proceed — status shows REJECTED
- [ ] Record HOLD → item status HOLD — further action required
- [ ] Attach inspection report document — file upload works
- [ ] Submit inspection without GRN link — validation error

### 7.2 Inspection Offers
- [ ] Create inspection offer — customer, TPI agency, items, date selected
- [ ] PDF generated — opens with inspection details, heat numbers, qty
- [ ] Send to customer/TPI — email log created
- [ ] Status: DRAFT → SENT workflow works — status badge updates
- [ ] Approve inspection offer (MANAGEMENT) — status changes
- [ ] Reject inspection offer with remarks — status REJECTED, remarks stored

### 7.3 Inspection Prep
- [ ] Create prep linked to inspection offer — items set to PREPARING
- [ ] Mark as READY — status updates

### 7.4 QC Release
- [ ] Release PASS items → inventory status changes UNDER_INSPECTION → ACCEPTED — stock now available
- [ ] Cannot release without inspection report attached — validation error
- [ ] FAIL items cannot be released — release blocked

### 7.5 MTC Certificates
- [ ] Create MTC with heat numbers — test results (tensile, yield, elongation, hardness, chemistry) entered
- [ ] Select MTC_3_1 type — correct template shown
- [ ] Select MTC_3_2 type — different template shown
- [ ] Finalize MTC → status FINALIZED — no further edits allowed
- [ ] Generate MTC PDF — all test results, chemistry values shown
- [ ] Revise finalized MTC → new version created — original stays as REVISED

### 7.6 NCR
- [ ] Create NCR for non-conforming items — NCR number generated
- [ ] Assign responsible person — dropdown works
- [ ] Select disposition RETURN_TO_VENDOR — disposition stored
- [ ] Status: OPEN → UNDER_INVESTIGATION → CORRECTIVE_ACTION_IN_PROGRESS → CLOSED
- [ ] Close NCR requires evidence document — validation error if missing
- [ ] Verify closure — status VERIFIED

### 7.7 Lab Letters & Reports
- [ ] Create lab letter — PDF generates with test requirements
- [ ] Upload lab report — file stored, linked to heat number
- [ ] Lab report type CHEMICAL — chemical results fields shown
- [ ] Lab report type MECHANICAL — mechanical results fields shown

---

## 8. DISPATCH & FINANCE MODULE

### 8.1 Packing Lists
- [ ] Create packing list from SO — stock items selectable
- [ ] Select items → bundle details (gross weight, net weight, marking) editable
- [ ] Submit without items — validation error
- [ ] Generate packing list PDF — bundle details correct
- [ ] Cannot create packing list for fully dispatched SO — error shown

### 8.2 Dispatch Notes
- [ ] Create dispatch note from packing list — packing list items pre-filled
- [ ] Enter vehicle number, transporter, expected delivery — saved correctly
- [ ] Mark as DISPATCHED — status updates, SO status updates to PARTIALLY/FULLY_DISPATCHED
- [ ] Generate dossier/bundle PDF — includes packing list + dispatch details

### 8.3 Invoices
- [ ] Create DOMESTIC invoice from SO — SGST/CGST tax applied (intra-state)
- [ ] Create EXPORT invoice — IGST applied or zero-rated
- [ ] Create PROFORMA invoice — status stays DRAFT, amount in words shown
- [ ] Invoice number format: `INV/{FY}/{SEQ}` — correct
- [ ] Export invoice: `EXP/{FY}/{SEQ}` — correct
- [ ] Enable Round-off → grand total rounded — correct rounding
- [ ] Add TCS amount → grand total includes TCS — correct math
- [ ] Email invoice to customer — email log created, PDF attached or linked
- [ ] Generate invoice PDF — letterhead, GSTIN, items, tax breakdown, amount in words
- [ ] Generate e-invoice JSON — valid JSON for GST portal
- [ ] Status: DRAFT → SENT → PARTIALLY_PAID → PAID workflow
- [ ] Cancel DRAFT invoice → status CANCELLED — list no longer shows it as active
- [ ] Cannot delete SENT invoice — delete button absent
- [ ] View linked payment receipts — payments section shows amounts and dates

### 8.4 Credit & Debit Notes
- [ ] Create credit note linked to original invoice — customer and tax auto-fill
- [ ] Partial credit amount — original invoice remains PARTIALLY_PAID
- [ ] Full credit → original invoice marked CANCELLED — linked correctly
- [ ] Create debit note — reason stored, PDF generated
- [ ] Credit note without original invoice — validation error "Original invoice required"

### 8.5 Payments
- [ ] Create payment receipt against invoice — invoice marked PARTIALLY_PAID or PAID
- [ ] Payment mode RTGS — reference field shown
- [ ] Payment mode CASH — reference field optional
- [ ] Partial payment → invoice status PARTIALLY_PAID, outstanding balance updated
- [ ] Full payment → invoice status PAID — payment complete
- [ ] Multiple invoices in one receipt — all invoices updated
- [ ] Payment amount > outstanding balance — validation error

### 8.6 Bank Reconciliation
- [ ] Unreconciled payments listed — amounts, dates shown
- [ ] Match payment to bank entry — status updated
- [ ] Discrepancy shown when amounts differ — warning displayed

---

## 9. MASTERS MODULE

### 9.1 Customers
- [ ] Create customer with all required fields — customer saved, in dropdown
- [ ] Create DOMESTIC customer — `customerType = DOMESTIC` stored
- [ ] Create INTERNATIONAL customer — `customerType = INTERNATIONAL` stored
- [ ] Edit customer — changes saved, quotation auto-defaults update
- [ ] Duplicate GST number — validation error "GST number already exists"
- [ ] Soft-delete customer — marked inactive, not in active dropdowns
- [ ] Add dispatch address — address saved, selectable in dispatch
- [ ] View quotation history — all quotations for customer shown
- [ ] Customer-specific payment terms — auto-load in quotation

### 9.2 Buyer Contact (formerly Customer/Vendor Contacts)
- [ ] Page title shows "Buyer Contact" — correct label
- [ ] Add Buyer Contact button shows "Add Buyer Contact" — correct label
- [ ] Dialog field shows "Buyer Name *" (not "Contact Name") — correct label
- [ ] Table column shows "Buyer Name" — correct
- [ ] Breadcrumb shows "Buyer Contact" — correct
- [ ] Sidebar shows "Buyer Contact" — correct
- [ ] Department dropdown shows departments from Department Master — dynamic list, not fixed enum
- [ ] Add contact with department from master — saved with department string value
- [ ] "All Departments" filter resets to show all contacts — no `?department=all` sent to API
- [ ] "All Customers" filter resets to show all contacts — no `?customerId=all` sent to API
- [ ] New buyer contact appears in quotation Buyer dropdown — contact visible after creation
- [ ] Select buyer contact (from Buyer Contact master) in quotation → on save, BuyerMaster entry auto-created — quotation saved successfully

### 9.3 Employees
- [ ] Create employee with module access — permissions stored as JSON
- [ ] Employee linked to user account — user can log in with assigned modules
- [ ] Edit module access — changes reflected on next login
- [ ] Remove all module access — user sees empty sidebar

### 9.4 Products / Sizes / Fittings / Flanges
- [ ] Create size (NPS, Schedule, OD, WT) — available in quotation size dropdown
- [ ] Edit size — updated values auto-fill in quotation on size change
- [ ] Delete size — no longer in dropdown (confirm no orphan references)
- [ ] Duplicate NPS+Schedule combination — validation error

### 9.5 Material Codes
- [ ] Create material code — code appears in quotation autocomplete
- [ ] Duplicate material code check — warning shown with existing code
- [ ] Record material code from quotation item — creates/updates master entry

### 9.6 Department Master
- [ ] Add department — appears in Buyer Contact department dropdown
- [ ] Edit department name — dropdown updates
- [ ] Delete department — no longer in dropdown

### 9.7 Warehouses
- [ ] Create warehouse — available in stock and dispatch selectors
- [ ] Add location to warehouse — location appears in stock issue
- [ ] Edit warehouse details — changes saved

### 9.8 Other Masters (Payment Terms, Delivery Terms, Taxes, UOM, Lengths, Currencies)
- [ ] Create payment term — available in quotation dropdown
- [ ] Create delivery term — available in quotation dropdown
- [ ] Tax rate (0/5/12/18/28) — shows in quotation and invoice
- [ ] Currency with exchange rate — conversion works in quotation
- [ ] UOM (Mtr/KGS/NOS/PCS) — available in item UOM dropdown

---

## 10. ADMIN MODULE

### 10.1 User Management (`/admin`)
- [ ] List all users — name, email, role, active status, last login shown
- [ ] Create user with SALES role — user can log in, sees only Sales in sidebar
- [ ] Create user with duplicate email — error "Email already exists"
- [ ] Disable user (soft delete) — user cannot log in, marked inactive
- [ ] Reset password for user — new password works on login
- [ ] Edit user role — role change reflected on next login
- [ ] Non-ADMIN cannot access `/admin` — 403 shown

### 10.2 Audit Logs
- [ ] All CREATE actions logged — table, record ID, user, timestamp shown
- [ ] All UPDATE actions logged — old value, new value, field name recorded
- [ ] All APPROVE/REJECT actions logged — status transition captured
- [ ] Filter by action type — only matching entries shown
- [ ] Filter by table name — only that table's logs shown
- [ ] Filter by date range — correct entries shown
- [ ] Pagination works — next page loads more records

### 10.3 Traceability
- [ ] Enter heat number → full chain shown: GRN → Inspection → QC Release → Stock → Dispatch → Invoice
- [ ] Chain is clickable — each step navigates to its record
- [ ] Unknown heat number — "No records found" message

---

## 11. ALERTS

- [ ] Alerts page loads — list of unread alerts shown
- [ ] CRITICAL severity alert — red badge
- [ ] HIGH severity alert — orange badge
- [ ] Mark alert as read — moved out of unread list
- [ ] Dismiss alert — removed from list
- [ ] Filter by severity CRITICAL — only critical alerts shown
- [ ] Filter by type DELIVERY_DEADLINE — only deadline alerts shown
- [ ] Pagination works — next page loads

---

## 12. REPORTS

- [ ] Management review dashboard metrics accurate — matches actual data counts
- [ ] Low stock alert threshold correct — items below threshold shown
- [ ] On-Time Delivery % calculated correctly — (on-time dispatches / total) × 100

---

## 13. EDGE CASES & ERROR STATES

### Form Edge Cases
- [ ] Quotation with 50+ line items — form handles large item list without crash
- [ ] Customer name with special characters (& / ' ") — saved and displayed correctly
- [ ] GST number 15-char alphanumeric — valid format accepted
- [ ] Negative quantity in quotation — validation error
- [ ] Quotation rate = 0 — validation error "Rate must be positive"
- [ ] Discount > 100% — validation error
- [ ] Validity date = today — accepted (same-day validity allowed)
- [ ] Validity date in the past — error "Validity date must be in the future"
- [ ] Currency changed after items entered — exchange rate conversion dialog appears, amounts converted
- [ ] Two users edit same quotation simultaneously — last-write-wins or conflict message shown

### Business Rule Edge Cases
- [ ] Create SO from DRAFT quotation — error "Quotation must be approved or sent"
- [ ] Create GRN against cancelled PO — error "PO is cancelled"
- [ ] Release stock in UNDER_INSPECTION without passing inspection — error blocked
- [ ] Create invoice for cancelled SO — error "Sales Order is cancelled"
- [ ] Payment amount = 0 — validation error
- [ ] NCR closed without evidence document — validation error "Evidence document required"
- [ ] Revise a LOST quotation — new version created, previous status stays LOST
- [ ] Approve quotation with SALES role — 403 "Access denied"
- [ ] Delete APPROVED quotation — error "Only DRAFT quotations can be deleted"
- [ ] GRN total received > PO qty × 105% — error "Excess receipt not allowed"
- [ ] Heat number used in two separate GRNs — duplicate heat number warning or block

### Dropdown / Autocomplete Edge Cases
- [ ] Customer with no buyers — "No buyer selected" option only
- [ ] Customer with 100+ buyers — dropdown still scrollable and searchable
- [ ] Material code search with no match — "No results" shown, can still type free-text
- [ ] Size dropdown with product change — size list resets (CS vs SS sizes)
- [ ] Buyer Contact added in master → visible in Buyer dropdown without page reload — live after next fetch

---

## 14. API FAILURES & LOADING STATES

### Loading States
- [ ] Quotation list loading — skeleton table rows shown
- [ ] Quotation detail loading — skeleton cards shown
- [ ] Form dropdowns loading — "Loading..." or disabled state shown
- [ ] PDF generation in progress — button shows loading spinner
- [ ] Email sending in progress — send button disabled, spinner shown
- [ ] Approval action in progress — button disabled

### API Error Handling
- [ ] Quotation list API returns 500 — toast error "Failed to load quotations", no crash
- [ ] Customer API returns 500 — dropdown shows empty with error toast
- [ ] PDF API returns 500 — error toast, button re-enabled
- [ ] Email API returns 500 — error toast "Failed to send email", email dialog stays open
- [ ] Create quotation returns 400 — inline error shown, form stays open
- [ ] Approve returns 403 — toast "Access denied", status unchanged
- [ ] Save returns 404 (record deleted by another user) — error "Quotation not found"
- [ ] Network error during save — toast "Failed to save", data not lost from form
- [ ] Session expires mid-form — redirect to login, form data warning (or preserved)

### Concurrent State Changes
- [ ] Quotation approved by Manager while Sales is editing — on submit, error about status change
- [ ] Stock reserved by another SO during dispatch creation — insufficient stock error

---

## 15. NAVIGATION & DEEP LINKS

- [ ] Direct URL `/quotations/[valid-id]` — loads correct quotation
- [ ] Direct URL `/quotations/[invalid-id]` — 404 page shown, not crash
- [ ] Direct URL `/purchase/orders/[id]` as SALES role — 403 shown
- [ ] Browser back button after creating quotation — returns to list (not create form)
- [ ] Browser back after approving — returns to quotation detail (not approval form)
- [ ] Breadcrumbs: Quotations > Q-2024-001 — both crumbs clickable
- [ ] Breadcrumb "Buyer Contact" — navigates to `/masters/customer-contacts`
- [ ] Sidebar active state — current page link highlighted
- [ ] Quotation link from SO detail — opens correct quotation
- [ ] PO link from GRN detail — opens correct PO
- [ ] Invoice link from payment detail — opens correct invoice
- [ ] Heat lifecycle step links — each step navigates to its record
- [ ] Pagination: URL updates on page change (`?page=2`) — shareable/bookmarkable
- [ ] Filter in URL: `/quotations?status=APPROVED` — filter pre-applied on load

---

## 16. OFFLINE / NO INTERNET BEHAVIOR

- [ ] No internet on page load — browser default offline page (Next.js server-side fetch fails gracefully)
- [ ] Lose internet while filling quotation form — form data preserved in state, save fails with toast error
- [ ] Lose internet after clicking "Create Quotation" — spinner shows, then error toast "Network error", form re-enabled
- [ ] Lose internet during PDF download — partial download fails, error toast shown
- [ ] Regain internet → retry save — save succeeds without data loss
- [ ] API timeout (>30s) — request fails with toast error, not infinite loading
- [ ] Slow connection (3G) — loading skeletons shown, data eventually appears

---

## 17. PERFORMANCE CHECKPOINTS

- [ ] Dashboard loads in < 3 seconds — metrics visible within 3s on standard connection
- [ ] Quotation list (100+ records) loads in < 2 seconds — list renders without jank
- [ ] Quotation create form (large customer list 500+) loads dropdowns in < 2 seconds
- [ ] PDF generation completes in < 10 seconds for quotation with 20 items
- [ ] MTC PDF generation completes in < 10 seconds — chemistry + mechanical results included
- [ ] Audit log (10,000+ entries) paginates without memory issue — first page loads < 2s
- [ ] Switching between tabs on quotation detail (Overview/Items/Terms/History) < 500ms
- [ ] Material code autocomplete responds in < 1 second as user types — no UI freeze
- [ ] Size dropdown renders 1000+ sizes without lag — virtualized or fast enough
- [ ] Inventory stock list (10,000+ entries) paginates correctly — first page < 2s
- [ ] Email send (with PDF attachment) completes in < 15 seconds — success toast shown
- [ ] Browser memory stable after navigating 20+ pages — no memory leak visible in DevTools

---

## 18. PLATFORM-SPECIFIC BEHAVIOR

### Browser Compatibility
- [ ] Chrome (latest) — all features work, PDF opens in new tab
- [ ] Edge (latest) — all features work, no UI breaks
- [ ] Firefox — dropdowns, dialogs render correctly
- [ ] Safari (macOS) — date pickers work natively or via custom picker
- [ ] Chrome on Android — all form inputs usable with mobile keyboard

### Responsive / Mobile Viewport
- [ ] Sidebar collapses on screen < 768px — hamburger menu visible
- [ ] Quotation list table is scrollable horizontally on mobile — no overflow cut-off
- [ ] Create quotation form stacks vertically on mobile — all fields reachable
- [ ] Dialog boxes fit within mobile viewport — no fields hidden behind keyboard
- [ ] Item table rows scrollable on mobile — OD/WT/Qty/Rate all accessible
- [ ] PDF download on mobile — opens in browser PDF viewer or downloads
- [ ] Toast notifications visible on mobile — not obscured by UI

### Date & Number Formatting
- [ ] Dates display in DD-MMM-YY format (`17-Apr-26`) — consistent across all pages
- [ ] Currency amounts show 2 decimal places — e.g., ₹1,25,000.00
- [ ] Amount in words uses Indian numbering (Lakhs, Crores) — not US Millions/Billions
- [ ] GST % always shows integer (18%, not 18.0%) — consistent display
- [ ] Decimal separator is `.` not `,` for all numeric inputs — no locale confusion

### Print
- [ ] Quotation PDF print — correct page breaks, no cut-off content
- [ ] Invoice PDF print — all GST fields, amounts in words visible on print
- [ ] MTC PDF print — test results table fits on page
- [ ] Browser print (`Ctrl+P`) on detail page — page layout is reasonable

### File Upload/Download
- [ ] Upload inspection report (PDF, max size) — file saved and retrievable
- [ ] Upload MTC document — linked correctly to certificate
- [ ] Download e-invoice JSON — valid JSON file, correct Content-Type header
- [ ] Download PDF in Windows (Chrome) — file saved to Downloads, opens with Acrobat/Edge

---

## 19. SECURITY

- [ ] SALES role cannot access `/api/purchase/orders` POST — 403 returned
- [ ] ACCOUNTS role cannot POST to `/api/quotations` — 403 returned
- [ ] STORES role cannot approve PR (`/api/purchase/requisitions/[id]/approve`) — 403
- [ ] Company A's data not visible when logged in as Company B user — query isolation
- [ ] SQL injection attempt in search field — sanitized by Prisma ORM, no data leak
- [ ] XSS in customer name (`<script>alert(1)</script>`) — rendered as text, not executed
- [ ] CSRF: API routes require valid session cookie — unauthenticated POST returns 401
- [ ] Brute-force login: 10+ failed attempts — no lockout yet (document as known gap if missing)
- [ ] Password stored as bcrypt hash — plaintext not in DB or logs
- [ ] Audit log captures failed login attempts — LOGIN_FAILED action recorded

---

*Last updated: 2026-04-17. Re-run after each major feature deployment.*
