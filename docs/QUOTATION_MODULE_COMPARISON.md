# Quotation Module Comparison: TranZact vs Our ERP

> Side-by-side analysis from actual TranZact app screenshots + our codebase
> Date: 2026-02-25

---

## 1. Module Structure & Navigation

| Aspect | TranZact | Our ERP |
|--------|----------|---------|
| **Module location** | Lead Management → Sales Quotation tab | Dashboard → Quotations |
| **Parent module** | Lead Management (with Sales Enquiry tab) | Standalone module |
| **URL pattern** | `/v3/leads/?section=sales_quotation` | `/quotations` |
| **Enquiry integration** | Same page, different tab (Sales Enquiry ↔ Sales Quotation) | ❌ Enquiry module removed (deleted files visible in git status) |
| **Quotation types** | Single type (Sales Quotation) | STANDARD / NON_STANDARD + DOMESTIC / EXPORT / BOM |
| **Sub-categories** | None visible | Standard vs Non-Standard (separate create forms) |

**Gap**: Our ERP has richer quotation type support (Standard/Non-Standard, Domestic/Export/BOM) but lacks the Lead Management / Enquiry integration that TranZact has.

---

## 2. Listing Page Comparison

### 2.1 Top-Level Filters

| Filter | TranZact | Our ERP |
|--------|----------|---------|
| **Creation Status** | ✅ Dropdown: Draft / Sent / All | ❌ No direct equivalent (uses Status dropdown) |
| **Conversion Status** | ✅ Dropdown: Pending / Converted / Cancelled | ❌ No direct equivalent |
| **Tags** | ✅ Dropdown: user-defined tags | ❌ Not implemented |
| **Status** | Via Creation Status filter | ✅ Dropdown: All Active / Draft / Pending Approval / Approved / Sent / Won / Lost / Expired / Superseded / Cancelled |
| **Search** | Per-column inline search | ✅ Global search (quotationNo or customer name) |
| **Revision filter** | Not visible | ✅ Tabs: All / Original / Revisions |

**Gap**: TranZact has **Conversion Status** tracking (Pending → OC Created) and **Tags** which we lack. Our ERP has more granular **status filtering** and **revision filtering**.

### 2.2 Table Columns

| # | TranZact Column | Our ERP Column | Match |
|---|----------------|----------------|-------|
| 1 | **Quotation Number** (clickable, external link icon) | **Quotation No.** (clickable) | ✅ Match |
| 2 | **Company** (buyer name with icon) | **Customer** | ✅ Match (different label) |
| 3 | **Enquiry Number** | ❌ Not shown | ❌ Missing |
| 4 | **Total Amount** (₹ formatted, with `>/<` comparator) | **Amount** | ✅ Match (but no comparator filter) |
| 5 | **OC Created** (Order Confirmation reference) | ❌ Not tracked | ❌ Missing |
| 6 | **Deal Status** (Pending badge) | **Status** (color-coded badge) | ⚠️ Partial (different status model) |
| 7 | **Deal Owner** (user avatar) | ❌ Not shown in listing | ❌ Missing |
| 8 | **Next action date** | ❌ Not implemented | ❌ Missing |
| 9 | **Tags** | ❌ Not implemented | ❌ Missing |
| 10 | **Created By** (avatar + name) | **Prepared By** | ✅ Match |
| 11 | **Creation Date** (DD/MM/YYYY) | **Date** | ✅ Match |
| — | ❌ Not shown | **Type** (Domestic/Export/BOM) | ➕ Extra in ours |
| — | ❌ Not shown | **Items Count** | ➕ Extra in ours |

**Gaps in Our ERP**:
- ❌ **Enquiry Number** — no enquiry linkage
- ❌ **OC Created** — no Order Confirmation tracking from quotation
- ❌ **Deal Owner** — no deal owner assignment
- ❌ **Next action date** — no follow-up date tracking
- ❌ **Tags** — no tagging system
- ❌ **Per-column search** — we only have global search
- ❌ **Numeric comparator filter** on Total Amount (`>`, `<`, `=`)

### 2.3 Table Features

| Feature | TranZact | Our ERP |
|---------|----------|---------|
| **Per-column sort** | ✅ ↑↓ on every column | ✅ (via DataTable component) |
| **Per-column search** | ✅ Individual search box per column | ❌ Only global search |
| **Numeric comparator** | ✅ On Total Amount (`>`, `<`, `=`, `>=`) | ❌ Not implemented |
| **Horizontal scroll** | ✅ With scroll bar | ✅ (responsive table) |
| **Pagination** | ✅ Rows per page (10), First/Prev/Next/Last, "1 to 1 of 1" | ✅ Similar pagination |
| **Row actions** | Click to open detail | ✅ Eye icon (view) + Download icon (PDF) |
| **External link** | ✅ ↗ icon on Quotation Number | ❌ Not implemented |

---

## 3. Create Quotation Flow

### 3.1 Entry Point / Buyer Selection

| Aspect | TranZact | Our ERP |
|--------|----------|---------|
| **Create button** | `+ Create Sales Quotation` (teal) | `Create Quotation` button |
| **First step** | **Modal popup**: "Please Add/Select Buyer" | Route to **type selection page** (Standard vs Non-Standard) |
| **Buyer selection** | Modal with: Select Buyer dropdown + "Proceed with a Dummy Buyer" + "Add New Company" | Customer dropdown is **inside** the create form |
| **Dummy buyer** | ✅ "Proceed with a Dummy Buyer" option | ❌ Not supported |
| **Add new company inline** | ✅ "Add New Company" button in modal | ❌ Must go to Masters → Customers first |
| **URL after selection** | `/v2/quotations/sq/create/-1?supplier={id}&buyer={id}` | `/quotations/create/standard` or `/quotations/create/nonstandard` |

**Gap**: TranZact's buyer-first modal flow with dummy buyer option and inline company creation is smoother. Our flow requires choosing type first, then selecting customer inside the form.

### 3.2 Form Layout

| Aspect | TranZact | Our ERP |
|--------|----------|---------|
| **Layout** | 4 cards (2×2 grid) + right panel + line items + tabs + totals | Sections: Header → Items (repeating cards) → Terms → Submit |
| **Buyer Details card** | ✅ Name, Address, GSTIN, Place of Supply (read-only with edit icon) | Customer dropdown (just name, address auto-loaded) |
| **Delivery Location card** | ✅ Separate card with Location Name, Address, GSTIN | ❌ Not separate — uses customer address |
| **Supplier Details card** | ✅ Logged-in company info displayed | ❌ Not shown (implicit) |
| **Place of Supply card** | ✅ City, State*, Country* dropdowns | ❌ Not implemented (determined by customer state for GST) |
| **Currency selector** | ✅ Top-right: `INR - ₹` | ✅ Currency field (auto-set by quotation type) |

### 3.3 Primary Document Details — Field-by-Field Comparison

| # | TranZact Field | Our ERP Field | Match | Notes |
|---|---------------|---------------|-------|-------|
| 1 | **Document Number** (dropdown + Customize) | **quotationNo** (auto-generated) | ⚠️ Partial | TranZact has customizable series selector; ours is fully auto |
| 2 | **Document Date** (date picker) | **quotationDate** (default: now) | ✅ Match |
| 3 | **Amendment** (number, default 0) | **version** (0=original, 1+=revision) | ✅ Match (different label) |
| 4 | **Delivery Date** (date picker) | **deliveryPeriod** (text, e.g. "6-8 Weeks") | ⚠️ Different type | TranZact: specific date; Ours: text period |
| 5 | **Enquiry Number** (text) | ❌ Not implemented | ❌ Missing |
| 6 | **Enquiry Date** (date picker) | ❌ Not implemented | ❌ Missing |
| 7 | **Payment Term** (dropdown) | **paymentTermsId** (dropdown from master) | ✅ Match |
| 8 | **Store** (dropdown, default "Default Stock Store") | ❌ Not implemented | ❌ Missing | No inventory store linkage |
| 9 | **Kind Attention** (text, max 200 chars) | ❌ Not implemented | ❌ Missing |
| 10 | ❌ Not visible | **validUpto** (date picker) | ➕ Extra in ours |
| 11 | ❌ Not visible | **deliveryTermsId** (dropdown from master) | ➕ Extra in ours |
| 12 | ❌ Not visible | **buyerId** (dropdown filtered by customer) | ➕ Extra in ours (separate buyer concept) |
| 13 | ❌ Not visible | **quotationType** (DOMESTIC/EXPORT/BOM) | ➕ Extra in ours |
| 14 | ❌ Not visible | **quotationCategory** (STANDARD/NON_STANDARD) | ➕ Extra in ours |

### 3.4 Line Items Comparison

| # | TranZact Column | Our ERP Field (Standard) | Match |
|---|----------------|-------------------------|-------|
| 1 | **Item ID** (searchable dropdown) | ❌ No item master integration | ❌ Missing |
| 2 | **Item Description** (searchable dropdown) | **product** + **material** + **additionalSpec** (3 separate fields) | ⚠️ Different approach |
| 3 | **HSN/SAC Code** (auto from master) | **hsnCode** (on item) | ✅ Match |
| 4 | **Quantity** (number) | **quantity** (number) | ✅ Match |
| 5 | **Units** (dropdown UOM) | **uom** (text/select) | ✅ Match |
| 6 | **Price** (number ₹) | **unitRate** (number) | ✅ Match |
| 7 | **Tax** (dropdown %) | **taxRate** (% on item or header level) | ⚠️ Partial — TranZact: per-item tax; Ours: header-level tax |
| 8 | **Total Before Tax** (auto-calc) | **amount** (auto-calc: qty × rate) | ✅ Match |
| — | ❌ Not visible | **NPS** (pipe size dropdown) | ➕ Extra (piping-specific) |
| — | ❌ Not visible | **Schedule** (dropdown) | ➕ Extra (piping-specific) |
| — | ❌ Not visible | **OD** (outer diameter, auto-fill) | ➕ Extra (piping-specific) |
| — | ❌ Not visible | **WT** (wall thickness, auto-fill) | ➕ Extra (piping-specific) |
| — | ❌ Not visible | **Length** (text) | ➕ Extra (piping-specific) |
| — | ❌ Not visible | **Ends** (text, e.g. BE, FBE) | ➕ Extra (piping-specific) |
| — | ❌ Not visible | **Delivery** (per-item, text) | ➕ Extra |
| — | ❌ Not visible | **Remark** (per-item text) | ➕ Extra |
| — | ❌ Not visible | **materialCost** (internal costing) | ➕ Extra (cost breakdown) |
| — | ❌ Not visible | **logisticsCost** (internal) | ➕ Extra |
| — | ❌ Not visible | **inspectionCost** (internal) | ➕ Extra |
| — | ❌ Not visible | **otherCosts** (internal) | ➕ Extra |
| — | ❌ Not visible | **marginPercentage** (auto-calc rate) | ➕ Extra |
| — | ❌ Not visible | **unitWeight** / **totalWeightMT** | ➕ Extra |

**Key Differences**:
- TranZact uses **Item Master integration** (select from inventory) → we use **free-form entry** with piping-specific fields
- TranZact has **per-item tax** dropdown → we have **header-level tax rate**
- Our ERP has **internal cost breakdown** (material/logistics/inspection/margin) which TranZact doesn't show
- Our ERP has **piping-specific fields** (NPS, OD, WT, Schedule, Ends) which are industry-specific

### 3.5 Line Item Features

| Feature | TranZact | Our ERP |
|---------|----------|---------|
| **Add item** | `+ ADD ITEM` button | `Add Item` button |
| **Bulk upload** | ✅ `Download Item Template` + `Bulk Upload` (Excel) | ❌ Not implemented |
| **Optional columns** | ✅ `Optional Columns` dropdown to show/hide | ❌ Fixed columns |
| **Price type** | ✅ Dropdown: Default Price, etc. | ❌ Single price type |
| **Item search** | ✅ "Search with Id or..." text input | ❌ Not implemented |
| **Item pagination** | ✅ `1-1 of 1` with arrows | ❌ All items shown |
| **Remove item** | Likely per-row action | ✅ Remove button per item |

### 3.6 Bottom Sections / Tabs

| TranZact Tab | Our ERP Equivalent | Match |
|-------------|-------------------|-------|
| **Extra Charges** | ❌ Not implemented | ❌ Missing |
| **Attachments** | ❌ Not implemented | ❌ Missing |
| **Additional Details** (bank, logistics, T&C) | **Terms section** (QuotationTerm model) | ⚠️ Partial — ours is terms-only |
| **Comment** | ❌ Not on create form (only on detail via audit log) | ❌ Missing |
| **Attach Signature** | ❌ Not implemented | ❌ Missing |

### 3.7 Email & Signature

| Feature | TranZact | Our ERP |
|---------|----------|---------|
| **Email Recipients** | ✅ On create form with Email Preview | ✅ Separate email action from detail page |
| **Manage Signature** | ✅ Upload signature image on form | ❌ Not implemented |
| **Email Preview** | ✅ Button to preview email | ❌ Not implemented |

### 3.8 Totals / Calculations

| Field | TranZact | Our ERP | Match |
|-------|----------|---------|-------|
| **Additional Discount** | ✅ Expandable section | ❌ Not implemented | ❌ Missing |
| **Total (before tax)** | ✅ Auto-calculated | ✅ **subtotal** | ✅ Match |
| **RCM (Reverse Charge)** | ✅ Toggle button | ❌ Not implemented | ❌ Missing |
| **Total Tax** | ✅ Auto-calculated | ✅ **taxAmount** | ✅ Match |
| **Total (after tax)** | ✅ Auto-calculated | Implicit (subtotal + tax) | ✅ Match |
| **Non-Taxable Extra Charges** | ✅ Expandable section | ❌ Not implemented | ❌ Missing |
| **Round-off** | ✅ Toggle button | ❌ Not implemented | ❌ Missing |
| **Grand Total** | ✅ Bold, large | ✅ **grandTotal** | ✅ Match |
| **Advance To Pay** | ✅ Input field (₹) | ❌ Not implemented | ❌ Missing |
| **Amount in Words** | Not visible on form | ✅ **amountInWords** (on detail/PDF) | ➕ Extra |

### 3.9 Action Buttons

| TranZact | Our ERP | Match |
|----------|---------|-------|
| **SAVE DRAFT** | ✅ Submit creates as DRAFT | ✅ Match |
| **SAVE AND SEND** | ❌ Not on create form | ❌ Missing (email is separate step from detail page) |
| ❌ Not visible | **Submit for Approval** (DRAFT → PENDING_APPROVAL) | ➕ Extra (approval workflow) |

---

## 4. Status / Workflow Comparison

### 4.1 Status Models

| TranZact Status | Our ERP Status | Notes |
|----------------|----------------|-------|
| Draft | **DRAFT** | ✅ Same |
| Sent | **SENT** | ✅ Same |
| Pending (Deal Status) | **PENDING_APPROVAL** | ⚠️ Different concept — TranZact: conversion pending; Ours: internal approval pending |
| — | **APPROVED** | ➕ Extra (approval step) |
| — | **REJECTED** | ➕ Extra (rejection by management) |
| Won (OC Created) | **WON** | ✅ Same |
| Lost | **LOST** | ✅ Same |
| — | **EXPIRED** | ➕ Extra (auto-expiry based on validUpto) |
| — | **SUPERSEDED** | ➕ Extra (when newer revision sent) |
| — | **REVISED** | ➕ Extra (legacy terminal state) |
| — | **CANCELLED** | ➕ Extra |
| Cancelled | **CANCELLED** | ✅ Same |

### 4.2 Workflow Comparison

```
TRANZACT FLOW:
  Draft → Sent → Pending (conversion) → Won (OC Created) / Lost / Cancelled

OUR ERP FLOW:
  DRAFT → PENDING_APPROVAL → APPROVED/REJECTED → SENT → WON/LOST/EXPIRED
                                                      ↓
                                              Can REVISE (creates new version)
                                                      ↓
                                              Previous becomes SUPERSEDED
```

**Key Difference**: Our ERP has a formal **approval workflow** (PENDING_APPROVAL → APPROVED/REJECTED) before sending. TranZact goes directly Draft → Sent.

---

## 5. Features Our ERP Has That TranZact Doesn't Show

| Feature | Our Implementation | TranZact |
|---------|-------------------|----------|
| **Formal Approval Workflow** | DRAFT → PENDING_APPROVAL → APPROVED → SENT | Draft → Sent (no approval gate) |
| **Revision System** | Full revision chain with parent-child, up to 99 revisions, changeSnapshot diff | Amendment number (simple counter) |
| **Revision Comparison** | Side-by-side diff of items, terms, headers between revisions | Not visible |
| **Revision Triggers** | 18 trigger types (PRICE_NEGOTIATION, SPEC_CHANGE, etc.) | Not visible |
| **Loss Tracking** | Reason, Competitor, Notes when marking as Lost | Not visible |
| **Internal Cost Breakdown** | materialCost, logisticsCost, inspectionCost, otherCosts, marginPercentage | Not visible |
| **Piping-Specific Fields** | NPS, OD, WT, Schedule, Length, Ends, PipeSizeMaster integration | Generic Item ID/Description |
| **Quoted vs Unquoted PDF** | Two PDF variants (shows/hides prices) | Not visible |
| **Expiry Notifications** | Auto-notify at 7d, 3d, 1d before validUpto | Not visible |
| **Validity Period** | validUpto date field | Not visible on create form |
| **Delivery Terms** | Separate deliveryTermsId from master | Not visible |
| **Standard vs Non-Standard** | Two distinct form layouts | Single form |
| **Weight Calculations** | unitWeight, totalWeightMT auto-calc | Not visible |
| **Amount in Words** | Auto-generated on PDF | Not visible |

---

## 6. Features TranZact Has That Our ERP Lacks

| # | TranZact Feature | Priority | Effort | Notes |
|---|-----------------|----------|--------|-------|
| 1 | **Enquiry Number / Date linkage** | Medium | Medium | Link quotation to originating enquiry |
| 2 | **Deal Owner** assignment | Medium | Low | Assign salesperson/owner to deal |
| 3 | **Next Action Date** | Medium | Low | Follow-up reminder date |
| 4 | **Tags** (user-defined) | Low | Medium | Tagging/labeling system |
| 5 | **OC Created** tracking | High | Medium | Track which quotations converted to orders |
| 6 | **Conversion Status** filter (Pending/Converted) | High | Low | Quick filter for pipeline management |
| 7 | **Per-column search** in listing | Low | Medium | Individual search per column |
| 8 | **Numeric comparator filter** (>, <, =) on Amount | Low | Medium | Advanced filtering |
| 9 | **Buyer selection modal** (before form) | Low | Low | UX improvement for buyer-first flow |
| 10 | **"Proceed with Dummy Buyer"** | Low | Low | Quick draft without real buyer |
| 11 | **Delivery Location** as separate card | Medium | Medium | Multiple delivery addresses per customer |
| 12 | **Place of Supply** (City/State/Country) | Medium | Low | Determines CGST+SGST vs IGST |
| 13 | **Store** selection (inventory link) | Low | Medium | Link to stock store |
| 14 | **Kind Attention** field | Low | Low | Simple text field |
| 15 | **Item Master integration** (select from inventory) | High | High | Items from centralized master |
| 16 | **Per-item Tax** dropdown | Medium | Medium | Different tax rates per line item |
| 17 | **Bulk Upload** items (Excel template) | Medium | High | Download template + upload |
| 18 | **Optional Columns** toggle | Low | Medium | Show/hide columns in item table |
| 19 | **Price Type** selector | Low | Low | Default/Special pricing |
| 20 | **Extra Charges** tab | Medium | Medium | Freight, packaging, handling charges |
| 21 | **Attachments** tab | Medium | Medium | File upload on quotation |
| 22 | **Comment** tab | Low | Low | Internal/external comments |
| 23 | **Attach Signature** | Low | Medium | Upload authorized signatory image |
| 24 | **Email Recipients on form** + Email Preview | Medium | Medium | Configure email before saving |
| 25 | **Additional Discount** | Medium | Low | Discount on total |
| 26 | **RCM (Reverse Charge Mechanism)** | Medium | Medium | GST compliance |
| 27 | **Non-Taxable Extra Charges** | Low | Low | Charges exempt from tax |
| 28 | **Round-off** toggle | Low | Low | Round grand total to nearest rupee |
| 29 | **Advance To Pay** field | Low | Low | Advance payment amount |
| 30 | **SAVE AND SEND** combined action | Medium | Low | Save + email in one click |
| 31 | **Document Number customization** | Low | Low | We already have auto-numbering; TranZact allows series selection |
| 32 | **Supplier Details card** (visible on form) | Low | Low | Display company info on form |

---

## 7. Priority Recommendations

### HIGH PRIORITY (should implement)
1. **OC/Sales Order tracking from quotation** — Know which quotations converted to orders
2. **Conversion Status filter** — Pipeline visibility (Pending vs Converted)
3. **Item Master integration** — Select items from centralized inventory master
4. **Deal Owner assignment** — Assign responsible salesperson
5. **Per-item Tax rate** — Different GST rates per line item (5%, 12%, 18%, 28%)

### MEDIUM PRIORITY (nice to have)
6. **Enquiry linkage** — Link quotations to enquiries
7. **Next Action Date** — Follow-up reminder
8. **Delivery Location** as separate entity — Multiple ship-to addresses
9. **Place of Supply** — GST compliance (CGST+SGST vs IGST determination)
10. **Extra Charges** — Freight, packaging as separate line items
11. **Attachments** on quotation — File uploads
12. **Additional Discount** on total — Overall discount
13. **RCM toggle** — Reverse Charge Mechanism
14. **SAVE AND SEND** action — Combine save + email
15. **Bulk Upload items** — Excel template import
16. **Email Recipients + Preview** on form

### LOW PRIORITY (polish)
17. **Tags** system
18. **Per-column search** in listing
19. **Kind Attention** field
20. **Round-off** toggle
21. **Advance To Pay** field
22. **Signature attachment**
23. **Dummy Buyer** option
24. **Optional Columns** toggle
25. **Price Type** selector

---

## 8. Summary Scorecard

| Category | TranZact | Our ERP | Winner |
|----------|----------|---------|--------|
| **Listing filters** | 3 filters + per-column search | Status + Search + Revision tabs | TranZact (more granular) |
| **Listing columns** | 11 columns | 8 columns | TranZact (more data visible) |
| **Create flow** | Buyer-first modal → single form | Type selection → separate forms | TranZact (simpler UX) |
| **Form header fields** | 9 fields + 4 display cards | 8 fields | TranZact (richer, visual) |
| **Line item fields** | 9 columns (generic) | 16+ fields (piping-specific) | **Our ERP** (industry-depth) |
| **Internal costing** | Not visible | Full cost breakdown + margin | **Our ERP** |
| **Tabs/additional info** | 5 tabs (charges, attachments, comments, signature) | Terms only | TranZact |
| **Totals section** | 8 calculation fields | 4 fields | TranZact (more complete) |
| **Approval workflow** | None visible (Draft → Sent) | Full workflow (Draft → Approval → Sent) | **Our ERP** |
| **Revision system** | Amendment counter | Full revision chain + comparison + triggers | **Our ERP** |
| **PDF generation** | Not analyzed | Quoted + Unquoted variants | **Our ERP** |
| **Email integration** | On-form with preview | Separate action from detail | TranZact (better UX) |
| **Overall depth** | Broad, generic, user-friendly | Deep, industry-specific, process-heavy | Tie (different strengths) |

### Final Assessment
- **TranZact excels at**: UI/UX polish, generic business features (tags, deal tracking, email integration, extra charges, attachments), GST compliance features (Place of Supply, RCM, per-item tax, round-off)
- **Our ERP excels at**: Industry-specific depth (piping fields, NPS/OD/WT), internal business logic (cost breakdown, margins), formal approval workflow, revision management with full diff tracking, dual PDF variants
