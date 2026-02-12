# Claude Code Prompt — ERP Changes & Updates (v2)

> **Context:** This prompt covers ALL changes requested by the client after the initial PRD was shared. Use this AFTER Phase 0 (project setup) is complete, OR as a revision prompt if any phase is already built. Attach the following files along with this prompt:
> - `PRD_ERP_System.md` (original PRD — still the base reference)
> - `ERP_CHANGES__1_.docx` (client change document)
> - `New_changes.txt` (additional notes from client meeting)
> - `WhatsApp_Image_2026-02-12_at_9_29_09_PM.jpeg` (Customer Master UI reference)
> - `PIPES_QUOTATION_FORMAT__3_.xlsx` (UPDATED Standard Quotation template — has column changes)
> - `EXPORT_QUOTATION_FORMAT-1__2_.xlsx` (Non-Standard/Export Quotation template)

---

## WHAT CHANGED — SUMMARY OF ALL CHANGES

The client has requested significant structural changes across multiple areas. Here is every change, organized by module:

### CHANGE GROUP 1: New Master Tables (Company, Employee, Buyer, Unit)
### CHANGE GROUP 2: Customer Master Redesign (new UI, new fields, dispatch address, buyer linkage)
### CHANGE GROUP 3: Quotation Module Restructure (Standard vs Non-Standard, Domestic vs Export toggle)
### CHANGE GROUP 4: Standard Quotation Column Changes (Size split into NPS + Schedule)
### CHANGE GROUP 5: Offer Terms Redesign (checkbox-based, editable, add-new capability)
### CHANGE GROUP 6: Material Code / Item Code system
### CHANGE GROUP 7: Supplier/Vendor Master Enhancement

---

## FULL PROMPT — IMPLEMENT ALL CHANGES

```
I need to implement major changes to the ERP system based on updated client requirements. Read everything below carefully — these override/extend the original PRD where applicable.

=============================================================
CHANGE 1: NEW — COMPANY MASTER (Settings Module)
=============================================================

Add a new "Company Master" screen under Settings/Admin. This stores the company's own details (not customer). Only Admin role can edit.

Fields:
- Company Name (text, required)
- Type of Company (dropdown: Proprietorship / Partnership / LLP / Limited / Private Limited / HUF)
- Registered Address: Line 1, Line 2, City, Pincode, State, Country (all required)
- Warehouse Address: Line 1, Line 2, City, Pincode, State, Country
- PAN No. (text, validated format: ABCDE1234F)
- TAN No. (text)
- GST No. (text, validated 15-char format)
- CIN No. (text)
- Telephone No. (text)
- Email (email, required)
- Website (URL)
- Company Logo (image upload — used on quotation/invoice headers)
- Financial Year Start Month (dropdown, default: April) — this controls document numbering reset

This data is used in:
- Quotation PDF headers/footers
- Invoice generation
- All printed documents

Also add a "Financial Year Management" sub-screen:
- List of financial years (e.g., 2025-26, 2026-27)
- Active financial year indicator
- Document number sequences reset per FY


=============================================================
CHANGE 2: NEW — EMPLOYEE MASTER
=============================================================

Add a new "Employee Master" screen. This is SEPARATE from user accounts — it stores employee profile data. A user account can be linked to an employee record.

Fields:
- Employee ID (auto-generated)
- Department (dropdown: Purchase, Sales, Quality, Warehouse, Accounts)
- Name of Employee (text, required)
- Designation (text, required)
- Email ID (email, required)
- Mobile No. (text, required)
- Telephone No. (text)
- Linked User Account (optional dropdown — links to auth user for "Prepared By" on quotations)
- Status: Active / Inactive

Use case: When a Sales person creates a quotation, "Prepared By" section shows their name, designation, email, mobile from this master.


=============================================================
CHANGE 3: CUSTOMER MASTER — COMPLETE REDESIGN
=============================================================

The Customer Master form must be COMPLETELY REDESIGNED to match the attached screenshot (WhatsApp_Image_2026-02-12_at_9_29_09_PM.jpeg). Design a modal/drawer form with this exact layout:

**Section 1: Contact Person Details** (top section with grey background label)
- Name * (text, required)
- Email * (email, required)
- Phone No. (text)

**Section 2: Company Details**
- Company Type toggle: ○ Buyer  ○ Supplier  ○ Both (radio buttons — this determines if entity shows in customer dropdown, vendor dropdown, or both)
- Company Name * (text, required)
- Email * (email, required)
- GST Number (text with "Fetch Details" button — when clicked, auto-fills company name, address from GST database if possible)
- GST Type (dropdown: Regular / Composition / Unregistered / SEZ)
- Info text: "⚠ Verify the GST number to capture all the details automatically."
- Address Line 1 * (text, required)
- Address Line 2 * (text)
- Pincode * (text, required — on entry, auto-suggest City/State)
- City * (text, required)
- State * (dropdown, required)
- Country * (dropdown, default: India, required)

**Section 3: Additional Details**
- Company Reference Code (text — internal reference)
- Select Tags (multi-select dropdown — for categorization like "Oil & Gas", "Power", "Petrochemical")
- "+ Assign Tags" button to create new tags

**Section 4: NEW FIELDS (not in screenshot but required per ERP_CHANGES doc)**
- Opening Balance (decimal — opening balance of the customer account)
- Default Payment Terms (dropdown from Payment Terms master)
- Default Currency (dropdown: INR / USD / EUR / AED)
- Default Terms & Conditions (multi-select from Offer Terms master — these auto-populate when creating a quotation for this customer)

**Section 5: Dispatch Address(es)** — CRITICAL NEW REQUIREMENT
Customer can have MULTIPLE dispatch addresses. Add a sub-section with "+ Add Dispatch Address" button. Each dispatch address has:
- Label (text, e.g., "Site Office", "Warehouse", "Project Site")
- Address Line 1, Line 2
- City, Pincode, State, Country
- Consignee Name (text — may differ from buyer)
- Place of Supply (dropdown — State, for GST purposes)

These dispatch addresses are used when creating invoices (Buyer details vs Consignee details vs Place of Supply).

**Footer:**
- "💚 100% Safe and Compliant with Indian Govt Laws and Regulations" (green info bar)
- "+ Assign Tags" button (bottom left)
- "💾 Save" button (bottom right, green)

**UI Design Notes:**
- Use a slide-out drawer or full-page form (NOT a small modal)
- Grouped sections with grey section headers
- Clean spacing matching the screenshot style
- Form validation with inline error messages
- Responsive for desktop


=============================================================
CHANGE 4: NEW — BUYER MASTER (Sub-entity of Customer)
=============================================================

Add a new "Buyer Master" — this connects MULTIPLE individual buyers to a single Customer/Client company. This is a critical change.

Schema relationship: Customer (1) → Buyers (many)

Buyer Master fields:
- Buyer ID (auto-generated)
- Customer/Client (dropdown — select from Customer Master, required)
- Buyer Name (text, required)
- Designation (text)
- Email ID (email, required)
- Mobile No. (text)
- Telephone No. (text)
- Status: Active / Inactive

WHERE THIS IS USED:
- Enquiry form: select Customer first, then select Buyer from that customer's buyers
- Quotation: "Attn:" field pulls from Buyer Master
- Reports: "Which buyer gives most business company-wise" — query quotations converted to orders grouped by buyer, grouped by customer

Build a Buyer Performance Report:
- Table: Customer Name | Buyer Name | Total Quotations | Quotations Converted to Order | Conversion Rate % | Total Order Value
- Filter by: Date range, Customer


=============================================================
CHANGE 5: VENDOR/SUPPLIER MASTER — SAME STRUCTURE AS CUSTOMER
=============================================================

The Vendor Master must follow the SAME form design as Customer Master (Change 3 above), with the "Supplier" radio button pre-selected.

Additional vendor-specific fields:
- Products Supplied (multi-select from Product Master)
- Lead Time (text, e.g., "4-6 Weeks")
- Approved Vendor Status (Yes/No with approval date)
- Bank Details (Account No., IFSC, Bank Name — for payment processing)
- Vendor Rating (auto-calculated from performance data)

IMPORTANT: Since Customer Master now has the "Buyer / Supplier / Both" toggle, a single entity CAN be both a customer and a supplier. The system must handle this — show in both customer and vendor dropdowns when "Both" is selected.

Vendor flow integration:
- Issue inquiry TO vendor against a client order received
- Issue purchase order to vendor
- Create inward GRN from vendor


=============================================================
CHANGE 6: QUOTATION MODULE — MAJOR RESTRUCTURE
=============================================================

The quotation module now has a 2-LEVEL SELECTION before creating a quotation:

**Level 1 — Quotation Type Selection:**
┌──────────────────┐  ┌──────────────────────┐
│ STANDARD         │  │ NON-STANDARD          │
│ QUOTATION        │  │ QUOTATION             │
│                  │  │                       │
│ For: Pipes,      │  │ For: All other items  │
│ Fittings,        │  │ not in standard       │
│ Flanges          │  │ masters. Free-text    │
│ (from masters)   │  │ description entry.    │
└──────────────────┘  └──────────────────────┘

**Level 2 — Market Selection (inside the quotation form):**
Dropdown toggle: [ Domestic ▼ ] or [ Export ▼ ]

This changes:
- Domestic: Currency = INR (default), Offer terms = domestic defaults
- Export: Currency = USD (default, but editable via dropdown: USD/EUR/AED), Offer terms = export defaults with 9 Notes

So there are effectively 4 quotation combinations:
1. Standard + Domestic
2. Standard + Export
3. Non-Standard + Domestic
4. Non-Standard + Export

All 4 share the same quotation number series (NPS/YY/NNNNN) but are tagged by type.


=============================================================
CHANGE 7: STANDARD QUOTATION — COLUMN STRUCTURE CHANGE
=============================================================

The Standard Quotation line items table has been UPDATED. The old "Size" column is now SPLIT into two separate columns: "Size (NPS)" and "Schedule". Compare:

OLD (from original PRD):
| S/N | Product | Material | Additional Spec | Size | OD | W.T. | Length | Ends | Qty | ...

NEW (from updated PIPES_QUOTATION_FORMAT__3_.xlsx > RFQ sheet):
| S/N | Product | Material | Additional Spec | Size (NPS) | OD (mm) | Schedule | W.T. (mm) | Length (Mtr.) | Ends | Qty (Mtr.) | Unit Rate | Amount | Delivery | Remark/Material Code | Unit Weight | QTY M.Ton |

KEY CHANGES:
- "Size" split into → "Size (NPS)" (just the NB size number like 24, 6, 2, etc.) + "Schedule" (separate column like "Sch 40", "Sch 80", "Sch STD")
- When user selects Size (NPS) + Schedule combination → auto-fill OD, WT, Unit Weight from Pipe Size Master
- The Size Master lookup key is now: NPS + Schedule → OD, WT, Weight
- Add "NOTES:" section at bottom of quotation (9 hard-coded notes, same as in the Excel)
- Add footer details (company address, format number, disclaimer text)

Update the Pipe Size Master to support this split:
- Add a "NPS" field (numeric: 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24)
- Add a "Schedule" field (text: Sch 5S, Sch 10, Sch 10S, Sch STD, Sch 40, Sch 40S, Sch XS, Sch 80, Sch 80S, Sch 120, Sch 160, Sch XXS)
- Lookup: NPS + Schedule → OD, WT, Weight

For the STANDARD quotation form:
- Size (NPS) = dropdown with NPS values
- Schedule = dropdown (filtered by what's available for selected NPS)
- OD auto-fills
- WT auto-fills
- Unit Weight auto-fills
- Additional Specification dropdown must be MAPPED product-wise (e.g., CS pipes get NACE options, SS pipes get IGC options)
- Auto serial number when new item is added
- Notes section: 9 notes hard-coded at bottom
- Footer: company registered address, format number "FORMAT: QTN-Rev.2", disclaimer text


=============================================================
CHANGE 8: NON-STANDARD QUOTATION FORMAT
=============================================================

Non-Standard Quotation uses the EXPORT_QUOTATION_FORMAT structure (even for domestic). The line items table is:

| Sr. No. | Item Description | Qty | Unit Rate | Total | Delivery (Ex-Works) |

Where "Item Description" is a RICH TEXT / MULTI-LINE TEXT AREA where the user types or pastes the full item description. The description typically contains:
- MATERIAL CODE: [auto-assigned or manual]
- Product description (free text)
- SIZE: [free text]
- END TYPE: [free text]
- MATERIAL: [free text]
- TAG NUMBER: [free text]
- DWG: [drawing reference, free text]
- ITEM NO.: [free text]
- CERTIFICATE REQUIRED: [free text]

The system should provide a structured template/form that the user fills in, which then combines into the multi-line description. But also allow pure free-text paste for flexibility.

For PDF output:
- COMMERCIAL PDF: Shows actual prices in Unit Rate and Total columns
- TECHNICAL PDF: Replaces Unit Rate and Total with "QUOTED" text
- Both PDFs generated simultaneously from same quotation data

Same Offer Terms section as Standard quotation (checkbox-based, editable).
Same Notes section (9 hard-coded notes).
Same footer.


=============================================================
CHANGE 9: OFFER TERMS — CHECKBOX + EDITABLE SYSTEM
=============================================================

REDESIGN the Offer Terms section on ALL quotation types:

Current behavior (old): Fixed list of 15 terms with editable values.

New behavior:
- Each offer term has a CHECKBOX (to include/exclude from this quotation)
- Each offer term has a FIXED HEADING (e.g., "Price", "Delivery", "Payment") — NOT editable
- Each offer term has EDITABLE FRONT TEXT (the value part, e.g., "Ex-work, Navi Mumbai")
- There is an "+ Add Offer Term" button that allows adding a CUSTOM term where BOTH heading and value are editable
- Default terms come from: (a) System defaults, OR (b) Customer-specific defaults if configured in Customer Master

So the Offer Terms UI looks like:
```
☑ Price           : [Ex-work, Navi Mumbai, India_____________]  ← heading fixed, value editable
☑ Delivery        : [As above, ex-works, after receipt of PO__]
☑ Payment         : [100% within 30 Days from dispatch________]
☐ Offer validity  : [6 Days, subject to stock remain unsold___]  ← unchecked = excluded from PDF
☑ Packing         : [Inclusive_________________________________]
...
[+ Add Offer Term]  ← adds row with BOTH heading and value editable
```

When generating PDF, only CHECKED terms appear in the output.

The default offer terms differ for Domestic vs Export:
- Domestic defaults: all 15 standard terms
- Export defaults: all 15 terms + Currency term (": USD ($)") + 9 Notes section

When a customer has "Default Terms & Conditions" set in Customer Master, those should auto-populate (overriding system defaults) when creating a new quotation for that customer.


=============================================================
CHANGE 10: MATERIAL CODE / ITEM CODE SYSTEM
=============================================================

EVERY item in a quotation (both Standard and Non-Standard) must have a Material Code / Item Code.

- Format: Alphanumeric (e.g., "9715286", "NPS-CS-SMLS-24-40-001")
- For STANDARD quotation items: Auto-generate based on Product + Material + Size + Schedule (create a deterministic code mapping)
- For NON-STANDARD quotation items: Auto-generate a sequential code OR allow manual entry
- This code is stored permanently and linked to the item

PURPOSE: When preparing a new quotation for a customer, the system can:
1. Show "Previous Quotation History" for this customer — what items were quoted before, at what price, whether order was received
2. Search by Material Code across all quotations to find pricing history
3. Build a Material Code Master over time as quotations are created

Add a "Material Code Master" table:
- Material Code (unique, primary key)
- Description (auto-generated from product details for standard, manual for non-standard)
- Product Type, Material Grade, Size, Schedule (for standard items)
- First Quoted Date
- Last Quoted Price
- Times Quoted
- Times Ordered


=============================================================
CHANGE 11: UNIT MASTER
=============================================================

Add a new "Unit Master" (UOM Master) with these pre-seeded values:
- Kg (Kilogram)
- Piece / Pcs
- No. / Nos (Numbers)
- Meter / Mtr
- Feet / Ft
- MM (Millimeter)
- Inch / In
- MT (Metric Ton)
- Set
- Lot
- Bundle

This dropdown should be available on all line item screens (Quotation, PO, SO, Inventory, Invoice).


=============================================================
CHANGE 12: QUOTATION HISTORY & BACKTRACKING
=============================================================

Add a "Quotation History" feature accessible from:
1. Customer Master → "View Quotation History" button
2. Quotation creation screen → "Previous Quotations for this Customer" panel

This shows:
- All past quotations for the selected customer
- Grouped by Buyer (from Buyer Master)
- Each quotation shows: Date, Quotation No., Items summary, Total Value, Status (Won/Lost/Pending)
- Click to view full quotation details
- "Copy to New Quotation" button — clones items into a new draft quotation

Also add a "Similar Buyer Backtrack" feature:
- When creating a quotation, if the buyer has received quotations before, show a banner:
  "This buyer has 5 previous quotations. Last quotation: NPS/25/14320 on 12/01/2025 — ₹45,00,000"
- Click to expand and see the history


=============================================================
DATABASE SCHEMA CHANGES REQUIRED
=============================================================

Add/modify these Prisma models:

1. NEW: CompanyMaster (company's own details)
2. NEW: EmployeeMaster (linked to User optionally)
3. NEW: BuyerMaster (linked to Customer, many-to-one)
4. MODIFIED: CustomerMaster
   - Add: companyType enum (BUYER, SUPPLIER, BOTH)
   - Add: gstType enum (REGULAR, COMPOSITION, UNREGISTERED, SEZ)
   - Add: openingBalance (Decimal)
   - Add: defaultPaymentTerms (relation)
   - Add: defaultCurrency (String)
   - Add: defaultOfferTerms (relation, many-to-many)
   - Add: companyReferenceCode (String)
   - Add: tags (relation, many-to-many)
5. NEW: CustomerDispatchAddress (one-to-many from Customer)
   - label, addressLine1, addressLine2, city, pincode, state, country
   - consigneeName, placeOfSupply
6. MODIFIED: Quotation
   - Add: quotationType enum (STANDARD, NON_STANDARD)
   - Add: marketType enum (DOMESTIC, EXPORT)
   - Add: currencyCode (String, default based on market type)
   - Add: buyerId (relation to BuyerMaster)
7. MODIFIED: QuotationItem
   - Split: sizeNPS (Decimal) + schedule (String) instead of single size field
   - Add: materialCode (String, relation to MaterialCodeMaster)
   - Add: itemDescription (Text — for non-standard rich text)
8. MODIFIED: QuotationOfferTerm
   - Add: isIncluded (Boolean — checkbox state)
   - Add: isCustom (Boolean — user-added term)
   - Add: isHeadingEditable (Boolean — false for defaults, true for custom)
9. NEW: MaterialCodeMaster
10. NEW: UnitMaster (UOM)
11. MODIFIED: PipeSizeMaster
    - Add: nps (Decimal) — extracted NPS value
    - Add: schedule (String) — extracted schedule text
12. NEW: Tag (for customer/vendor tagging)
13. NEW: FinancialYear (year label, start date, end date, isActive)

Make sure all existing functionality from the original PRD still works. These are ADDITIONS and MODIFICATIONS, not replacements.


=============================================================
UI/UX CHANGES REQUIRED
=============================================================

1. Customer Master form: Redesign to match the attached screenshot layout (sections, grey headers, radio buttons, Fetch Details button, multi-section form)

2. Quotation creation flow: Add a landing page/modal that asks:
   - Step 1: "Select Quotation Type" → Standard | Non-Standard (card selection)
   - Step 2: Opens the quotation form with a Domestic/Export dropdown toggle at top

3. Standard Quotation line items: Split Size into NPS + Schedule columns

4. Non-Standard Quotation: Rich text item description with structured template helper

5. Offer Terms: Checkbox + fixed heading + editable value + add custom term

6. Add "Quotation History" sidebar/panel on quotation creation screen

7. Add Buyer dropdown (filtered by selected Customer) on Enquiry and Quotation forms

8. Navigation sidebar: Add new menu items for Company Master, Employee Master, Buyer Master under a "Masters" section


=============================================================
PRIORITY ORDER FOR IMPLEMENTATION
=============================================================

Build in this order:
1. Schema changes (all new/modified tables) + migration
2. Company Master screen
3. Unit Master screen
4. Employee Master screen
5. Customer Master REDESIGN (new form layout matching screenshot)
6. Buyer Master screen
7. Vendor Master (same form as Customer with Supplier pre-selected)
8. Pipe Size Master update (add NPS + Schedule columns, backfill from existing data)
9. Material Code Master
10. Quotation Type selection (Standard vs Non-Standard landing)
11. Standard Quotation form update (NPS + Schedule split, offer terms checkbox system)
12. Non-Standard Quotation form (rich text description, Commercial + Technical PDF)
13. Quotation History feature
14. Buyer Performance Report

Start with the schema changes and let me review before building screens.
```

---

## QUICK-REFERENCE: CHANGES AT A GLANCE

| # | Change | Area | Impact |
|---|--------|------|--------|
| 1 | Company Master (new) | Settings | New screen + DB table |
| 2 | Employee Master (new) | Masters | New screen + DB table |
| 3 | Customer Master redesign | Masters | UI overhaul + new fields + dispatch addresses |
| 4 | Buyer Master (new) | Masters | New screen + DB table, linked to Customer |
| 5 | Vendor Master = same form as Customer | Masters | Shared form, Supplier pre-selected |
| 6 | Quotation Type: Standard vs Non-Standard | Quotation | New selection flow |
| 7 | Market toggle: Domestic vs Export | Quotation | Currency/terms logic change |
| 8 | Standard Quotation: Size → NPS + Schedule split | Quotation | Column change, master lookup change |
| 9 | Non-Standard Quotation: rich-text description | Quotation | New item format, dual PDF output |
| 10 | Offer Terms: checkbox + editable + add custom | Quotation | UI redesign of terms section |
| 11 | Material Code system | Quotation/Masters | New master, auto-assignment, history tracking |
| 12 | Unit Master (new) | Masters | New screen + DB table |
| 13 | Customer default T&C | Customer → Quotation | Auto-populate terms per customer |
| 14 | Dispatch Address (multi) on Customer | Customer → Invoice | Consignee/Place of Supply for GST |
| 15 | Quotation History & Backtracking | Quotation | New sidebar/panel feature |
| 16 | Buyer Performance Report | Reports | New report screen |
| 17 | Notes hard-coded on quotations | Quotation PDF | 9 fixed notes at bottom |
| 18 | Footer on quotation PDF | Quotation PDF | Company address, format no., disclaimer |
| 19 | Financial Year Management | Settings | FY config, document number reset |
| 20 | "Both" type entity (Customer + Supplier) | Customer/Vendor | Single entity in both dropdowns |

---

## NOTES FOR DEVELOPER

- The customer form UI in the screenshot uses a card/drawer layout with grouped sections. Use shadcn/ui Sheet or Dialog component for the form.
- The "Fetch Details" button for GST is a future integration point — for now, just make it a clickable button that shows a toast "GST lookup coming soon" but leave the API hook ready.
- The "Both" radio button on company type means the SAME entity appears in Customer dropdowns AND Vendor dropdowns. Handle this with a single table + type enum filter.
- Non-Standard quotation must generate TWO PDFs from one record: Commercial (with prices) and Technical (prices replaced with "QUOTED"). Use the same PDF template with a parameter flag.
- The 9 Notes at the bottom of quotations are HARD-CODED (not editable per quotation). They appear on every quotation PDF below the offer terms.
- Material Code auto-generation for Standard items: Suggest format like `{ProductPrefix}-{MaterialShort}-{NPS}-{Schedule}-{Seq}` e.g., `CS-A106B-24-40-001`. Make this configurable.
