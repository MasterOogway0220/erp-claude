# Quotation Revision Module — Complete Design Specification

**Document ID:** SPEC-QRM-001
**Version:** 1.0
**Date:** 14 February 2026
**Status:** For Development
**Author:** ERP Solutions Architect
**Compliance:** ISO 9001:2018 Quality Management System

---

## Part A — Executive Summary

### Purpose

The Quotation Revision module governs the lifecycle of quotation modifications — from initial price negotiation through specification changes, validity extensions, and re-quotation after expiry. In the oil, gas, and petrochemical trading industry, a single enquiry routinely generates 5–10+ quotation revisions before conversion or loss. This module ensures every revision is tracked, compared, approved, and auditable to meet ISO 9001:2018 document control requirements (Clauses 7.5, 8.2, 8.2.4).

### Scope

- Revision initiation from 18 defined trigger scenarios
- Full editing workflow with change tracking at item, cost, and terms level
- Side-by-side comparison between any two revisions
- Tiered approval engine with configurable margin thresholds
- Revision-aware PDF generation and email distribution
- Expiry management with automated notifications and re-quotation workflow
- Complete audit trail satisfying ISO 9001:2018 Clauses 7.5, 8.2, 8.2.4, and 10

### Key Design Decisions

1. **Same quotation number, incremented revision suffix.** A quotation keeps its base number (e.g., NPS/26/00142) and appends the revision (Rev 0, Rev 1, Rev 2). Each revision is a separate database record linked via `parentQuotationId`.

2. **Full-copy storage, not delta.** Each revision stores the complete quotation (all items, terms, costs). This avoids complex reconstruction logic and ensures any revision can be independently printed, emailed, or converted to SO.

3. **Previous revision is superseded, not deleted.** When a new revision is created, the previous revision moves to `SUPERSEDED` status. Only one revision per quotation chain can be in an active state (DRAFT, PENDING_APPROVAL, APPROVED, SENT) at any time.

4. **Change tracking computed at revision creation.** When a revision is created, the system stores a JSON snapshot of what changed from the previous revision. This enables instant comparison without runtime diffing.

5. **Tiered approval based on margin erosion.** Revisions that reduce margin are routed through progressively higher authorities. Validity-only extensions can be auto-approved.

---

## Part B — Complete Screen Specifications

### 2.1 — Quotation Revision Initiation Screen

```
Screen Name: Initiate Quotation Revision
Purpose: Start the revision process by selecting a quotation and capturing the reason for revision
Accessed By: SALES, ADMIN
Navigation Path: Quotations → [Select Quotation] → "Revise" button on detail page
Trigger/Entry Point: Click "Revise" button on Quotation Detail page (status must be APPROVED, SENT, REJECTED, or EXPIRED)
```

**Fields:**

| Field | Data Type | Mandatory | Auto/Manual | Validation | Source/Logic |
|-------|-----------|-----------|-------------|------------|--------------|
| Quotation No. | Text | Display | Auto | — | From selected quotation |
| Current Revision | Int | Display | Auto | — | Current version number |
| Current Status | Enum | Display | Auto | — | Current quotation status |
| Customer | Text | Display | Auto | — | From quotation.customer |
| Grand Total (Current) | Decimal | Display | Auto | — | Current quotation grandTotal |
| Margin % (Current) | Decimal | Display | Auto | — | Calculated from current costing |
| Revision Trigger | Dropdown | Yes | Manual | Must select one | See trigger list below |
| Revision Sub-Reason | Text | Conditional | Manual | Required if trigger is "Other" | Free text |
| Revision Notes | Text (multiline) | No | Manual | Max 1000 chars | Internal notes (not on customer PDF) |
| Customer Reference | Text | No | Manual | — | Customer's email/letter/PO reference for this revision |
| Copy Items From | Radio | Yes | Default: "Previous Revision" | — | "Previous Revision" / "Specific Revision" |
| Source Revision | Dropdown | Conditional | Manual | Required if "Specific Revision" selected | List of all revisions for this quotation |

**Revision Trigger Dropdown Values:**

| Code | Label | Typical Data Change | Auto-Approve Eligible |
|------|-------|--------------------|-----------------------|
| PRICE_NEGOTIATION | Customer requests price reduction | Selling price, margin | No |
| SPEC_CHANGE | Customer changes material specifications | Product, material, spec, size | No |
| QTY_CHANGE | Customer changes quantities | Quantity, line totals | No |
| ITEM_ADD | Customer adds new line items | New items added | No |
| ITEM_REMOVE | Customer removes line items | Items removed | No |
| VALIDITY_EXTENSION | Validity extension only | validUpto date | Yes (configurable) |
| MGMT_REJECTION | Management rejected — internal revision | Margin, pricing | No |
| COMPETITIVE_PRESSURE | Management requests pricing adjustment | Selling price, margin | No |
| COST_CHANGE_MATERIAL | Raw material cost change | Material cost, total cost | No |
| COST_CHANGE_LOGISTICS | Logistics/freight cost change | Logistics cost, total cost | No |
| INSPECTION_CHANGE | Inspection requirement change | Inspection cost, special requirements | No |
| FOREX_CHANGE | Forex rate change (export) | Currency rate, selling price | No |
| ERROR_CORRECTION | Error correction in original | Any field | No |
| BUDGET_TO_FIRM | Convert budget quotation to firm | Pricing, validity, terms | No |
| RE_QUOTATION | Re-quotation after expiry | Costs, pricing, validity | No |
| PARTIAL_REVISION | Only some line items change | Selected items only | No |
| TERMS_CHANGE | Terms & conditions change only | Terms section | Yes (configurable) |
| SCOPE_CHANGE | Project scope expansion/reduction | Items, quantities, specs | No |
| OTHER | Other reason | Any | No |

**Functional Behavior:**

- **On Load:** Fetch quotation details, validate status allows revision. If status is not in [APPROVED, SENT, REJECTED, EXPIRED], show error "This quotation cannot be revised in its current status."
- **On Submit:** Create new revision via POST `/api/quotations/{id}/revise` with trigger data. Navigate to Revised Quotation Entry Screen with the new revision loaded for editing.
- **Validation:** If a DRAFT or PENDING_APPROVAL revision already exists for this quotation chain, block with message: "An active revision (Rev {N}) is already in progress. Please complete or discard it before creating a new revision."
- **Auto-Population:** If "Copy Items From: Previous Revision" is selected, all items, costs, and terms are copied. If "Specific Revision" is selected, items are copied from the chosen revision.

**Business Rules:**
- Cannot revise a quotation in DRAFT or PENDING_APPROVAL status (it's still being worked on)
- Cannot revise a quotation in WON status (already converted to SO)
- CAN revise a LOST quotation (customer may come back)
- CAN revise an EXPIRED quotation (re-quotation scenario)
- Maximum 99 revisions per quotation (practical limit; configurable)
- Only the original quotation creator or any SALES user or ADMIN can initiate a revision

**ISO 9001 Evidence Generated:**
- Revision initiation record with trigger, reason, timestamp, user ID (Clause 8.2.4 — Changes to requirements documented)

---

### 2.2 — Revised Quotation Entry Screen

```
Screen Name: Revised Quotation Entry
Purpose: Edit the revision — modify items, costs, pricing, terms, and validity
Accessed By: SALES, ADMIN
Navigation Path: Quotations → [Revision Detail] → Edit (or directly from Revision Initiation)
Trigger/Entry Point: After Revision Initiation, or click "Edit" on a DRAFT revision
```

**Header Fields:**

| Field | Data Type | Mandatory | Editable | Validation | Source/Logic |
|-------|-----------|-----------|----------|------------|--------------|
| Quotation No. | Text | Display | No (locked) | — | Same base number as original |
| Revision Number | Int | Display | No (locked) | — | Auto-incremented |
| Revision Date | DateTime | Yes | Yes (default today) | Cannot be before original quotation date | Auto: today |
| Reference Enquiry | Link | Display | No (locked) | — | From original quotation |
| Customer | Link | Display | No (locked) | — | From original quotation (NEVER changes) |
| Buyer | Dropdown | Yes | Yes | Must belong to customer | From original, editable |
| Quotation Type | Enum | Display | No (locked) | — | DOMESTIC/EXPORT/BOM from original |
| Quotation Category | Enum | Display | No (locked) | — | STANDARD/NON_STANDARD from original |
| Currency | Dropdown | Yes | Yes | INR, USD, EUR, AED | From original, editable for forex revision |
| Validity Period (Days) | Int | Yes | Yes | Min 1, Max 365 | From original, editable |
| Valid Until | Date | Yes | Auto-calc | = Revision Date + Validity Period | Auto-calculated |
| Payment Terms | Dropdown | Yes | Yes | From PaymentTermsMaster | From original, editable |
| Delivery Terms | Dropdown | Yes | Yes | From DeliveryTermsMaster | From original, editable |
| Delivery Period | Text | No | Yes | Max 200 chars | From original, editable |
| Revision Trigger | Display | Display | No | — | From initiation |
| Revision Notes | Text | Display | Yes | Max 1000 chars | From initiation, editable |

**Item-Level Grid:**

All item fields from the original quotation entry screen are available. Additionally:

| Field | Data Type | Purpose |
|-------|-----------|---------|
| Change Flag | Badge | Auto-computed: "New", "Modified", "Unchanged", "Removed" |
| Previous Value | Tooltip | Hover on any modified field shows the value from the previous revision |

**Item Operations:**
- **Modify Item:** Edit any field on an existing item. System auto-flags it as "Modified" and tracks which fields changed.
- **Add Item:** Click "Add Row" to add new items not in the previous revision. Auto-flagged as "New".
- **Remove Item:** Click remove icon. Item is NOT deleted from the revision — it is flagged as "Removed" with quantity set to 0 and a strikethrough visual. This ensures the comparison view can show removed items.
- **Restore Item:** If an item was removed (flagged), it can be restored before submission.

**Costing Behavior:**
- When `materialCost`, `logisticsCost`, `inspectionCost`, or `otherCosts` changes → `totalCostPerUnit` auto-recalculates
- When `totalCostPerUnit` changes and `marginPercentage` is set → `unitRate` (selling price) auto-recalculates
- When `unitRate` changes directly → `marginPercentage` back-calculates from totalCostPerUnit
- When `quantity` changes → `amount` (= quantity × unitRate), `totalWeightMT` auto-recalculate
- When any item amount changes → subtotal, taxAmount, grandTotal, amountInWords auto-recalculate
- When `validUpto` changes → no cost impact, but auto-approve eligibility changes

**Side-by-Side Reference Panel (Collapsible):**
- Right-side panel (or split view) showing the previous revision's data read-only
- Sales user can see previous pricing, quantities, and terms while editing the revision
- Highlighted fields where current values differ from previous revision
- Collapse/expand toggle for screen space management

**Functional Behavior:**

- **On Load:** Populate all fields from the copied revision data. Compute change flags by comparing with previous revision.
- **On Save (Draft):** Save current state without validation. Status remains DRAFT.
- **On Submit for Approval:** Validate all mandatory fields. Compute the revision change summary (JSON snapshot). Determine approval routing based on margin thresholds. Set status to PENDING_APPROVAL. Trigger notification to approver.
- **Auto-Calculations:** All quotation totals recalculate on any item change. Amount in words regenerates.

**Business Rules:**
- Customer field is PERMANENTLY LOCKED across all revisions (changing customer = new quotation)
- Enquiry reference is PERMANENTLY LOCKED
- Quotation type (DOMESTIC/EXPORT/BOM) is PERMANENTLY LOCKED
- Quotation category (STANDARD/NON_STANDARD) is PERMANENTLY LOCKED
- Currency CAN change (forex scenario) but requires approval
- Items CAN be added that were NOT in the original enquiry (common in scope change)
- Minimum 1 active (non-removed) item required to submit

**ISO 9001 Evidence Generated:**
- Revision record with all field values (Clause 7.5 — version-controlled document)
- Change snapshot JSON comparing to previous revision (Clause 8.2.4 — documented changes)

---

### 2.3 — Revision Comparison Screen

```
Screen Name: Quotation Revision Comparison
Purpose: Side-by-side diff view showing changes between any two revisions
Accessed By: SALES, MANAGEMENT, ADMIN
Navigation Path: Quotations → [Quotation Detail] → Revision History → "Compare" button
Trigger/Entry Point: Select two revisions and click "Compare", or auto-shown during approval
```

**Controls:**

| Control | Type | Logic |
|---------|------|-------|
| Left Revision | Dropdown | All revisions for this quotation (default: previous revision) |
| Right Revision | Dropdown | All revisions for this quotation (default: current/latest revision) |
| Swap | Button | Swap left and right |
| View Mode | Toggle | "Summary" (key changes only) / "Full Detail" (all fields) |

**Summary Panel (Top):**

| Metric | Left Revision | Right Revision | Change |
|--------|---------------|----------------|--------|
| Revision | Rev {N} | Rev {M} | — |
| Date | Date L | Date R | — |
| Status | Status L | Status R | — |
| Items Count | Count L | Count R | +N / -N |
| Grand Total | Amount L | Amount R | +/- Amount (% change) |
| Overall Margin % | Margin L | Margin R | +/- pp |
| Validity | Date L | Date R | Extended/Shortened by N days |
| Revision Trigger | — | Trigger R | Category label |

**Item-Level Comparison Grid:**

| Visual Treatment | Meaning |
|-----------------|---------|
| Green row background | New item (exists only in right revision) |
| Red row background with strikethrough | Removed item (exists only in left revision) |
| Yellow cell highlight | Modified field (value differs between revisions) |
| No highlight | Unchanged field |

For each item row, show:

| Column | Left Value | Right Value | Change Indicator |
|--------|-----------|-------------|-----------------|
| S/N | L | R | — |
| Product | L | R | Highlight if different |
| Material | L | R | Highlight if different |
| Size | L | R | Highlight if different |
| Quantity | L | R | Highlight + delta |
| Unit Rate | L | R | Highlight + delta + % change |
| Amount | L | R | Highlight + delta + % change |
| Margin % | L | R | Highlight + delta |
| Delivery | L | R | Highlight if different |

**Terms Comparison Section:**
- Show terms side-by-side with changed values highlighted
- Added/removed terms flagged

**Costing Comparison (MANAGEMENT/ADMIN only):**
- Full cost breakdown comparison: material cost, logistics, inspection, other, margin per item
- Total cost change, total margin change

**Functional Behavior:**
- **On Load:** If accessed from approval workflow, auto-load current revision vs previous revision.
- **Comparison Scope:** User can compare ANY two revisions — not just consecutive ones (e.g., Rev 0 vs Rev 5 to see cumulative changes).
- **Print/Export:** Comparison view can be exported as PDF for audit trail or management review.
- **Navigation:** Click on any revision number in the comparison to open it in full detail view.

**Business Rules:**
- Costing comparison is visible only to MANAGEMENT and ADMIN roles
- SALES users see item comparison but not the cost breakdown columns

**ISO 9001 Evidence Generated:**
- Comparison report available as audit evidence (Clause 8.2.4 — documented change review)

---

### 2.4 — Revision Approval Screen

```
Screen Name: Quotation Revision Approval
Purpose: Management review and approval of revised quotations
Accessed By: MANAGEMENT, ADMIN (and delegated approvers)
Navigation Path: Dashboard → Pending Approvals → Click quotation, or Quotation Detail → "Approve/Reject" buttons
Trigger/Entry Point: Quotation revision submitted for approval (status = PENDING_APPROVAL)
```

**Display Sections:**

**Section 1 — Quotation Header:**
- Quotation No., Customer, Project, Prepared By, Revision Number
- Revision Trigger and Notes

**Section 2 — Revision Impact Summary:**

| Metric | Previous Rev | This Rev | Delta | Alert |
|--------|-------------|----------|-------|-------|
| Grand Total | ₹ X | ₹ Y | +/- ₹ Z (+/- %) | Red if value decreased |
| Overall Margin % | X% | Y% | +/- pp | Red if below threshold |
| Item Count | N | M | +/- items | Yellow if items removed |
| Validity | Date | Date | +/- days | Yellow if extended > 90d |

**Section 3 — Margin Trend Chart:**
- Line chart showing margin % across all revisions (Rev 0 → current)
- Red threshold line at configured minimum margin
- Tooltip showing date and total value per revision

**Section 4 — Item-Level Changes (Inline Comparison):**
- Same as Comparison Screen but embedded in approval view
- Only changed items shown by default (toggle to show all)

**Section 5 — Full Costing Detail:**
- Complete internal costing grid (material, logistics, inspection, other, margin, selling price)
- Per-item and total level

**Section 6 — Approval Decision:**

| Field | Data Type | Mandatory | Logic |
|-------|-----------|-----------|-------|
| Decision | Radio | Yes | Approve / Reject / Request Further Revision |
| Remarks | Text (multiline) | Conditional | Mandatory for Reject and Request Further Revision |
| Delegated Approval | Checkbox | No | "I am approving on behalf of [name]" |
| Delegation Reference | Text | Conditional | Required if delegated (e.g., "Per email from MD dated 12-Feb-2026") |

**Approval Routing Rules:**

| Condition | Required Approver | Auto-Approve? |
|-----------|-------------------|---------------|
| Revision trigger = VALIDITY_EXTENSION only, no price/item change | — | Yes (auto-approved) |
| Revision trigger = TERMS_CHANGE only, no price/item/validity change | — | Yes (auto-approved) |
| Margin % >= 15% | Sales Head (MANAGEMENT) | No |
| Margin % >= 10% and < 15% | Sales Head (MANAGEMENT) | No |
| Margin % >= 5% and < 10% | General Manager (MANAGEMENT) | No |
| Margin % < 5% | Managing Director (ADMIN) | No |
| Margin dropped by > 5 percentage points from Rev 0 | Managing Director (ADMIN) | No |
| Revision count >= 4 | Managing Director (ADMIN) | No |
| Grand Total > ₹50,00,000 (₹50 lakh) | Managing Director (ADMIN) | No |

**Functional Behavior:**

- **On Approve:** Status → APPROVED. Set approvedById, approvalDate, approvalRemarks. Notify sales user. Quotation available for send/print.
- **On Reject:** Status → REJECTED. Mandatory remarks. Notify sales user with rejection reason. Sales user can create another revision.
- **On Request Further Revision:** Status → REJECTED with remarks. System auto-prompts "Create New Revision" dialog for sales user.
- **Delegation:** If primary approver is unavailable, another MANAGEMENT/ADMIN user can approve with a delegation reference. Logged in audit trail.
- **Escalation:** If approval pending for > 48 hours, auto-escalate notification to next-level authority.

**Business Rules:**
- Approver cannot approve their own quotation (the one they prepared)
- Approver MUST see the comparison with previous revision before approving
- Auto-approval only applies to VALIDITY_EXTENSION and TERMS_CHANGE triggers with no other changes

**ISO 9001 Evidence Generated:**
- Approval record with decision, remarks, timestamp, approver ID, delegation reference (Clause 7.5 — documented information approval)
- Margin trend analysis as documented review evidence (Clause 9.3 — management review input)

---

### 2.5 — Revision History / Timeline Screen

```
Screen Name: Quotation Revision History
Purpose: Complete chronological view of all revisions for a quotation
Accessed By: SALES, MANAGEMENT, ADMIN
Navigation Path: Quotations → [Quotation Detail] → "Revision History" tab
Trigger/Entry Point: Click "Revision History" on any quotation in the chain
```

**Timeline View:**

Each revision displayed as a card in a vertical timeline:

```
Rev 0 — NPS/26/00142
├── Created: 01 Feb 2026 by Amit Shah (SALES)
├── Status: SUPERSEDED
├── Grand Total: ₹12,45,000 | Margin: 22%
├── Approved: 02 Feb 2026 by Rajesh Kumar (MANAGEMENT)
├── Sent: 03 Feb 2026 to buyer@customer.com
├── Trigger: — (Original quotation)
└── Actions: [View] [Print PDF] [Compare ↕]

Rev 1 — NPS/26/00142 Rev 1
├── Created: 07 Feb 2026 by Amit Shah (SALES)
├── Status: SUPERSEDED
├── Grand Total: ₹11,80,000 (-₹65,000 / -5.2%) | Margin: 18%
├── Trigger: PRICE_NEGOTIATION — "Customer requested 5% discount on SS items"
├── Approved: 07 Feb 2026 by Rajesh Kumar (MANAGEMENT)
├── Sent: 08 Feb 2026 to buyer@customer.com
└── Actions: [View] [Print PDF] [Compare ↕]

Rev 2 — NPS/26/00142 Rev 2  ← CURRENT
├── Created: 12 Feb 2026 by Amit Shah (SALES)
├── Status: APPROVED
├── Grand Total: ₹11,50,000 (-₹30,000 / -2.5%) | Margin: 16%
├── Trigger: QTY_CHANGE — "Customer reduced 10" SS pipe quantity from 500 to 350 Mtr"
├── Approved: 13 Feb 2026 by Rajesh Kumar (MANAGEMENT)
├── Items: 12 items (1 removed, 2 modified from Rev 1)
└── Actions: [View] [Print PDF] [Compare ↕] [Send] [Create SO] [Revise]
```

**Summary Metrics Bar (Top):**
- Total Revisions: N
- Current Active Revision: Rev M
- Original Value: ₹X → Current Value: ₹Y (net change: +/- ₹Z, +/- %)
- Original Margin: X% → Current Margin: Y%
- Days Since First Quotation: N days
- Last Customer Communication: Date

**Audit Trail Sub-Tab:**
- Every action on every revision: created, edited, submitted, approved, rejected, sent, expired
- Each entry: Timestamp, User, Action, Details
- Filterable by revision, action type, user, date range

**Functional Behavior:**
- **Default View:** Show all revisions newest-first with the current active revision highlighted
- **Compare Button:** Select any two revisions and open the Comparison Screen
- **Print Any Revision:** Generate PDF for any historical revision (clearly marked with revision number and "SUPERSEDED" watermark if not current)
- **View Button:** Open revision in read-only detail view

**ISO 9001 Evidence Generated:**
- Complete version history satisfying Clause 7.5 (documented information control with version identification)
- Audit trail satisfying Clause 7.5.3 (control of documented information — creation, updating, storage, preservation)

---

### 2.6 — Revised Quotation Print / Email Screen

```
Screen Name: Send Revised Quotation
Purpose: Generate and send revised quotation PDF to customer
Accessed By: SALES, ADMIN
Navigation Path: Quotation Detail → "Send to Customer" button (on APPROVED revision)
Trigger/Entry Point: Click "Send to Customer" on an APPROVED revised quotation
```

**Fields:**

| Field | Data Type | Mandatory | Auto/Manual | Logic |
|-------|-----------|-----------|-------------|-------|
| Quotation No. | Display | — | Auto | Base number + revision |
| Revision | Display | — | Auto | "Revision N" |
| Customer | Display | — | Auto | From quotation |
| To | Email | Yes | Auto (editable) | From buyer email or customer contact |
| CC | Email (multi) | No | Manual | — |
| Subject | Text | Yes | Auto (editable) | Template: "Revised Quotation {quotationNo} Rev {version} — {projectName}" |
| Message | Rich Text | Yes | Auto (editable) | Template with revision context |
| Include Change Summary | Checkbox | No | Default: checked | Attaches a change summary page to the PDF |
| Attach Previous Revision | Checkbox | No | Default: unchecked | Attaches previous revision PDF for customer reference |

**Email Template (Revised Quotation):**

```
Subject: Revised Quotation {quotationNo} Rev {version} — {projectName}

Dear {buyerName},

Thank you for your continued interest.

Please find attached our revised quotation {quotationNo} (Revision {version})
dated {revisionDate} for your reference.

{IF revisionTrigger == PRICE_NEGOTIATION}
As discussed, we have revised the pricing on the referenced items.
{ENDIF}
{IF revisionTrigger == SPEC_CHANGE}
As per your updated specifications, we have revised the quotation accordingly.
{ENDIF}
{IF revisionTrigger == QTY_CHANGE}
As per your updated quantity requirements, please find the revised quotation.
{ENDIF}
{IF revisionTrigger == VALIDITY_EXTENSION}
We have extended the validity of our quotation for your convenience.
{ENDIF}
{DEFAULT}
Please find the revised quotation as per our recent discussions.
{END}

This revised quotation supersedes all previous versions.

Valid until: {validUntil}

We look forward to receiving your valued order.

Best regards,
{preparedByName}
{preparedByEmail}
{companyName}
```

**PDF Output Modifications for Revisions:**
- Title line: **"REVISED QUOTATION"** (instead of "QUOTATION") for all revisions where version > 0
- Below title: **"Revision {version} | Supersedes Revision {version - 1}"**
- All other content identical to standard quotation PDF
- Footer includes: "This quotation supersedes all previous revisions"

**Change Summary Attachment (Optional, 1 page):**
- Header: "Revision Summary — {quotationNo} Rev {version}"
- Table: Items changed with previous value → new value
- Items added (flagged as "NEW")
- Items removed (flagged as "REMOVED")
- Net value change
- Validity change

**Functional Behavior:**
- **On Send:** Update status to SENT, record sentDate, sentTo. Log email in audit trail. Mark previous revision as SUPERSEDED if it was SENT.
- **Email Bounce Handling:** If SMTP returns error, show toast error, do NOT update status to SENT, log the failed attempt.
- **Track Which Revision Customer Last Received:** Store `lastSentRevision` on quotation chain. Display on detail page: "Customer last received: Rev {N} on {date}"

**Business Rules:**
- Can only send APPROVED revisions
- Previous SENT revision automatically gets SUPERSEDED status when new revision is sent
- Email log stored: timestamp, to, cc, subject, attachment names, delivery status

**ISO 9001 Evidence Generated:**
- Email log with PDF copy as evidence of customer communication (Clause 8.2 — communication of requirements)
- Superseded revision flagged to prevent accidental use of obsolete version (Clause 7.5.3)

---

### 2.7 — Quotation Expiry & Re-Quotation Screen

```
Screen Name: Quotation Expiry Management
Purpose: Manage expired quotations and initiate re-quotation
Accessed By: SALES, MANAGEMENT, ADMIN
Navigation Path: Dashboard → "Expiring/Expired Quotations" widget, or Quotations list → filter by EXPIRED
Trigger/Entry Point: Auto-triggered by system cron, or manual access
```

**Expiring Quotations List:**

| Column | Description |
|--------|-------------|
| Quotation No. | With revision badge |
| Customer | Customer name |
| Grand Total | Quotation value |
| Valid Until | Expiry date with countdown (e.g., "Expires in 3 days") |
| Days to Expiry | Numeric (negative for already expired) |
| Status | SENT / APPROVED |
| Salesperson | Prepared by |
| Actions | [Extend Validity] [Re-Quote] [Mark Lost] |

**Filters:**
- Expiring in: 7 days / 14 days / 30 days / Already expired
- Salesperson
- Customer
- Value range

**Actions:**

1. **Extend Validity:** Opens Revision Initiation with trigger pre-set to VALIDITY_EXTENSION. If only validity changes, eligible for auto-approval.

2. **Re-Quote:** Opens Revision Initiation with trigger pre-set to RE_QUOTATION. Copies items from the expired revision with a prompt to update costs (material costs may have changed since expiry).

3. **Mark Lost:** Opens dialog:
   - Loss Reason (dropdown): Price, Delivery, Specification Mismatch, Competition, Customer Budget, Project Cancelled, Other
   - Competitor Name (optional text)
   - Loss Notes (text)
   - Sets status to LOST on the latest revision and all active revisions in chain

**Auto-Expiry System:**
- Daily cron job checks all quotations where `validUpto < today` and status is APPROVED or SENT
- Auto-sets status to EXPIRED
- Triggers notification to sales user

**Notification Schedule:**
- 7 days before expiry: "Quotation {no} expires on {date}" — Normal priority
- 3 days before expiry: "Quotation {no} expires in 3 days" — Normal priority
- 1 day before expiry: "URGENT: Quotation {no} expires tomorrow" — Urgent priority
- On expiry: "Quotation {no} has expired" — Urgent priority
- 7 days after expiry (if not re-quoted or lost): "Reminder: Expired quotation {no} needs follow-up" — Normal

**Re-Quotation vs New Quotation Decision:**
- If the original enquiry is still valid and the customer is the same → **Re-quote as a new revision** (maintains traceability chain)
- If customer comes back after 6+ months → **New enquiry + new quotation** (business context has changed significantly)
- System suggests but the sales user decides

**ISO 9001 Evidence Generated:**
- Expiry records and follow-up actions (Clause 9.1 — monitoring customer communication effectiveness)
- Loss reason documentation (Clause 8.2 — evidence of customer requirement outcome)

---

## Part C — Status Flow & State Machine

### Complete Status Enum

```
DRAFT                  — Revision is being prepared by sales
PENDING_APPROVAL       — Submitted for management approval
APPROVED               — Approved by management, ready to send
REJECTED               — Rejected by management (can create new revision)
SENT                   — Sent to customer, awaiting response
EXPIRED                — Validity period has passed
WON                    — Customer accepted, converted to Sales Order
LOST                   — Customer declined or chose competitor
SUPERSEDED             — A newer revision exists and has been sent
CANCELLED              — Quotation cancelled by management (with reason)
```

### State Machine Diagram

```
                                    ┌─────────────┐
                                    │   DRAFT      │◄──────── [Create Revision]
                                    └──────┬───────┘
                                           │ Submit for Approval
                                           ▼
                              ┌─────────────────────────┐
                              │   PENDING_APPROVAL       │
                              └────┬──────────┬──────────┘
                                   │          │
                          Approve  │          │  Reject
                                   ▼          ▼
                            ┌──────────┐  ┌──────────┐
                            │ APPROVED │  │ REJECTED │
                            └────┬─────┘  └────┬─────┘
                                 │              │
                     Send to     │              │ Create New Revision
                     Customer    │              │ (back to DRAFT)
                                 ▼              │
                            ┌──────────┐        │
                            │   SENT   │◄───────┘ (if re-sent)
                            └────┬─────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │   WON    │ │   LOST   │ │ EXPIRED  │
              │(Terminal)│ │          │ │          │
              └──────────┘ └────┬─────┘ └────┬─────┘
                                │            │
                                │ Re-open    │ Re-quote
                                │            │
                                ▼            ▼
                          [Create New Revision → DRAFT]

  ─────── SUPERSEDED ←── (auto when newer revision is SENT) ───────
  ─────── CANCELLED  ←── (management action with reason)    ───────
```

### Transition Table

| From Status | To Status | Trigger | Role | Conditions |
|-------------|-----------|---------|------|------------|
| — | DRAFT | Create quotation or revision | SALES, ADMIN | Valid initiation conditions met |
| DRAFT | PENDING_APPROVAL | Submit for approval | SALES, ADMIN | All mandatory fields filled |
| DRAFT | DRAFT | Save draft | SALES, ADMIN | — |
| PENDING_APPROVAL | APPROVED | Approve | MANAGEMENT, ADMIN | Approver != preparer |
| PENDING_APPROVAL | REJECTED | Reject | MANAGEMENT, ADMIN | Remarks mandatory |
| APPROVED | SENT | Send to customer | SALES, ADMIN | Email sent successfully |
| APPROVED | SUPERSEDED | Newer revision sent | System | Auto when child revision is SENT |
| REJECTED | DRAFT | Create new revision | SALES, ADMIN | Creates new revision record |
| SENT | WON | Customer accepted (SO created) | SALES, ADMIN | SO created referencing this revision |
| SENT | LOST | Mark as lost | SALES, ADMIN, MANAGEMENT | Loss reason mandatory |
| SENT | EXPIRED | Validity expired | System (cron) | validUpto < today |
| SENT | SUPERSEDED | Newer revision sent | System | Auto when child revision is SENT |
| EXPIRED | DRAFT (new rev) | Re-quote | SALES, ADMIN | Creates new revision |
| LOST | DRAFT (new rev) | Re-open/Re-quote | SALES, ADMIN | Creates new revision |
| SUPERSEDED | — | Terminal for this revision | — | Read-only |
| CANCELLED | — | Terminal | — | Read-only |
| WON | — | Terminal | — | Cannot revise once SO created |

### Cross-Revision Status Rules

- When a new revision is **created**: Previous revision status unchanged (could be APPROVED, SENT, REJECTED, EXPIRED). Only the new revision is DRAFT.
- When a new revision is **sent to customer**: All previous SENT or APPROVED revisions in the chain automatically move to SUPERSEDED.
- When ANY revision is converted to SO (WON): ALL other revisions in the chain move to SUPERSEDED.
- When ALL revisions in a chain are in terminal states (WON, LOST, SUPERSEDED, CANCELLED): The quotation chain is considered closed.

---

## Part D — Business Rules Compendium

### Revision Creation Rules (RC)

| # | Rule | Enforcement |
|---|------|-------------|
| RC-01 | A revision can only be created from APPROVED, SENT, REJECTED, or EXPIRED status | Hard block |
| RC-02 | Cannot create a revision on a WON quotation (already has SO) | Hard block |
| RC-03 | Cannot create a revision if a DRAFT or PENDING_APPROVAL revision already exists in the chain | Hard block |
| RC-04 | Maximum 99 revisions per quotation chain | Hard block (configurable) |
| RC-05 | SALES, ADMIN can initiate revisions | RBAC enforced |
| RC-06 | Revision trigger (reason) is mandatory | Field validation |
| RC-07 | A CANCELLED quotation cannot be revised | Hard block |
| RC-08 | A LOST quotation CAN be revised (re-open scenario) | Allowed |
| RC-09 | An EXPIRED quotation CAN be revised (re-quotation scenario) | Allowed |
| RC-10 | Revision from a "Specific Revision" copies that revision's data, not the latest | System behavior |

### Field Edit Rules (FE)

| # | Rule | Enforcement |
|---|------|-------------|
| FE-01 | Customer cannot change during revision | Field locked across all revisions |
| FE-02 | Reference Enquiry cannot change during revision | Field locked |
| FE-03 | Quotation Type (DOMESTIC/EXPORT/BOM) cannot change | Field locked |
| FE-04 | Quotation Category (STANDARD/NON_STANDARD) cannot change | Field locked |
| FE-05 | Currency CAN change (forex revision) | Editable, requires approval |
| FE-06 | Payment Terms CAN change | Editable |
| FE-07 | Delivery Terms CAN change | Editable |
| FE-08 | Validity CAN change | Editable |
| FE-09 | Items CAN be added that were not in the original enquiry | Editable (scope change) |
| FE-10 | Items can be removed but are flagged, not deleted | Soft remove with flag |
| FE-11 | All costing fields are editable per item | Editable |
| FE-12 | Quotation number stays the same; only revision number increments | System behavior |

### Approval Rules (AR)

| # | Rule | Enforcement |
|---|------|-------------|
| AR-01 | VALIDITY_EXTENSION trigger with no price/item/terms change: auto-approve | System |
| AR-02 | TERMS_CHANGE trigger with no price/item/validity change: auto-approve | System |
| AR-03 | Margin >= 15%: route to MANAGEMENT | Configurable threshold |
| AR-04 | Margin 10-15%: route to MANAGEMENT | Configurable |
| AR-05 | Margin 5-10%: escalate to senior MANAGEMENT | Configurable |
| AR-06 | Margin < 5%: escalate to ADMIN (MD) | Configurable |
| AR-07 | Margin dropped > 5pp from Rev 0: escalate to ADMIN (MD) | Configurable |
| AR-08 | Revision count >= 4: escalate to ADMIN (MD) | Configurable |
| AR-09 | Quotation value > ₹50L: escalate to ADMIN (MD) | Configurable |
| AR-10 | Approver cannot approve own quotation | Hard block |
| AR-11 | Approval pending > 48 hours: auto-escalation notification | System |
| AR-12 | Delegated approval must include reference | Mandatory field |

### Calculation Rules (CR)

| # | Rule | Formula |
|---|------|---------|
| CR-01 | Total Cost/Unit | materialCost + logisticsCost + inspectionCost + otherCosts |
| CR-02 | Selling Price (from margin) | totalCostPerUnit × (1 + marginPercentage / 100) |
| CR-03 | Margin % (from selling price) | ((unitRate - totalCostPerUnit) / unitRate) × 100 |
| CR-04 | Line Amount | quantity × unitRate |
| CR-05 | Total Weight (MT) | quantity × unitWeight / 1000 |
| CR-06 | Subtotal | SUM of all non-removed item amounts |
| CR-07 | Tax Amount | subtotal × (taxRate / 100) |
| CR-08 | Grand Total | subtotal + taxAmount |
| CR-09 | Valid Until | revisionDate + validityPeriodDays |
| CR-10 | Amount in Words | numberToWords(grandTotal, currency) |

### Concurrency Rules (CO)

| # | Rule | Enforcement |
|---|------|-------------|
| CO-01 | Only one DRAFT/PENDING_APPROVAL revision allowed per chain | DB constraint + API check |
| CO-02 | If two users try to edit same draft revision, optimistic locking via updatedAt | API checks updatedAt before save |
| CO-03 | If customer PO arrives against Rev N but Rev N+1 exists, PO Review screen shows warning | UI alert on PO Review |
| CO-04 | If approval is pending and user tries to create another revision, block | Hard block per RC-03 |

---

## Part E — Notification Matrix

| # | Trigger Event | Recipient | Channel | Content | Priority |
|---|---------------|-----------|---------|---------|----------|
| N-01 | Management rejects quotation with "Request Revision" | Sales user (preparedBy) | In-app + Email | "Quotation {no} rejected. Reason: {remarks}. Please create a revision." | Urgent |
| N-02 | Revision submitted for approval | Approver (MANAGEMENT/ADMIN per routing rules) | In-app + Email | "Quotation {no} Rev {version} submitted for your approval. Margin: {margin}%. Value: {total}." | Normal |
| N-03 | Revision approved | Sales user (preparedBy) | In-app + Email | "Quotation {no} Rev {version} approved by {approver}. Ready to send to customer." | Normal |
| N-04 | Revision rejected | Sales user (preparedBy) | In-app + Email | "Quotation {no} Rev {version} rejected. Reason: {remarks}." | Urgent |
| N-05 | Quotation expiring in 7 days | Sales user (preparedBy) | In-app | "Quotation {no} expires on {date} (7 days)." | Normal |
| N-06 | Quotation expiring in 3 days | Sales user (preparedBy) | In-app | "Quotation {no} expires on {date} (3 days)." | Normal |
| N-07 | Quotation expiring tomorrow | Sales user (preparedBy) | In-app + Email | "URGENT: Quotation {no} expires tomorrow ({date})." | Urgent |
| N-08 | Quotation expired | Sales user + Sales Manager | In-app + Email | "Quotation {no} has expired. Action needed: re-quote, extend, or mark lost." | Urgent |
| N-09 | Revision count >= 4 | Sales Manager + MANAGEMENT | In-app | "Quotation {no} has {count} revisions. Review recommended." | Normal |
| N-10 | Margin below 10% during approval | MANAGEMENT + ADMIN | In-app (badge on approval) | "Low margin alert: {margin}% on quotation {no}." | Urgent |
| N-11 | Revised quotation sent to customer | Sales user (preparedBy) | In-app | "Quotation {no} Rev {version} sent to {email} at {timestamp}." | Normal |
| N-12 | Expired quotation not followed up (7 days post-expiry) | Sales user (preparedBy) | In-app + Email | "Reminder: Quotation {no} expired {days} days ago. Please follow up." | Normal |
| N-13 | Approval pending > 48 hours | Next-level approver | In-app + Email | "Escalation: Quotation {no} Rev {version} pending approval for {hours} hours." | Urgent |
| N-14 | Email send failed (bounce) | Sales user (preparedBy) | In-app | "Failed to send quotation {no} to {email}. Please verify the email address." | Urgent |

---

## Part F — Reports & Dashboard Specifications

### 6.1 — Revision Analytics Dashboard

**Data Sources:** Quotation table grouped by quotation chain (parentQuotationId)

**Widgets:**

1. **Average Revisions Per Quotation** — Bar chart by salesperson. Filter: date range, customer, product category.
2. **Revision Reason Distribution** — Pie chart of revision triggers. Filter: date range, salesperson.
3. **Average Time Between Revisions** — Line chart showing days between consecutive revisions. Filter: date range, customer.
4. **Margin Erosion Analysis** — Waterfall chart showing: Rev 0 margin → cost increases → price reductions → final margin. Filter: date range, customer, product.
5. **Revision-to-Conversion Rate** — Grouped bar: quotations by revision count (0, 1, 2, 3, 4+) with win/loss ratio for each group.
6. **Problem Quotations** — Table: Quotations with 3+ revisions, showing chain summary (original value, current value, % change, days open, salesperson).

### 6.2 — Quotation Conversion Funnel

**Visualization:** Funnel chart with drill-down

| Stage | Count | Value | Drop-off % | Avg Time |
|-------|-------|-------|------------|----------|
| Enquiry Received | N | — | — | — |
| Quotation Rev 0 Sent | N | ₹X | -Y% | Z days |
| Quotation Revised (1+ revisions) | N | ₹X | -Y% | Z days |
| Quotation Won (SO Created) | N | ₹X | -Y% | Z days |
| Quotation Lost | N | ₹X | — | Z days |

**Drill-Down:** Click any stage to see individual quotations at that stage.

### 6.3 — Margin Trend Report

**Columns:** Quotation No., Customer, Rev 0 Margin %, Final Rev Margin %, SO Margin % (if converted), Margin Erosion (pp), Revision Count, Revision Triggers
**Charts:**
- Scatter plot: X = Revision Count, Y = Margin Erosion
- Top 10 customers by margin erosion (descending)
- Margin retention by product category (what % of original margin retained after negotiation)

### 6.4 — Validity & Expiry Report

**Sections:**
- Expiring in 7/14/30 days (table with countdown)
- Expired not followed up (table with days since expiry)
- Validity extension frequency (how often are quotations extended vs re-quoted vs lost at expiry)
- Average validity period by customer and product

### 6.5 — Salesperson Performance (Revision Context)

**Columns per salesperson:**
- Total quotations created
- Average revisions per quotation
- Average margin retention (final margin / original margin × 100)
- Average time to close (days from Rev 0 to WON or LOST)
- Win rate by revision count bucket
- Lost revenue on expired/lost quotations

---

## Part G — ISO 9001:2018 Compliance Evidence Map

### Clause 7.5 — Documented Information

| Requirement | Evidence Produced | How |
|-------------|-------------------|-----|
| 7.5.1 — Creating and updating | Quotation record with auto-generated number, revision numbering | System-enforced |
| 7.5.2 — Identification and description | Quotation number + Revision number uniquely identifies each version | Database primary key |
| 7.5.2 — Review and approval | Approval record with approver, date, remarks | Stored per revision |
| 7.5.3 — Availability and suitability | Current revision clearly identified; superseded revisions flagged | Status management |
| 7.5.3 — Protection from unintended alteration | Only DRAFT status is editable; approved/sent/superseded are read-only | API enforcement |
| 7.5.3 — Retention and disposition | All revisions retained permanently (7-year minimum); never deleted | Soft-delete only |
| 7.5.3 — Prevention of unintended use of obsolete | SUPERSEDED status prevents accidental use of old revisions | Status + UI treatment |

### Clause 8.2 — Requirements for Products and Services

| Requirement | Evidence Produced |
|-------------|-------------------|
| 8.2.1 — Customer communication | Email log with PDF attachment for each revision sent |
| 8.2.2 — Determination of requirements | Enquiry record linked to quotation; item specifications captured |
| 8.2.3 — Review of requirements | Approval workflow ensures management reviews before customer release |
| 8.2.4 — Changes to requirements | Revision trigger and change snapshot document what changed and why |

### Clause 8.2.4 — Changes to Requirements (Specific)

| Requirement | Evidence |
|-------------|----------|
| Changes documented | Revision initiation with trigger, reason, customer reference |
| Relevant persons made aware | Notification system alerts approvers, sales managers |
| Amended documented information | Comparison view showing old vs new values |
| Downstream impact | When SO exists, revision cannot bypass it — SO must reference specific revision |

### Clause 9.3 — Management Review (Input)

| Input | Source |
|-------|--------|
| Customer feedback | Lost quotation reasons, revision triggers from customer |
| Process performance | Revision analytics, conversion funnel, margin trends |
| Nonconformity and corrective action | Error correction revisions tracked |
| Opportunities for improvement | Margin erosion analysis, revision frequency analysis |

---

## Part H — Edge Case Resolution Guide

| # | Edge Case | Resolution |
|---|-----------|------------|
| H-01 | Customer accepts Rev 1, but Rev 3 was latest sent | PO Review screen shows warning: "Customer PO references Rev 1 but latest sent revision is Rev 3." Sales user must acknowledge the mismatch and select which revision to use for SO creation. System allows SO creation against any SENT or APPROVED revision with documented justification. |
| H-02 | Customer says "go back to Rev 3 pricing" after 8 revisions | Sales user creates Rev 9 using "Copy Items From: Specific Revision" → selects Rev 3. Items and pricing from Rev 3 are loaded. User can further adjust if needed. Revision trigger: PRICE_NEGOTIATION with note "Reverted to Rev 3 pricing per customer request." |
| H-03 | Customer PO references wrong revision number | PO Review screen displays: linked quotation revision, customer PO text, and mismatch alert. Sales user documents the discrepancy in PO review remarks. Variance must be acknowledged before SO creation. |
| H-04 | Two contacts negotiating simultaneously | System prevents two active DRAFT/PENDING_APPROVAL revisions (Rule CO-01). Sales user must coordinate. If PO arrives while revision is in progress, system alerts: "A draft revision (Rev N) exists. Please resolve before processing PO." |
| H-05 | Lost quotation, customer returns 6 months later | If < 6 months and same enquiry context: Create new revision on existing chain. If >= 6 months or significantly different scope: Create new enquiry + new quotation. System does not enforce this automatically — sales user decides. Revision trigger for the former: RE_QUOTATION. |
| H-06 | Price drops after approval but before sending | Sales user can create a new revision with trigger COST_CHANGE_MATERIAL and updated costs. The approved revision moves to SUPERSEDED when the new revision is sent. Alternatively, sales user sends the approved revision as-is (customer gets a better deal, but margin improves for the company). |
| H-07 | Validity expires on a public holiday | System uses calendar dates, not business days, for expiry. Expiry happens on the calendar date regardless of holidays. If the business wants to extend, they create a VALIDITY_EXTENSION revision before expiry. |
| H-08 | Partial revision (3 of 15 items) | All 15 items are copied to the new revision. Sales user modifies only the 3 items. The other 12 remain unchanged (flagged as "Unchanged" in comparison). No need to re-enter unchanged items. |
| H-09 | Email bounces | SMTP error is caught; status is NOT updated to SENT; error toast shown to user. Audit log records the failed attempt with error message. User corrects email address and retries. System tracks: `emailAttempts` count and `lastEmailError`. |
| H-10 | Customer requests revision via phone call | Sales user creates the revision through the normal Initiation Screen. Trigger: whichever applies (PRICE_NEGOTIATION, SPEC_CHANGE, etc.). Customer Reference field: "Phone call with {contact} on {date}". All revision triggers ultimately go through the same system workflow regardless of how the request was received. |
| H-11 | Wrong revision submitted for approval | Sales user contacts approver. If still PENDING_APPROVAL, approver can REJECT with remarks "Submitted in error — please revise and re-submit." Sales user then edits the DRAFT (created from rejection) and re-submits. There is no direct "recall" action — rejection is the mechanism. |
| H-12 | Approver on leave — delegation | Another MANAGEMENT/ADMIN user can approve with the "Delegated Approval" checkbox and a reference (e.g., "Approved on behalf of {name} per email authorization dated {date}"). Delegation is logged in audit trail. Auto-escalation triggers after 48 hours if no action. |
| H-13 | Customer wants two pricing options (A vs B) | Not supported as a single revision. Create two separate revisions: Rev N (Option A) and Rev N+1 (Option B). Both can be APPROVED and SENT. Revision notes should cross-reference: "See also Rev {N} for alternative pricing." Only one can ultimately be WON. |
| H-14 | Forex rate changes between export revisions | Currency field is editable during revision. If currency changes (e.g., USD rate changed), all unit rates should be re-entered in the new rate. Revision trigger: FOREX_CHANGE. System does NOT auto-convert amounts — sales user must manually adjust pricing (forex hedging is out of scope per PRD). |
| H-15 | Tender deadline — time-critical revision | Standard workflow applies, but the Urgency field on the revision initiation (from enquiry priority) flags it. Approval notifications include "URGENT" prefix. Escalation period can be configured shorter for urgent quotations (e.g., 24 hours instead of 48). |

---

## Part I — Data Model Specification

### Storage Strategy: Full-Copy with Chain Linkage

Each revision is a complete, independent `Quotation` record. Revisions are linked via `parentQuotationId` forming a chain. This design:
- Enables independent PDF generation from any revision
- Simplifies queries (each revision is self-contained)
- Allows SO creation against any specific revision
- Avoids complex delta-reconstruction logic

### Schema Changes Required

**New fields on Quotation model:**

```prisma
model Quotation {
  // ... existing fields ...

  // Revision tracking (enhanced)
  revisionTrigger       String?           // Enum code: PRICE_NEGOTIATION, SPEC_CHANGE, etc.
  revisionSubReason     String?           // Free text sub-reason
  revisionNotes         String?  @db.Text // Internal notes for this revision
  customerReference     String?           // Customer's email/letter ref for this change

  // Change tracking
  changeSnapshot        Json?             // JSON diff from previous revision

  // Email tracking
  lastSentRevision      Int?              // Track which revision customer last received
  emailAttempts         Int      @default(0)
  lastEmailError        String?

  // Expiry management
  expiryNotified7d      Boolean  @default(false)
  expiryNotified3d      Boolean  @default(false)
  expiryNotified1d      Boolean  @default(false)

  // Loss tracking
  lossReason            String?           // Dropdown code
  lossCompetitor        String?           // Competitor name
  lossNotes             String?  @db.Text

  // Approval delegation
  delegatedApproval     Boolean  @default(false)
  delegationReference   String?
}
```

**New enum value for QuotationStatus:**

```prisma
enum QuotationStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  REJECTED
  SENT
  EXPIRED              // NEW
  WON                  // renamed from existing usage
  LOST
  SUPERSEDED           // NEW — replaces REVISED
  CANCELLED            // NEW
}
```

**New QuotationItemChangeFlag (computed, not stored):**

Change flags are computed at comparison time by comparing items between two revisions using `sNo` as the matching key:
- Items in right revision but not in left: "New"
- Items in left revision but not in right (or quantity = 0 in right): "Removed"
- Items in both with differing field values: "Modified"
- Items in both with identical values: "Unchanged"

**Change Snapshot JSON Structure:**

```json
{
  "previousRevision": 1,
  "currentRevision": 2,
  "headerChanges": {
    "validUpto": { "old": "2026-03-01", "new": "2026-03-15" },
    "currency": { "old": "INR", "new": "INR" }
  },
  "itemsAdded": [{ "sNo": 11, "product": "CS Seamless Pipe", "quantity": 100 }],
  "itemsRemoved": [{ "sNo": 5, "product": "SS 316L Pipe", "quantity": 200 }],
  "itemsModified": [
    {
      "sNo": 3,
      "changes": {
        "quantity": { "old": 500, "new": 350 },
        "unitRate": { "old": 1200.00, "new": 1150.00 },
        "amount": { "old": 600000.00, "new": 402500.00 }
      }
    }
  ],
  "termsChanges": [
    { "termName": "Payment", "old": "100% 30 days", "new": "50% advance, 50% 30 days" }
  ],
  "summary": {
    "totalChange": -197500.00,
    "totalChangePercent": -15.8,
    "marginChange": -4.2,
    "itemCountChange": 0
  }
}
```

### Indexes Required

```prisma
@@index([parentQuotationId])           // Fast chain traversal
@@index([status])                       // Filter by status
@@index([validUpto])                    // Expiry queries
@@index([customerId, status])           // Customer + status lookup
@@index([preparedById, status])         // Salesperson dashboard
@@index([revisionTrigger])              // Analytics grouping
@@index([quotationNo, version])         // Unique revision lookup
```

### Foreign Key Relationships

```
Quotation (parentQuotationId) → Quotation (id)    // Revision chain
SalesOrder (quotationId) → Quotation (id)          // SO references specific revision
Quotation (enquiryId) → Enquiry (id)               // Enquiry link (same across chain)
Quotation (customerId) → CustomerMaster (id)       // Customer link (same across chain)
```

### Data Retention

- All quotation revisions retained for minimum 7 years per ISO 9001 and Indian regulatory requirements
- No hard deletion — only soft-delete (status = CANCELLED) with management approval
- Archived quotations remain searchable and retrievable
- Change snapshots retained alongside the revision they describe

---

## Part J — UAT Test Case Document

### TC-01: Happy Path — Full Revision Lifecycle

**Preconditions:** Enquiry ENQ/26/00001 exists. Customer "ABC Petrochemicals" exists.

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Create Quotation Rev 0 from enquiry | Quotation NPS/26/XXXXX created, status DRAFT, version 0 | |
| 2 | Add 5 line items with costing | Items saved with calculated amounts, grand total correct | |
| 3 | Submit for approval | Status → PENDING_APPROVAL. Notification sent to MANAGEMENT. | |
| 4 | Management approves | Status → APPROVED. Sales user notified. | |
| 5 | Send to customer | Status → SENT. Email log created. sentDate and sentTo populated. | |
| 6 | Customer requests 5% price reduction | — (External communication) | |
| 7 | Click "Revise" on quotation | Initiation screen opens. Select trigger: PRICE_NEGOTIATION. | |
| 8 | Submit initiation | Rev 1 created in DRAFT status. Version = 1. All items copied. Original status remains SENT. | |
| 9 | Reduce unit rates by 5% on all items | Amounts recalculate. Margin % decreases. Grand total decreases. | |
| 10 | Submit Rev 1 for approval | Status → PENDING_APPROVAL. Approver sees comparison with Rev 0. | |
| 11 | Management approves Rev 1 | Status → APPROVED. | |
| 12 | Send Rev 1 to customer | Rev 1 status → SENT. Rev 0 status → SUPERSEDED. PDF shows "REVISED QUOTATION — Revision 1". | |
| 13 | Customer accepts Rev 1 | — (External communication) | |
| 14 | Create Sales Order from Rev 1 | SO created linked to Rev 1. Rev 1 status → WON. All other revisions → SUPERSEDED. | |

### TC-02: Multiple Revisions with Cross-Comparison

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create quotation with 8 items | Rev 0 created |
| 2 | Approve and send Rev 0 | Sent to customer |
| 3 | Create Rev 1 (price change on 2 items) | Rev 1 DRAFT, 2 items modified |
| 4 | Approve and send Rev 1 | Rev 0 → SUPERSEDED |
| 5 | Create Rev 2 (add 1 item, remove 1 item) | Rev 2 DRAFT, 8 → 8 items (1 new, 1 removed) |
| 6 | Approve and send Rev 2 | Rev 1 → SUPERSEDED |
| 7 | Create Rev 3 (quantity change on 3 items) | Rev 3 DRAFT |
| 8 | Approve and send Rev 3 | Rev 2 → SUPERSEDED |
| 9 | Create Rev 4 (validity extension only) | Rev 4 DRAFT, auto-approved if configured |
| 10 | Open Comparison: Rev 0 vs Rev 4 | Shows ALL cumulative changes: 2 prices changed, 1 item added, 1 removed, 3 quantities changed, validity extended |
| 11 | Open Comparison: Rev 2 vs Rev 3 | Shows ONLY the 3 quantity changes |
| 12 | Open Revision History | Timeline shows all 5 revisions with status, dates, metrics |
| 13 | Print Rev 1 | PDF generated with "SUPERSEDED" watermark, clearly shows Revision 1 |

### TC-03: Management Rejection and Re-Revision

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create quotation with 12% margin | Rev 0 DRAFT |
| 2 | Submit for approval | PENDING_APPROVAL |
| 3 | Management rejects: "Margin too low, need 18% minimum" | Status → REJECTED. Notification to sales with reason. |
| 4 | Sales clicks "Revise" on rejected quotation | Initiation with trigger: MGMT_REJECTION |
| 5 | Sales increases margins to 19% | Rev 1 with higher prices |
| 6 | Submit Rev 1 | PENDING_APPROVAL |
| 7 | Management approves | APPROVED |
| 8 | Verify comparison: Rev 0 vs Rev 1 | Shows margin increase, price increases |

### TC-04: Validity Extension (Auto-Approve)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create and send quotation valid for 30 days | Rev 0 SENT |
| 2 | After 25 days, initiate revision with trigger VALIDITY_EXTENSION | Initiation screen |
| 3 | Change only the validity period from 30 to 60 days | Valid Until date recalculates |
| 4 | Submit | If auto-approve configured: immediately APPROVED (no PENDING_APPROVAL step) |
| 5 | Verify no other fields changed | Comparison shows only validity date change |

### TC-05: Partial Item Revision

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create quotation with 10 items, total ₹25,00,000 | Rev 0 |
| 2 | Approve and send | SENT |
| 3 | Customer asks price change on items 3, 7, 9 | — |
| 4 | Create revision, modify only items 3, 7, 9 | Rev 1 DRAFT. 3 items flagged "Modified", 7 flagged "Unchanged" |
| 5 | Submit and approve | Approved |
| 6 | Verify totals recalculated | Grand total reflects changes on 3 items. Other 7 item amounts unchanged. |
| 7 | Comparison view | Only 3 rows highlighted yellow. Other 7 rows clean. |

### TC-06: Add and Remove Items

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create quotation with 5 items | Rev 0 |
| 2 | Approve and send | SENT |
| 3 | Create revision: add 2 items, remove 1 item | Rev 1 with 6 active items (5 - 1 + 2) |
| 4 | Verify removed item in comparison | Shown with red background and "REMOVED" badge |
| 5 | Verify added items in comparison | Shown with green background and "NEW" badge |
| 6 | Verify totals | Grand total = sum of 6 active items |

### TC-07: Expired Quotation Re-Quote

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create quotation valid for 7 days | Rev 0 |
| 2 | Approve and send | SENT |
| 3 | Wait for expiry (or manually trigger) | Status → EXPIRED. Notification sent to sales. |
| 4 | Click "Re-Quote" | Initiation with trigger RE_QUOTATION |
| 5 | Update costs (material prices may have changed) | Rev 1 with updated costs |
| 6 | Submit, approve, send | Rev 1 SENT, Rev 0 SUPERSEDED |

### TC-08: SO Against Non-Latest Revision

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send Rev 0, then send Rev 1, then send Rev 2 | Rev 0, Rev 1 SUPERSEDED. Rev 2 SENT. |
| 2 | Customer sends PO referencing Rev 1 | — |
| 3 | Create PO Review with customer PO | System warns: "Customer PO references Revision 1, but Revision 2 is the latest sent." |
| 4 | Sales acknowledges mismatch with remark | PO Review accepted with documented variance |
| 5 | Create SO referencing Rev 1 | SO created linked to Rev 1. Rev 1 → WON. Rev 2 → SUPERSEDED. |

### TC-09: Concurrency Prevention

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | User A creates Rev 1 (DRAFT) | Rev 1 in DRAFT status |
| 2 | User B attempts to create Rev 2 | Error: "An active revision (Rev 1) is already in progress." |
| 3 | User A submits Rev 1 for approval | PENDING_APPROVAL |
| 4 | User B attempts to create Rev 2 | Error: "An active revision (Rev 1) is pending approval." |
| 5 | Approver approves Rev 1 | APPROVED |
| 6 | User B creates Rev 2 | Succeeds — no active draft/pending revisions |

### TC-10: Approval Threshold Escalation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create quotation with 20% margin | Rev 0 |
| 2 | Approve (routes to MANAGEMENT) | Standard approval |
| 3 | Revise to 12% margin | Rev 1 |
| 4 | Submit | Routes to MANAGEMENT (margin >= 10%) |
| 5 | Approve Rev 1 | Approved |
| 6 | Revise to 8% margin | Rev 2 |
| 7 | Submit | Routes to ADMIN/MD (margin < 10%) |
| 8 | Verify approval routing | Correct approver receives notification |

### TC-11: Complete Audit Trail

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create quotation | Audit: CREATE by user X at timestamp |
| 2 | Edit draft | Audit: UPDATE by user X at timestamp (field changes) |
| 3 | Submit for approval | Audit: SUBMIT_FOR_APPROVAL by user X |
| 4 | Approve | Audit: APPROVE by user Y with remarks |
| 5 | Send | Audit: SEND to email@customer.com |
| 6 | Revise | Audit: CREATE_REVISION trigger=PRICE_NEGOTIATION by user X |
| 7 | Edit revision | Audit: UPDATE by user X (field changes) |
| 8 | Submit revision | Audit: SUBMIT_FOR_APPROVAL by user X |
| 9 | Reject revision | Audit: REJECT by user Y with remarks |
| 10 | Verify all entries | Complete trail with timestamps, user IDs, actions, details |

### TC-12: Print and Email Verification

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send Rev 0 to customer | Email sent, PDF title: "QUOTATION" |
| 2 | Create and approve Rev 1 | Rev 1 APPROVED |
| 3 | Send Rev 1 to customer | Email subject contains "Revised Quotation". PDF title: "REVISED QUOTATION — Revision 1". Footer: "This quotation supersedes all previous revisions." |
| 4 | Check email log | Both emails logged with timestamps, recipients, PDF copies |
| 5 | Print Rev 0 from history | PDF generated with "SUPERSEDED" watermark |
| 6 | Verify no internal costs on customer PDF | Only selling price and total visible. No material cost, logistics, margin columns. |

---

## Part K — PRD-Ready Content

*The following section is written in the exact style of the existing PRD and can be inserted as a new sub-section under Module 1 — Enquiry & Quotation Management.*

---

### 6.6 Screen: Quotation Revision Initiation

**Purpose:** Start the revision process by capturing the reason for revision and selecting the source data

**Screen Fields:**

| Field | Type | Source | Mandatory | Notes |
|-------|------|--------|-----------|-------|
| Quotation No. | Display | System | — | From selected quotation |
| Current Revision | Display | System | — | Current version number |
| Current Status | Display | System | — | Must be APPROVED, SENT, REJECTED, or EXPIRED |
| Customer | Display | System | — | From quotation |
| Revision Trigger | Dropdown | System | Yes | 19 predefined trigger categories (see table below) |
| Revision Sub-Reason | Text | Manual | Conditional | Required when trigger = OTHER |
| Revision Notes | Text | Manual | No | Internal notes (not on customer PDF) |
| Customer Reference | Text | Manual | No | Customer's email/letter/PO reference |
| Copy Items From | Radio | Default: Previous Revision | Yes | Previous Revision / Specific Revision |
| Source Revision | Dropdown | System | Conditional | Required if Specific Revision selected |

**Revision Trigger Values:** PRICE_NEGOTIATION, SPEC_CHANGE, QTY_CHANGE, ITEM_ADD, ITEM_REMOVE, VALIDITY_EXTENSION, MGMT_REJECTION, COMPETITIVE_PRESSURE, COST_CHANGE_MATERIAL, COST_CHANGE_LOGISTICS, INSPECTION_CHANGE, FOREX_CHANGE, ERROR_CORRECTION, BUDGET_TO_FIRM, RE_QUOTATION, PARTIAL_REVISION, TERMS_CHANGE, SCOPE_CHANGE, OTHER

**Functional Behavior:**
- Validates quotation is in a revisable status; blocks with error if not
- Checks no active DRAFT or PENDING_APPROVAL revision exists in the chain
- On submit: creates new revision record with fresh quotation number, incremented version, DRAFT status, and all items/terms copied from source
- Navigates to Revised Quotation Entry screen

**ISO Alignment:** Clause 8.2.4 — Changes to requirements for products and services. The revision trigger and reason provide documented evidence of what changed and why.

---

### 6.7 Screen: Revised Quotation Entry

**Purpose:** Edit the revision — modify items, costs, pricing, terms, and validity

**Screen Fields:**

*Header (locked fields):* Quotation No., Enquiry Reference, Customer, Quotation Type, Quotation Category

*Header (editable fields):* Revision Date, Buyer, Currency, Validity Period, Valid Until (auto-calculated), Payment Terms, Delivery Terms, Delivery Period

*Item-Level Grid:* All fields from Quotation Entry screen (Section 6.3), plus:

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| Change Flag | Badge | Auto | NEW / MODIFIED / UNCHANGED / REMOVED |
| Previous Value | Tooltip | Auto | Shows previous revision value on hover for modified fields |

**Functional Behavior:**
- Items from previous revision are pre-populated; user modifies as needed
- Removed items are flagged (not deleted) to enable comparison
- All auto-calculations from Section 6.3 apply (totals, margins, amounts, weights, amount in words)
- Side-by-side reference panel shows previous revision data (collapsible)
- On save: saves as DRAFT
- On submit: validates mandatory fields, computes change snapshot JSON, determines approval routing, sets status to PENDING_APPROVAL
- Customer and Enquiry Reference are permanently locked and cannot change across any revision
- Minimum 1 active (non-removed) item required

**ISO Alignment:** Clause 7.5 — Documented information. Each revision is a version-controlled document with full traceability to its predecessor.

---

### 6.8 Screen: Quotation Revision Comparison

**Purpose:** Side-by-side diff view showing changes between any two revisions

**Screen Fields:**

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| Left Revision | Dropdown | System | Any revision in the chain |
| Right Revision | Dropdown | System | Any revision in the chain |
| View Mode | Toggle | Manual | Summary / Full Detail |

**Display Sections:**
1. **Impact Summary:** Grand total change, margin change, item count change, validity change
2. **Item Comparison Grid:** Side-by-side items with visual indicators (green = new, red = removed, yellow = modified)
3. **Terms Comparison:** Changed terms highlighted
4. **Costing Comparison:** Full cost breakdown (MANAGEMENT/ADMIN only)

**Functional Behavior:**
- Can compare ANY two revisions (not just consecutive)
- Auto-loaded during approval workflow (current vs previous)
- Exportable as PDF for audit records
- Costing columns hidden from SALES role

**ISO Alignment:** Clause 8.2.4 — Provides documented evidence of change review between versions.

---

### 6.9 Screen: Quotation Revision Approval

**Purpose:** Management review and approval of revised quotations with full context

**Screen Fields:**

| Field | Type | Source | Mandatory | Notes |
|-------|------|--------|-----------|-------|
| Revision Impact Summary | Display | Auto | — | Delta in value, margin, items, validity |
| Margin Trend | Chart | Auto | — | Line chart of margin % across all revisions |
| Item Changes | Grid | Auto | — | Embedded comparison with previous revision |
| Full Costing | Grid | Auto | — | Complete internal cost breakdown |
| Decision | Radio | Manual | Yes | Approve / Reject / Request Further Revision |
| Remarks | Text | Manual | Conditional | Mandatory for Reject / Request Further Revision |
| Delegated Approval | Checkbox | Manual | No | Enables delegation reference field |
| Delegation Reference | Text | Manual | Conditional | Required if delegated |

**Approval Routing:**
- Validity-only or terms-only changes: auto-approve (configurable)
- Margin >= 15%: MANAGEMENT
- Margin 5-15%: Senior MANAGEMENT
- Margin < 5% or dropped > 5pp from Rev 0 or 4+ revisions or value > ₹50L: ADMIN (MD)

**Functional Behavior:**
- Approver cannot approve quotation they prepared
- Approval pending > 48 hours triggers auto-escalation
- On approve: status → APPROVED, notification to sales
- On reject: status → REJECTED, mandatory remarks, notification to sales
- Delegated approvals logged in audit trail

**ISO Alignment:** Clause 7.5 — Documented information approval and release control.

---

### 6.10 Screen: Quotation Revision History

**Purpose:** Complete chronological view and audit trail of all revisions

**Display:** Vertical timeline showing each revision with:
- Version number, date, status, creator, approver
- Grand total and margin % with delta from previous
- Revision trigger and notes
- Actions: View, Print PDF, Compare

**Summary Metrics:** Total revisions, current active revision, original vs current value, margin trend, days since first quotation

**Audit Trail:** Every action (create, edit, submit, approve, reject, send, expire) with timestamp, user, and details

**ISO Alignment:** Clause 7.5.3 — Control of documented information including identification, storage, preservation, retrieval, retention, and disposition.

---

### 6.11 Quotation Expiry Management

**Purpose:** Manage quotation validity, expiry notifications, and re-quotation workflow

**Functional Behavior:**
- Daily system check: quotations where validUpto < today and status APPROVED/SENT → auto-set EXPIRED
- Notification schedule: 7 days, 3 days, 1 day before expiry, on expiry, 7 days after
- Actions on expired quotation: Extend Validity (revision), Re-Quote (revision with cost update), Mark Lost (with reason)
- Re-quotation creates new revision with trigger RE_QUOTATION

**ISO Alignment:** Clause 9.1 — Monitoring and measurement of customer response and communication effectiveness.

---

### 6.12 Quotation Status Flow (Complete)

```
Draft → Pending Approval → Approved → Sent → Won (SO Created)
                        ↘ Rejected ↗       ↘ Lost
                                             ↘ Expired → [Re-Quote → Draft]
```

Additional states: SUPERSEDED (auto when newer revision sent), CANCELLED (management action with documented reason)

**Cross-Revision Rules:**
- When new revision is sent: all previous SENT/APPROVED revisions → SUPERSEDED
- When any revision is WON: all others → SUPERSEDED
- Only one active (DRAFT/PENDING_APPROVAL) revision per chain at any time

---

*End of Quotation Revision Module Specification*
