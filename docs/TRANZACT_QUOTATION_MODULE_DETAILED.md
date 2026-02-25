# TranZact — Sales Quotation Module (Detailed UI Analysis)

> Extracted from actual app screenshots at `app.letstranzact.com`
> Date: 2026-02-25

---

## 1. Module Location & Navigation

- **Parent Module**: Lead Management
- **Breadcrumb**: Lead Management (top bar)
- **Tabs**: `Sales Enquiry` | `Sales Quotation` (active, underlined in teal)
- **Company Context**: Top-right shows `N-PIPE SOLUTIONS INC.` (logged-in company)
- **Left Sidebar**: Collapsed, with "ALL MODULES" vertical text, expandable
- **URL**: `https://app.letstranzact.com/v3/leads/?section=sales_quotation`

---

## 2. Sales Quotation — Listing Page

### 2.1 Page Header
- **Title**: "Sales Quotation" with info icon (ⓘ)
- **Primary Action Button**: `+ Create Sales Quotation` (teal button, top-right)

### 2.2 Top-Level Filters (Dropdowns)

| Filter | Type | Default Value | Position |
|--------|------|---------------|----------|
| **Creation Status** | Dropdown | `Sent` | Left |
| **Conversion Status** | Dropdown | `Pending` | Center |
| **Tags** | Dropdown | `Select` | Right |

**Likely dropdown values** (based on TranZact docs):
- **Creation Status**: Draft, Sent, All
- **Conversion Status**: Pending, Converted (to OC), Cancelled, All
- **Tags**: User-defined tags

### 2.3 Data Table — Columns (Left to Right)

| # | Column Name | Sortable | Searchable | Search Type | Notes |
|---|------------|----------|------------|-------------|-------|
| 1 | **Quotation Number** | ↑↓ Yes | 🔍 Text search | Free text | Clickable link (teal), e.g. `NPS/24/13609`, with external link icon (↗) |
| 2 | **Company** | ↑↓ Yes | 🔍 Text search | Free text | Buyer/client name, e.g. `LINDE INDIA LIMITED`, with company icon |
| 3 | **Enquiry Number** | ↑↓ Yes | 🔍 Text search | Free text | Reference to linked enquiry (can be `-` if none) |
| 4 | **Total Amount** | ↑↓ Yes | 🔍 Search with `>` operator | Numeric with comparator dropdown (`>`, `<`, `=`, etc.) | Currency formatted, e.g. `₹1,08,726.71` |
| 5 | **OC Created** | ↑↓ Yes | 🔍 Text search | Free text | Order Confirmation reference (can be `-` if none) |
| 6 | **Deal Status** | ↑↓ Yes | 🔍 Text search | Free text | Status badge, e.g. `Pending` (yellow/orange badge) |
| 7 | **Deal Owner** | ↑↓ Yes | 🔍 Text search | Free text | User avatar/icon shown |
| 8 | **Next action date** | ↑↓ Yes | — | — | Date field (can be `-` if not set) |
| 9 | **Tags** | ↑↓ Yes | — | — | User-defined tags |
| 10 | **Created By** | ↑↓ Yes | 🔍 Text search | Free text | User avatar + name, e.g. `UJ UTTAM JAIN` |
| 11 | **Creation Date** | ↑↓ Yes | — | — | Date formatted as `DD/MM/YYYY`, e.g. `19/01/2026` |

> **Note**: Columns 10 (Created By) and 11 (Creation Date) are visible when scrolling right — the table is horizontally scrollable.

### 2.4 Table Features
- **Sorting**: Every column has ↑↓ sort toggle (ascending/descending)
- **Per-column search**: Most columns have individual search boxes below header
- **Total Amount filter**: Has a **comparator dropdown** (`>`, `<`, `=`, `>=`, `<=`) + search value — unique among columns
- **Horizontal scroll**: Table extends beyond viewport; scroll bar visible at bottom
- **Column search icon**: Magnifying glass (🔍) icon at far right of header row for global column search

### 2.5 Pagination
- **Rows per page**: Dropdown with default `10` (likely options: 10, 25, 50, 100)
- **Navigation**: `«` (first) | `‹` (prev) | `1` (current page) | `›` (next) | `»` (last)
- **Count display**: `1 to 1 of 1` (total records shown)

### 2.6 Sample Data Row
| Field | Value |
|-------|-------|
| Quotation Number | `NPS/24/13609` (clickable link + external icon) |
| Company | `LINDE INDIA LIMITED` |
| Enquiry Number | `-` |
| Total Amount | `₹1,08,726.71` |
| OC Created | `-` |
| Deal Status | `Pending` (badge) |
| Deal Owner | User icon (avatar) |
| Next action date | `-` |
| Tags | — |
| Created By | `UJ` `UTTAM JAIN` |
| Creation Date | `19/01/2026` |

---

## 3. Create Quotation — Buyer Selection Modal

When clicking `+ Create Sales Quotation`, a **modal dialog** appears:

### 3.1 Modal Details
- **Title**: "Please Add/Select Buyer"
- **Close button**: `X` (top-right of modal)
- **Background**: Dimmed/blurred listing page

### 3.2 Modal Fields

| Element | Type | Details |
|---------|------|---------|
| **Select Buyer** | Dropdown (searchable) | Select from existing buyers in the system |
| **"Or"** | Separator text | Divides the two options |
| **Proceed with a Dummy Buyer** | Button (outlined, teal) | Creates quotation without selecting a real buyer |
| **Add New Company** | Button (outlined, teal, top-right) | Opens form to add a new buyer/company |

### 3.3 Flow
1. User clicks `+ Create Sales Quotation`
2. Modal appears with buyer selection
3. User either:
   - **Selects existing buyer** from dropdown → Redirected to create form
   - **Clicks "Proceed with a Dummy Buyer"** → Redirected with dummy buyer
   - **Clicks "Add New Company"** → Opens company creation form first
4. URL pattern after selection: `/v2/quotations/sq/create/-1?supplier={supplierId}&buyer={buyerId}`

---

## 4. Create Sales Quotation — Full Form

**URL**: `https://app.letstranzact.com/v2/quotations/sq/create/-1?supplier=665950&buyer=665953`
**Page Title**: "Sales Quotation" (with document icon)
**Currency Indicator**: Top-right shows `INR - ₹`

### 4.1 Form Layout — 4 Major Sections (Top Cards)

The top of the form has **4 card sections** arranged in a 2x2 grid:

---

#### CARD 1: Buyer Details (Top-Left)
| Field | Value (Example) | Editable |
|-------|----------------|----------|
| **Buyer Name** | `Merc Demo Buyer` | Via edit (✏️) icon |
| **Address** | `32 - Corporate Avenue, 7th floor, Near Paperbox, Andheri East` | Via edit icon |
| **City, State** | `Mumbai (Maharashtra)` | Via edit icon |
| **Country, PIN** | `India - 400093` | Via edit icon |
| **GSTIN** | `27AACCF7457K1Z7` | Via edit icon |
| **Place of Supply** | Link button (teal) `📋 Place of Supply` | Clickable |

- **Edit button**: ✏️ pencil icon (top-right of card)

---

#### CARD 2: Delivery Location (Top-Center)
| Field | Value (Example) | Editable |
|-------|----------------|----------|
| **Location Name** | `Location 1 (Mumbai)` | Via edit (✏️) icon |
| **Address** | `32 - Corporate Avenue, 7th floor, Near Paperbox, Andheri East` | Via edit icon |
| **City, State** | `Mumbai (Maharashtra)` | Via edit icon |
| **Country, PIN** | `India - 400093` | Via edit icon |
| **GSTIN** | `27AACCF7457K1Z7` | Via edit icon |
| **Place of Supply** | Link button (teal) `📋 Place of Supply` | Clickable |

- **Edit button**: ✏️ pencil icon (top-right of card)

---

#### CARD 3: Supplier Details (Bottom-Left)
| Field | Value (Example) | Editable |
|-------|----------------|----------|
| **Supplier Name** | `N-PIPE SOLUTIONS INC.` | Via edit (✏️) icon |
| **Address** | `1210/1211, Prasad Chambers, Tata Road No.2., Opera House, Charni Road (E)` | Via edit icon |
| **City, State** | `Mumbai (Maharashtra)` | Via edit icon |
| **Country, PIN** | `India - 400004` | Via edit icon |
| **GSTIN** | `27AAHFN1530H1ZH` | Via edit icon |
| **Place of Supply** | Link button (teal) `📋 Place of Supply` | Clickable |

- **Edit button**: ✏️ pencil icon (top-right of card)

---

#### CARD 4: Place of Supply (Bottom-Center)
| Field | Type | Required | Default Value |
|-------|------|----------|---------------|
| **City** | Text input | Yes* | `Mumbai` |
| **State** | Dropdown | Yes* (★) | `Maharashtra` |
| **Country** | Dropdown | Yes* (★) | `India` |

---

### 4.2 Primary Document Details (Right Panel)

| Field | Type | Required | Default/Example | Notes |
|-------|------|----------|-----------------|-------|
| **Document Number** | Dropdown + text | Yes* (★) | `NPS/24/13611` | Auto-generated with series prefix; has `Customize` button |
| **Document Date** | Date picker (📅) | — | `25/02/2026` | Calendar icon |
| **Amendment** | Number input | — | `0` | Amendment/revision number |
| **Delivery Date** | Date picker (📅) | — | Empty | Calendar icon |
| **Enquiry Number** | Text input | — | Empty | Link to existing enquiry |
| **Enquiry Date** | Date picker (📅) | — | Empty | Calendar icon |
| **Payment Term** | Dropdown | — | Empty | Payment terms selection |
| **Store** | Dropdown | Yes* (★) | `Default Stock Store` | Stock store selection |
| **Kind Attention** | Text input | — | Empty | `0 / 200` character counter |

> Fields marked with red asterisk (*) or (★) are required.

### 4.3 Document Number Format
- **Pattern**: `{PREFIX}/{YY}/{SERIAL}` → e.g. `NPS/24/13611`
- **Prefix**: Company-specific (NPS = N-PIPE SOLUTIONS)
- **YY**: 2-digit year
- **Serial**: Auto-incrementing number
- **Customizable**: "Customize" button allows changing the series

---

### 4.4 Line Items Section

#### Controls Above Table
| Element | Type | Details |
|---------|------|---------|
| **Download Item Template** | Button (outlined, teal) | Download Excel template for bulk item upload |
| **Bulk Upload** | Button (outlined, teal) | Upload items via Excel file |
| **Optional Columns** | Dropdown (right side) | Add/remove optional columns to item table |
| **Price type** | Dropdown | Default: `Default Price` (likely options: Default, Special, Contract, etc.) |
| **Search with Id or...** | Text input | Quick search for items by ID or name |

#### Item Table Columns

| # | Column | Type | Notes |
|---|--------|------|-------|
| 1 | **#** (Row number) | Auto | Sequential row number (1, 2, 3...) |
| 2 | **Item ID** | Dropdown (searchable) | Select from item master; has `▼` dropdown |
| 3 | **Item Description** | Dropdown (searchable) | Auto-populated or manually entered; has `▼` dropdown |
| 4 | **HSN/SAC Code** | Text/Auto | HSN (Harmonized System of Nomenclature) or SAC code; likely auto-fetched from item master |
| 5 | **Quantity** | Number input | With refresh/sync icon (🔄); shows `0` by default |
| 6 | **Units** | Dropdown | Unit of measure (UOM); has `▼` dropdown |
| 7 | **Price** | Number input | `0 ₹` with currency symbol |
| 8 | **Tax** | Dropdown | Tax rate selection (GST %); has `▼` dropdown |
| 9 | **Total Before Tax** | Calculated (auto) | `0 ₹` — auto-calculated: Quantity × Price |

#### Item Table Features
- **+ ADD ITEM** button (teal, below table) — adds new row
- **Pagination**: `1-1 of 1` with `< >` navigation (for large item lists)
- **Optional Columns dropdown**: Can add more columns beyond the default 9

---

### 4.5 Bottom Tabs (Below Line Items)

Five tabs for additional information:

| Tab # | Tab Name | Purpose |
|-------|----------|---------|
| 1 | **Extra Charges** | Add additional charges (freight, packaging, etc.) |
| 2 | **Attachments** | Upload files/documents |
| 3 | **Additional Details** | Bank details, logistical details, terms & conditions |
| 4 | **Comment** | Internal/external comments |
| 5 | **Attach Signature** | Attach authorized signatory image |

---

### 4.6 Email & Signature Section (Below Tabs)

#### Email Recipients (Left)
| Element | Details |
|---------|---------|
| **Section Title** | "Email Recipients" |
| **Email Preview** | Button (teal badge) — preview email before sending |
| **Edit recipients** | ✏️ icon to edit |
| **Recipient input** | Dropdown/text field to add email addresses |

#### Manage Signature (Right)
| Element | Details |
|---------|---------|
| **Section Title** | "Manage Signature" |
| **Upload icon** | ⬆️ cloud upload icon |
| **Signature preview** | Shows uploaded signature image |
| **Example** | Company logo + "Partner/Auth Signatory" text |

---

### 4.7 Totals & Calculations (Right-Bottom)

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| **Additional Discount** | Expandable section (▼) | Collapsed | Click to expand and add discount |
| **Total (before tax)** | Calculated | `₹0.00` | Sum of all line items before tax |
| **RCM** (Reverse Charge) | Toggle/Badge | `RCM` button | Reverse Charge Mechanism toggle |
| **Total Tax** | Calculated | `₹0.00` | Sum of all tax amounts |
| **Total (after tax)** | Calculated | `₹0.00` | Before tax + Tax |
| **Non-Taxable Extra Charges** | Expandable section (▼) | Collapsed | Charges not subject to tax |
| **Round-off** | Toggle button | `Round-off` | Round to nearest rupee |
| **Grand Total** | Calculated (bold, large) | `₹0.00` | Final total amount |
| **Advance To Pay** | Number input | `₹` (empty) | Advance payment amount |

---

### 4.8 Action Buttons (Bottom-Right)

| Button | Style | Action |
|--------|-------|--------|
| **SAVE DRAFT** | Solid teal/green | Save quotation as draft (Creation Status = Draft) |
| **SAVE AND SEND** | Solid dark/navy | Save and send to buyer via email |

- **Encrypted Action** indicator (🔒) shown below buttons

---

## 5. Complete Field Inventory — Create Sales Quotation Form

### All Fields (Consolidated)

| # | Field Name | Section | Type | Required | Default |
|---|-----------|---------|------|----------|---------|
| 1 | Buyer Name | Buyer Details | Display (editable via modal) | Yes | Selected buyer |
| 2 | Buyer Address | Buyer Details | Display (editable) | — | From master |
| 3 | Buyer GSTIN | Buyer Details | Display (editable) | — | From master |
| 4 | Buyer Place of Supply | Buyer Details | Link/modal | — | — |
| 5 | Delivery Location Name | Delivery Location | Display (editable) | — | From buyer master |
| 6 | Delivery Address | Delivery Location | Display (editable) | — | From buyer master |
| 7 | Delivery GSTIN | Delivery Location | Display | — | From buyer master |
| 8 | Delivery Place of Supply | Delivery Location | Link/modal | — | — |
| 9 | Supplier Name | Supplier Details | Display (editable) | Yes | Logged-in company |
| 10 | Supplier Address | Supplier Details | Display (editable) | — | From company |
| 11 | Supplier GSTIN | Supplier Details | Display | — | From company |
| 12 | Supplier Place of Supply | Supplier Details | Link/modal | — | — |
| 13 | Place of Supply — City | Place of Supply | Text input | Yes* | Auto from buyer |
| 14 | Place of Supply — State | Place of Supply | Dropdown | Yes* | Auto from buyer |
| 15 | Place of Supply — Country | Place of Supply | Dropdown | Yes* | Auto from buyer |
| 16 | Document Number | Primary Doc Details | Dropdown + Customize | Yes* | Auto-generated (NPS/YY/NNNNN) |
| 17 | Document Date | Primary Doc Details | Date picker | Yes | Today's date |
| 18 | Amendment | Primary Doc Details | Number | — | `0` |
| 19 | Delivery Date | Primary Doc Details | Date picker | — | Empty |
| 20 | Enquiry Number | Primary Doc Details | Text | — | Empty |
| 21 | Enquiry Date | Primary Doc Details | Date picker | — | Empty |
| 22 | Payment Term | Primary Doc Details | Dropdown | — | Empty |
| 23 | Store | Primary Doc Details | Dropdown | Yes* | `Default Stock Store` |
| 24 | Kind Attention | Primary Doc Details | Text (max 200 chars) | — | Empty |
| 25 | Currency | Top-right header | Display/Selector | — | `INR - ₹` |
| — | **LINE ITEMS (per row):** | | | | |
| 26 | Item ID | Line Items | Searchable dropdown | Yes | Empty |
| 27 | Item Description | Line Items | Searchable dropdown | Yes | Auto from item master |
| 28 | HSN/SAC Code | Line Items | Text/Auto | — | Auto from item master |
| 29 | Quantity | Line Items | Number | Yes | `0` |
| 30 | Units | Line Items | Dropdown (UOM) | Yes | From item master |
| 31 | Price | Line Items | Number (₹) | Yes | `0` |
| 32 | Tax | Line Items | Dropdown (%) | Yes | From item master |
| 33 | Total Before Tax | Line Items | Calculated | Auto | Qty × Price |
| — | **ADDITIONAL SECTIONS:** | | | | |
| 34 | Extra Charges | Tab 1 | Sub-form | — | — |
| 35 | Attachments | Tab 2 | File upload | — | — |
| 36 | Additional Details | Tab 3 | Text/form fields | — | Bank details, logistics, T&C |
| 37 | Comment | Tab 4 | Text area | — | — |
| 38 | Signature | Tab 5 | Image upload | — | Company signature |
| 39 | Email Recipients | Email section | Multi-select/text | — | From buyer contact |
| — | **TOTALS:** | | | | |
| 40 | Additional Discount | Totals | Expandable input | — | — |
| 41 | Total (before tax) | Totals | Calculated | Auto | Sum of line totals |
| 42 | RCM (Reverse Charge) | Totals | Toggle | — | Off |
| 43 | Total Tax | Totals | Calculated | Auto | Sum of tax |
| 44 | Total (after tax) | Totals | Calculated | Auto | Before tax + Tax |
| 45 | Non-Taxable Extra Charges | Totals | Expandable input | — | — |
| 46 | Round-off | Totals | Toggle | — | — |
| 47 | Grand Total | Totals | Calculated (bold) | Auto | Final amount |
| 48 | Advance To Pay | Totals | Number (₹) | — | Empty |

**Total: 48 distinct fields/elements in the create form**

---

## 6. Key UI/UX Patterns Observed

### 6.1 Design System
- **Primary color**: Teal/cyan (#00897B or similar)
- **Card-based layout**: Top section uses 4 cards in 2×2 grid
- **Material Design**: Material icons, Roboto font, dropdown styles
- **Framework**: Vue.js (Nuxt.js) with BootstrapVue and Vuetify elements

### 6.2 Interaction Patterns
- **Edit-in-place**: Buyer/Supplier/Delivery cards have ✏️ edit icons
- **Auto-population**: Fields like GSTIN, address auto-fill from master data
- **Inline search**: Item table has search-as-you-type for Item ID and Description
- **Bulk operations**: Download template + Bulk upload for line items
- **Tab-based additional info**: 5 tabs for extra data without cluttering main form
- **Sticky totals**: Calculation panel stays visible on right side
- **Dual save**: Draft vs. Send — two distinct save actions

### 6.3 Document Numbering
- Format: `{COMPANY_PREFIX}/{YY}/{AUTO_INCREMENT}`
- Example: `NPS/24/13611`
- Customizable via "Customize" button
- Dropdown suggests available series

### 6.4 GST Integration Points
- GSTIN displayed for both buyer and supplier
- Place of Supply determines CGST+SGST vs IGST
- HSN/SAC codes per line item
- RCM (Reverse Charge Mechanism) toggle
- Tax dropdown per line item

---

## 7. Comparison: TranZact vs Our ERP (NPS Piping Solutions)

| Feature | TranZact | Our ERP (erp-claude) |
|---------|----------|---------------------|
| Module name | Lead Management > Sales Quotation | Quotations |
| Listing filters | Creation Status, Conversion Status, Tags | Status, date range |
| Buyer selection | Modal with dropdown + dummy buyer option | Part of create form |
| Document numbering | PREFIX/YY/SERIAL with Customize | PREFIX/FY/NNNNN |
| Place of Supply | Separate card with City/State/Country | Part of customer master |
| Line items | Item ID, Description, HSN, Qty, Units, Price, Tax, Total | Similar fields |
| Tabs | Extra Charges, Attachments, Additional Details, Comment, Signature | Terms, notes |
| Totals | Discount, Before Tax, RCM, Tax, After Tax, Non-Taxable, Round-off, Grand Total, Advance | Subtotal, Tax, Total |
| Actions | Save Draft / Save and Send | Save Draft / Send for Approval |
| Email | Built-in email preview + recipients | Separate email action |
| Signature | Attach signature image | Not implemented |
| Bulk upload items | Yes (Excel template) | No |
| Optional columns | Yes (configurable) | Fixed columns |
| Price type | Default Price dropdown | Single price |
| Amendment tracking | Amendment number field | Revision system |
