# Business Logic Implementation - NPS ERP System

**Version:** 1.0
**Date:** February 12, 2026
**Status:** Implementation Complete

---

## Overview

This document provides implementation details for all critical business logic features required by the PRD. These implementations ensure data integrity, compliance with business rules, and automation of key workflows.

---

## Table of Contents

1. [PO vs Quotation Variance Detection](#1-po-vs-quotation-variance-detection)
2. [E-Invoice JSON Generation for GST](#2-e-invoice-json-generation-for-gst)
3. [Data Migration Scripts](#3-data-migration-scripts)
4. [Auto PR Generation from SO Shortfall](#4-auto-pr-generation-from-so-shortfall)
5. [Integration Guide](#5-integration-guide)
6. [Testing](#6-testing)

---

## 1. PO vs Quotation Variance Detection

### 1.1 Overview

**Purpose:** Detect and report variances between Purchase Order and original Sales Quotation to ensure pricing integrity and prevent unauthorized changes.

**Implementation Location:** `src/lib/business-logic/po-variance-detection.ts`

### 1.2 Features

- Compares PO items against approved quotation
- Detects variances in:
  - Total amount
  - Line item quantities
  - Unit rates
  - Line item amounts
  - Product specifications (CRITICAL)
- Calculates variance percentage for each field
- Generates warnings for critical mismatches
- Determines if management approval required

### 1.3 Variance Thresholds

| Variance Type | Threshold | Action Required |
|---------------|-----------|-----------------|
| Total Amount | >5% | Management approval |
| Unit Rate Change | Any change | Management approval |
| Specification Mismatch | Any mismatch | CRITICAL - Immediate review |
| Line Item Variance | >10% | Management approval |

### 1.4 Usage Example

```typescript
import { detectPOVariances } from '@/lib/business-logic/po-variance-detection';

// When creating PO from quotation
const varianceReport = await detectPOVariances(
  quotationId,
  poItems,
  poTotalAmount
);

if (varianceReport.hasVariances) {
  console.log(generateVarianceReportText(varianceReport));

  if (varianceReport.requiresApproval) {
    // Set PO status to PENDING_APPROVAL
    // Send notification to management
  }
}

// Log variance detection
await logVarianceDetection(quotationId, poId, varianceReport, userId);
```

### 1.5 Variance Report Output

```
=== PO vs Quotation Variance Report ===

Total Amount Variance: ₹5,000.00 (5.12%)

WARNINGS:
⚠️  CRITICAL: Specification mismatch detected on line 2.
    Product/Material/Size differs from quotation. Requires immediate review.

Line Item Variances:
--------------------------------------------------------------------------------
Line 2 - Unit Rate:
  Quotation: 115.00
  PO: 120.00
  Variance: 5.00 (4.35%)

Line 3 - Quantity:
  Quotation: 500.00
  PO: 450.00
  Variance: -50.00 (-10.00%)

⚠️  MANAGEMENT APPROVAL REQUIRED
Variances exceed acceptable threshold. Please review and approve before proceeding.
```

### 1.6 API Integration

```typescript
// In PO creation API route
export async function POST(request: NextRequest) {
  const { quotationId, items, totalAmount } = await request.json();

  // Detect variances
  const variances = await detectPOVariances(quotationId, items, totalAmount);

  if (variances.requiresApproval) {
    // Create PO with PENDING_APPROVAL status
    const po = await prisma.purchaseOrder.create({
      data: {
        status: 'PENDING_APPROVAL',
        // ... other fields
      },
    });

    // Send notification to management
    await sendApprovalRequest(po.id, variances);

    return NextResponse.json({
      po,
      message: 'PO created and pending approval due to variances',
      variances: generateVarianceReportText(variances),
    });
  }

  // No significant variances - create PO normally
  const po = await prisma.purchaseOrder.create({ /* ... */ });

  return NextResponse.json({ po });
}
```

---

## 2. E-Invoice JSON Generation for GST

### 2.1 Overview

**Purpose:** Generate GST-compliant e-invoice JSON format for submission to Government e-invoice portal.

**Implementation Location:** `src/lib/business-logic/e-invoice-generator.ts`

**Schema Version:** 1.1 (as per GST portal requirements)

### 2.2 Features

- Generates JSON matching GST e-invoice schema
- Supports B2B, Export (EXPWOP), and SEZ transactions
- Auto-detects inter-state (IGST) vs intra-state (CGST+SGST)
- Validates GSTIN format
- Calculates GST amounts correctly
- Generates HSN-wise item breakdown
- Includes buyer/seller details
- Supports reference documents (PO, SO)

### 2.3 Usage Example

```typescript
import { generateEInvoiceJSON, validateEInvoiceJSON, saveEInvoiceJSON } from '@/lib/business-logic/e-invoice-generator';

// Generate e-invoice JSON
const eInvoice = await generateEInvoiceJSON(invoiceId);

// Validate before submission
const validation = validateEInvoiceJSON(eInvoice);

if (!validation.isValid) {
  console.error('E-invoice validation failed:', validation.errors);
  return;
}

// Save JSON file for submission
const filePath = await saveEInvoiceJSON(invoiceId, eInvoice);

console.log(`E-invoice JSON saved to: ${filePath}`);

// After successful submission to GST portal, update with IRN
await updateInvoiceWithIRN(
  invoiceId,
  '1a2b3c4d5e6f...', // IRN from portal
  'ACK12345', // Acknowledgment number
  new Date() // Acknowledgment date
);
```

### 2.4 E-Invoice JSON Structure

```json
{
  "Version": "1.1",
  "TranDtls": {
    "TaxSch": "GST",
    "SupTyp": "B2B",
    "RegRev": "N"
  },
  "DocDtls": {
    "Typ": "INV",
    "No": "INV/26/00100",
    "Dt": "12/02/2026"
  },
  "SellerDtls": {
    "Gstin": "27ABCDE1234F1Z5",
    "LglNm": "National Pipe & Supply",
    "Addr1": "Plot No. 123, Industrial Area",
    "Loc": "Solapur",
    "Pin": 413006,
    "Stcd": "27"
  },
  "BuyerDtls": {
    "Gstin": "24AABCR1234E1ZX",
    "LglNm": "Reliance Industries Limited",
    "Pos": "24",
    "Addr1": "Refinery Complex",
    "Loc": "Jamnagar",
    "Pin": 361280,
    "Stcd": "24"
  },
  "ItemList": [
    {
      "SlNo": "1",
      "PrdDesc": "SMLS Pipe ASTM A106 GR.B 168.3x7.11mm",
      "IsServc": "N",
      "HsnCd": "7304",
      "Qty": 500,
      "Unit": "MTR",
      "UnitPrice": 115.00,
      "TotAmt": 57500.00,
      "AssAmt": 57500.00,
      "GstRt": 18,
      "IgstAmt": 10350.00,
      "TotItemVal": 67850.00
    }
  ],
  "ValDtls": {
    "AssVal": 57500.00,
    "IgstVal": 10350.00,
    "TotInvVal": 67850.00
  }
}
```

### 2.5 GST State Codes

| State | Code | State | Code |
|-------|------|-------|------|
| Maharashtra | 27 | Gujarat | 24 |
| Delhi | 07 | Karnataka | 29 |
| Tamil Nadu | 33 | Uttar Pradesh | 09 |

*Full list available in GST portal documentation*

### 2.6 Workflow

1. **Generate JSON** - When invoice is finalized
2. **Validate** - Check all mandatory fields and format
3. **Save File** - Store JSON for submission
4. **Submit to Portal** - Use GST portal API or manual upload
5. **Receive IRN** - Portal returns IRN and Ack details
6. **Update Invoice** - Store IRN, Ack No, and Ack Date

---

## 3. Data Migration Scripts

### 3.1 Overview

**Purpose:** Migrate existing master data from Excel files to PostgreSQL database with validation and error reporting.

**Implementation Location:** `scripts/migration/`

### 3.2 Available Migration Scripts

- `migrate-customers.ts` - Customer master migration
- `migrate-vendors.ts` - Vendor master migration (similar pattern)
- `migrate-inventory.ts` - Existing inventory with heat numbers
- `validate-migration.ts` - Post-migration validation

### 3.3 Customer Migration Features

- Reads Excel file (.xlsx, .xls)
- Handles header variations (trailing spaces, line breaks)
- Cleans and normalizes data
- Validates:
  - Customer name (required, min 3 chars)
  - Email format
  - GST number format (15 chars, specific pattern)
  - PAN number format (10 chars, 5 letters + 4 digits + 1 letter)
  - Phone number (Indian format)
- Skips duplicates (by code or name)
- Generates customer code if missing
- Creates detailed error report
- 100% accuracy validation (PRD requirement)

### 3.4 Usage

```bash
# Migrate customers
npx ts-node scripts/migration/migrate-customers.ts path/to/customers.xlsx

# Output:
# === Customer Data Migration Started ===
#
# Processing row 2: Reliance Industries Ltd.
#   ✅ Customer created successfully
#
# Processing row 3: BHEL
#   ✅ Customer created successfully
#
# Processing row 4: Tata Steel Ltd.
#   ⚠️  Customer already exists. Skipping.
#
# Processing row 5: Invalid Corp
#   ❌ Validation failed: Invalid GST number format: 12INVALID123
#
# === Migration Summary ===
# Total rows: 50
# ✅ Success: 45
# ⚠️  Skipped (duplicates): 3
# ❌ Failed: 2
#
# 📄 Validation report saved to: migration-reports/customer-migration-1739347200000.json
```

### 3.5 Excel Format Expected

| Customer Code | Customer Name | Contact Person | Address | City | State | Pincode | Phone | Email | GST Number | PAN Number | Credit Limit | Payment Terms | Type |
|---------------|---------------|----------------|---------|------|-------|---------|-------|-------|------------|------------|--------------|---------------|------|
| CUST-001 | Reliance Industries Ltd. | Rajesh Kumar | Refinery Complex | Jamnagar | Gujarat | 361280 | 9876543210 | rajesh@ril.com | 24AABCR1234E1ZX | AABCR1234E | 5000000 | 30 days | Domestic |
| CUST-002 | BHEL | Amit Sharma | Plant Area | Bhopal | Madhya Pradesh | 462021 | 9123456789 | amit@bhel.com | 23AABCB1234G1ZY | AABCB1234G | 3000000 | 45 days | Domestic |

**Note:** Excel files from `E:\erp\documents\` can be used directly.

### 3.6 Validation Report Format

```json
{
  "total": 50,
  "success": 45,
  "failed": 2,
  "skipped": 3,
  "errors": [
    {
      "row": 5,
      "name": "Invalid Corp",
      "errors": [
        "Invalid GST number format: 12INVALID123"
      ]
    },
    {
      "row": 12,
      "name": "Test Company",
      "errors": [
        "Invalid email format: invalid-email",
        "Invalid PAN number format: ABCD1234"
      ]
    }
  ]
}
```

---

## 4. Auto PR Generation from SO Shortfall

### 4.1 Overview

**Purpose:** Automatically create Purchase Requisitions when Sales Order cannot be fully reserved from available inventory.

**Implementation Location:** `src/lib/business-logic/auto-pr-generation.ts`

### 4.2 Workflow

1. **Sales Order Created** - User reserves inventory for SO
2. **Shortfall Detection** - System detects insufficient stock
3. **Analysis** - Calculate shortfall per item
4. **Threshold Check** - Verify if auto-generation criteria met
5. **PR Creation** - Auto-generate PR with shortfall quantities
6. **Notification** - Alert purchase team
7. **Approval** - Purchase team reviews and approves PR

### 4.3 Shortfall Analysis

```typescript
interface ShortfallItem {
  productSpecId: string;
  product: string; // "SMLS Pipe"
  material: string; // "ASTM A106 GR.B"
  sizeId: string;
  sizeLabel: string; // "168.3 x 7.11mm"
  requiredQty: number; // 500 Mtr (from SO)
  availableQty: number; // 200 Mtr (in inventory)
  shortfallQty: number; // 300 Mtr (need to purchase)
}
```

### 4.4 Auto-Generation Criteria

| Criteria | Default Value | Configurable |
|----------|---------------|--------------|
| Enable Auto-generation | true | Yes |
| Minimum Shortfall Qty | 10 units | Yes |
| Maximum Shortfall Value | ₹5,00,000 | Yes |

**Auto-generation triggers if:**
- Feature enabled in config
- Shortfall quantity ≥ minimum threshold
- Shortfall value ≤ maximum threshold (prevents large auto-PRs)

### 4.5 Usage Example

```typescript
import { handleAutoGeneratePR } from '@/lib/business-logic/auto-pr-generation';

// When reserving inventory for SO
const result = await handleAutoGeneratePR(
  salesOrderId,
  userId,
  {
    autoSubmitForApproval: true, // Optional: submit immediately
    ipAddress: getIpAddress(headers),
    userAgent: getUserAgent(headers),
  }
);

if (result.success) {
  console.log(`✅ ${result.message}`);
  console.log(`   PR Number: ${result.prNo}`);
  console.log(`   Items: ${result.itemCount}`);
} else {
  console.log(`⚠️  ${result.message}`);
}

// Returns:
// {
//   success: true,
//   message: "PR PR/26/00050 generated successfully",
//   prId: "uuid-123",
//   prNo: "PR/26/00050",
//   itemCount: 3,
//   analysis: { /* shortfall details */ }
// }
```

### 4.6 API Integration

```typescript
// In SO reservation API endpoint
export async function POST(request: NextRequest) {
  const { salesOrderId, reservations } = await request.json();

  // Attempt to reserve inventory
  const reservationResult = await reserveInventory(salesOrderId, reservations);

  if (reservationResult.hasShortfall) {
    // Auto-generate PR for shortfall
    const prResult = await handleAutoGeneratePR(salesOrderId, session.user.id);

    return NextResponse.json({
      message: 'Partial reservation successful. PR generated for shortfall.',
      reservations: reservationResult.reserved,
      shortfall: reservationResult.shortfall,
      prGenerated: prResult.success,
      prNo: prResult.prNo,
    });
  }

  return NextResponse.json({
    message: 'Inventory reserved successfully',
    reservations: reservationResult.reserved,
  });
}
```

### 4.7 Notification Email

When PR is auto-generated, purchase team receives:

```
Subject: Auto-Generated PR PR/26/00050 - Requires Review

Dear Purchase Team,

A Purchase Requisition has been automatically generated due to inventory shortfall:

PR Number: PR/26/00050
Triggered by: Sales Order SO/26/00025
Customer: Reliance Industries Ltd.
Items: 3

Item Details:
1. SMLS Pipe ASTM A106 GR.B 168.3x7.11mm - Shortfall: 300 Mtr
2. CS Elbow 90° ASTM A234 WPB 168.3mm - Shortfall: 50 Nos
3. CS Tee ASTM A234 WPB 219.1mm - Shortfall: 30 Nos

Please review and process this PR at your earliest convenience.

View PR: https://erp.nps.com/purchase/pr/PR-26-00050

Regards,
NPS ERP System
```

---

## 5. Integration Guide

### 5.1 PO Variance Detection Integration

**When to Call:**
- During PO creation from quotation
- Before PO approval
- When PO is modified

**API Route:** `/api/purchase-orders`

```typescript
import { detectPOVariances, generateVarianceReportText } from '@/lib/business-logic/po-variance-detection';

export async function POST(request: NextRequest) {
  // ... create PO logic ...

  if (quotationId) {
    const variances = await detectPOVariances(quotationId, items, totalAmount);

    if (variances.requiresApproval) {
      // Set status to PENDING_APPROVAL
      await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'PENDING_APPROVAL' },
      });

      // Store variance report
      await prisma.poVarianceReport.create({
        data: {
          poId: po.id,
          quotationId,
          varianceReport: JSON.stringify(variances),
          requiresApproval: true,
        },
      });

      // Send notification
      await sendVarianceNotification(po.poNo, variances);
    }
  }
}
```

### 5.2 E-Invoice Generation Integration

**When to Call:**
- After invoice is finalized
- Before printing/emailing invoice
- For GST portal submission

**API Route:** `/api/invoices/[id]/generate-einvoice`

```typescript
import { generateEInvoiceJSON, validateEInvoiceJSON, saveEInvoiceJSON } from '@/lib/business-logic/e-invoice-generator';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Generate e-invoice JSON
    const eInvoice = await generateEInvoiceJSON(params.id);

    // Validate
    const validation = validateEInvoiceJSON(eInvoice);
    if (!validation.isValid) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 });
    }

    // Save JSON file
    const filePath = await saveEInvoiceJSON(params.id, eInvoice);

    return NextResponse.json({
      message: 'E-invoice JSON generated successfully',
      filePath,
      eInvoice,
    });
  } catch (error) {
    console.error('E-invoice generation failed:', error);
    return NextResponse.json({ error: 'Failed to generate e-invoice' }, { status: 500 });
  }
}
```

### 5.3 Auto PR Generation Integration

**When to Call:**
- After SO inventory reservation attempt
- When shortfall is detected
- Can be triggered manually by user

**API Route:** `/api/sales-orders/[id]/generate-pr`

```typescript
import { handleAutoGeneratePR } from '@/lib/business-logic/auto-pr-generation';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  const result = await handleAutoGeneratePR(
    params.id,
    session.user.id,
    {
      autoSubmitForApproval: true,
      ipAddress: getIpAddress(request.headers),
      userAgent: getUserAgent(request.headers),
    }
  );

  if (result.success) {
    return NextResponse.json({
      message: result.message,
      prId: result.prId,
      prNo: result.prNo,
    });
  }

  return NextResponse.json({
    message: result.message,
    analysis: result.analysis,
  }, { status: 400 });
}
```

---

## 6. Testing

### 6.1 Unit Tests

**Variance Detection:**
```typescript
describe('PO Variance Detection', () => {
  it('should detect unit rate variance', async () => {
    const quotation = createMockQuotation({ unitRate: 100 });
    const poItems = [{ unitRate: 110, quantity: 100 }];

    const variances = await detectPOVariances(quotation.id, poItems, 11000);

    expect(variances.hasVariances).toBe(true);
    expect(variances.items).toHaveLength(1);
    expect(variances.items[0].field).toBe('Unit Rate');
    expect(variances.requiresApproval).toBe(true);
  });

  it('should detect specification mismatch', async () => {
    // Test specification changes
  });
});
```

**E-Invoice Generation:**
```typescript
describe('E-Invoice Generation', () => {
  it('should generate valid e-invoice JSON', async () => {
    const invoice = createMockInvoice();
    const eInvoice = await generateEInvoiceJSON(invoice.id);

    expect(eInvoice.Version).toBe('1.1');
    expect(eInvoice.DocDtls.No).toBe(invoice.invoiceNo);
    expect(eInvoice.ItemList).toHaveLength(invoice.items.length);
  });

  it('should calculate IGST for inter-state transaction', async () => {
    const invoice = createMockInvoice({ buyerState: '24' }); // Gujarat
    const eInvoice = await generateEInvoiceJSON(invoice.id);

    expect(eInvoice.ItemList[0].IgstAmt).toBeGreaterThan(0);
    expect(eInvoice.ItemList[0].CgstAmt).toBeUndefined();
  });
});
```

### 6.2 Integration Tests

Test with actual database:

```bash
# Run migration scripts with test data
npx ts-node scripts/migration/migrate-customers.ts test-data/customers-test.xlsx

# Verify migration
npm run test:migration

# Test auto PR generation
npm run test:integration -- auto-pr-generation

# Test e-invoice generation
npm run test:integration -- e-invoice
```

### 6.3 Manual UAT Testing

Refer to `UAT_TEST_SCENARIOS.md` for detailed test cases.

---

## 7. Summary Checklist

### Implementation Status

- [x] ✅ PO vs Quotation Variance Detection - COMPLETE
- [x] ✅ E-Invoice JSON Generation for GST - COMPLETE
- [x] ✅ Customer Data Migration Script - COMPLETE
- [ ] ⏭️ Vendor Data Migration Script - Template provided
- [x] ✅ Auto PR Generation from SO Shortfall - COMPLETE

### Integration Checklist

- [ ] ⏭️ Add variance detection to PO creation API
- [ ] ⏭️ Add e-invoice generation API endpoint
- [ ] ⏭️ Add auto PR generation to SO reservation flow
- [ ] ⏭️ Test all integrations end-to-end
- [ ] ⏭️ Add error handling and logging
- [ ] ⏭️ Create admin configuration panel for thresholds

### Documentation

- [x] ✅ Implementation guide created
- [x] ✅ Code comments added
- [x] ✅ Usage examples provided
- [x] ✅ API integration examples
- [ ] ⏭️ Add to user training manual
- [ ] ⏭️ Add to admin manual

---

**Document Status:** Implementation complete, integration in progress.

**Next Steps:**
1. Integrate all business logic into API routes
2. Add configuration panel for thresholds
3. Conduct integration testing
4. Update user manuals with new features

---

**Prepared by:** Claude Code Assistant
**Date:** February 12, 2026
