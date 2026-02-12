# Security Implementation Guide - NPS ERP System

**Version:** 1.0
**Date:** February 12, 2026
**PRD Reference:** Section 9.2 (Security Requirements), Section 10 (Mandatory System Controls)

---

## Overview

This document provides implementation details for all critical security features required by the PRD. The security implementations ensure audit trail compliance, data integrity, and access control.

---

## Table of Contents

1. [Audit Logging System](#1-audit-logging-system)
2. [Password Policy Enforcement](#2-password-policy-enforcement)
3. [Mandatory Attachments Validation](#3-mandatory-attachments-validation)
4. [No Deletion of Approved Records](#4-no-deletion-of-approved-records)
5. [Implementation in API Routes](#5-implementation-in-api-routes)
6. [Frontend Integration](#6-frontend-integration)
7. [Testing Security Features](#7-testing-security-features)

---

## 1. Audit Logging System

### 1.1 Overview

**PRD Requirement:** "Complete audit trail for every create/update/delete operation with user, timestamp, and old/new values"

**Implementation Location:**
- `src/lib/audit/audit-logger.ts` - Core audit logging functions
- `src/middleware/audit-middleware.ts` - Middleware for automatic logging

### 1.2 Audit Log Data Model

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  module      String   // QUOTATION, PURCHASE_ORDER, etc.
  action      String   // CREATE, UPDATE, DELETE, APPROVE, etc.
  documentNo  String?  // NPS/26/00100, etc.
  documentId  String?  // Database ID
  description String?  // Human-readable description
  oldValue    String?  @db.Text  // JSON of old values
  newValue    String?  @db.Text  // JSON of new values
  ipAddress   String?
  userAgent   String?
  metadata    String?  @db.Text  // Additional JSON metadata
  timestamp   DateTime @default(now())

  @@index([userId])
  @@index([module])
  @@index([action])
  @@index([documentNo])
  @@index([timestamp])
}
```

### 1.3 Usage in API Routes

**Example: Quotation CREATE operation**

```typescript
import { logCreate, AuditModule, getIpAddress, getUserAgent } from '@/lib/audit/audit-logger';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // ... create quotation logic ...

  const quotation = await prisma.quotation.create({ /* ... */ });

  // Log the creation
  await logCreate(
    session.user.id,
    AuditModule.QUOTATION,
    quotation.quotationNo,
    quotation.id,
    quotation, // Full record data
    getIpAddress(request.headers),
    getUserAgent(request.headers),
    `Created quotation for customer ${quotation.customer.name}`
  );

  return NextResponse.json({ quotation });
}
```

**Example: Quotation UPDATE operation**

```typescript
import { logUpdate, AuditModule, getIpAddress, getUserAgent } from '@/lib/audit/audit-logger';

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // Fetch existing data BEFORE update
  const oldQuotation = await prisma.quotation.findUnique({ where: { id } });

  // ... update logic ...

  const newQuotation = await prisma.quotation.update({ /* ... */ });

  // Log all field changes
  await logUpdate(
    session.user.id,
    AuditModule.QUOTATION,
    oldQuotation.quotationNo,
    oldQuotation.id,
    oldQuotation, // Old data
    newQuotation, // New data
    getIpAddress(request.headers),
    getUserAgent(request.headers),
    ['customerId', 'amount', 'validUpto'] // Optional: only track specific fields
  );

  return NextResponse.json({ quotation: newQuotation });
}
```

**Example: Quotation APPROVE operation**

```typescript
import { logApproval, AuditAction, AuditModule } from '@/lib/audit/audit-logger';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const { comment } = await request.json();

  // ... approval logic ...

  const quotation = await prisma.quotation.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approvedById: session.user.id,
      approvedDate: new Date(),
    },
  });

  // Log approval
  await logApproval(
    session.user.id,
    AuditModule.QUOTATION,
    quotation.quotationNo,
    quotation.id,
    AuditAction.APPROVE,
    comment,
    getIpAddress(request.headers),
    getUserAgent(request.headers)
  );

  return NextResponse.json({ quotation });
}
```

**Example: Login/Logout logging**

```typescript
import { logAuthEvent, AuditAction } from '@/lib/audit/audit-logger';

// In login callback (NextAuth)
callbacks: {
  async signIn({ user, account }) {
    await logAuthEvent(
      user.id,
      AuditAction.LOGIN,
      request.headers.get('x-forwarded-for'),
      request.headers.get('user-agent'),
      {
        provider: account?.provider,
        loginTime: new Date().toISOString(),
      }
    );
    return true;
  },

  async jwt({ token, user }) {
    // Session management
    return token;
  }
}

// In logout API
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  await logAuthEvent(
    session.user.id,
    AuditAction.LOGOUT,
    getIpAddress(request.headers),
    getUserAgent(request.headers),
    {
      logoutTime: new Date().toISOString(),
      sessionDuration: calculateDuration(session),
    }
  );

  // Logout logic
}
```

### 1.4 Querying Audit Logs

**API Endpoint:** `GET /api/audit/logs`

```typescript
import { getAuditLogs } from '@/lib/audit/audit-logger';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // Only admins can view audit logs
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);

  const result = await getAuditLogs({
    userId: searchParams.get('userId') || undefined,
    module: searchParams.get('module') || undefined,
    action: searchParams.get('action') || undefined,
    documentNo: searchParams.get('documentNo') || undefined,
    startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')) : undefined,
    endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')) : undefined,
    limit: parseInt(searchParams.get('limit') || '50'),
    offset: parseInt(searchParams.get('offset') || '0'),
  });

  return NextResponse.json(result);
}
```

---

## 2. Password Policy Enforcement

### 2.1 Overview

**PRD Requirement:** "Password policy (minimum 8 characters, complexity rules, expiry)"

**Implementation Location:** `src/lib/validators/auth.ts`

### 2.2 Password Validation Rules

- **Minimum Length:** 8 characters
- **Uppercase:** At least 1 uppercase letter (A-Z)
- **Lowercase:** At least 1 lowercase letter (a-z)
- **Digit:** At least 1 number (0-9)
- **Special Character:** At least 1 special character (!@#$%^&*...)

### 2.3 Usage in User Registration/Password Change

```typescript
import { validatePassword } from '@/lib/validators/auth';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  // Validate password
  const validation = validatePassword(password);

  if (!validation.isValid) {
    return NextResponse.json(
      {
        error: 'Password does not meet complexity requirements',
        errors: validation.errors,
      },
      { status: 400 }
    );
  }

  // Hash password and create user
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      // ...
    },
  });

  return NextResponse.json({ user });
}
```

### 2.4 Frontend Validation (Real-time Feedback)

```typescript
// In password input component
import { validatePassword } from '@/lib/validators/auth';

const [password, setPassword] = useState('');
const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

const handlePasswordChange = (value: string) => {
  setPassword(value);

  const validation = validatePassword(value);
  setPasswordErrors(validation.errors);
};

return (
  <div>
    <input
      type="password"
      value={password}
      onChange={(e) => handlePasswordChange(e.target.value)}
    />

    {passwordErrors.length > 0 && (
      <div className="text-red-600 text-sm mt-1">
        <p className="font-semibold">Password requirements:</p>
        <ul className="list-disc list-inside">
          {passwordErrors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
);
```

### 2.5 Password Expiry (Optional - Future Enhancement)

Add to User model:

```prisma
model User {
  // ... existing fields
  passwordChangedAt DateTime?
  passwordExpiresAt DateTime?
  mustChangePassword Boolean @default(false)
}
```

Check on login:

```typescript
if (user.passwordExpiresAt && new Date() > user.passwordExpiresAt) {
  return {
    error: 'Password expired. Please reset your password.',
    mustChangePassword: true,
  };
}
```

---

## 3. Mandatory Attachments Validation

### 3.1 Overview

**PRD Requirement:** "MTC must be uploaded at GRN, Inspection report at QC release - System blocks progress without attachment"

**Implementation Location:** `src/lib/validators/business-rules.ts`

### 3.2 Validation Rules

| Entity | Mandatory Attachment | When Required |
|--------|---------------------|---------------|
| GRN | MTC (Material Test Certificate) | Before GRN creation/submission |
| GRN | TPI Certificate (optional) | If third-party inspection done |
| Inspection | Inspection Report Document | Before marking result as PASS/FAIL |
| Inspection | Evidence Photos | Recommended for FAIL results |
| NCR | Evidence Documents | Before NCR creation |

### 3.3 Usage in GRN API

```typescript
import { validateMandatoryAttachments } from '@/lib/validators/business-rules';

export async function POST(request: NextRequest) {
  const { poId, mtcNo, mtcDocument, /* ... */ } = await request.json();

  // Create GRN first (draft state)
  const grn = await prisma.gRN.create({
    data: {
      poId,
      mtcNo,
      mtcDocument,
      status: 'DRAFT',
      // ...
    },
  });

  // Validate mandatory attachments before finalizing
  const validation = await validateMandatoryAttachments('GRN', grn.id);

  if (!validation.isValid) {
    return NextResponse.json(
      {
        error: 'Missing mandatory attachments',
        errors: validation.errors,
        grn, // Return draft GRN so user can add attachments
      },
      { status: 400 }
    );
  }

  // If validation passes, mark as submitted
  const updatedGRN = await prisma.gRN.update({
    where: { id: grn.id },
    data: { status: 'SUBMITTED' },
  });

  return NextResponse.json({ grn: updatedGRN });
}
```

### 3.4 Usage in Inspection API

```typescript
export async function PUT(request: NextRequest) {
  const { overallResult, reportDocument /* ... */ } = await request.json();

  // Update inspection
  const inspection = await prisma.inspection.update({
    where: { id },
    data: {
      overallResult,
      reportDocument,
      // ...
    },
  });

  // Validate attachments before releasing result
  if (overallResult === 'PASS' || overallResult === 'FAIL') {
    const validation = await validateMandatoryAttachments('INSPECTION', inspection.id);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Cannot release inspection result without report document',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Auto-update inventory status based on result
    if (overallResult === 'PASS') {
      await prisma.inventory.updateMany({
        where: { grnId: inspection.grnId },
        data: { status: 'ACCEPTED' },
      });
    } else {
      await prisma.inventory.updateMany({
        where: { grnId: inspection.grnId },
        data: { status: 'REJECTED' },
      });
    }
  }

  return NextResponse.json({ inspection });
}
```

### 3.5 Frontend Validation (Pre-submission Check)

```typescript
// In GRN form component
const handleSubmit = async () => {
  // Client-side pre-check
  if (!formData.mtcDocument) {
    toast.error('MTC document is mandatory. Please upload MTC before submitting GRN.');
    return;
  }

  if (!formData.mtcNo) {
    toast.error('MTC number is required for traceability.');
    return;
  }

  // Submit to API
  const response = await fetch('/api/grn', {
    method: 'POST',
    body: JSON.stringify(formData),
  });

  if (!response.ok) {
    const error = await response.json();
    toast.error(error.errors?.join(', ') || error.error);
    return;
  }

  toast.success('GRN created successfully');
};
```

---

## 4. No Deletion of Approved Records

### 4.1 Overview

**PRD Requirement:** "Approved quotations, POs, invoices cannot be deleted - Only void/cancel with reason"

**Implementation Location:** `src/lib/validators/business-rules.ts`

### 4.2 Deletion Rules

| Entity | Can Delete? | Conditions |
|--------|------------|------------|
| Quotation (DRAFT) | ✅ Yes | Only if no SOs linked |
| Quotation (APPROVED) | ❌ No | Use "Void" or "Create Revision" |
| Purchase Order (DRAFT) | ✅ Yes | Only if no GRNs |
| Purchase Order (APPROVED/ISSUED) | ❌ No | Use "Cancel PO" with reason |
| Sales Order | ❌ No | If dispatched or invoiced |
| Invoice | ❌ NEVER | Use "Credit Note" for corrections |
| GRN | ❌ No | If inspected or in inventory |

### 4.3 Usage in DELETE API Routes

```typescript
import { canDeleteRecord } from '@/lib/validators/business-rules';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  // Validate if deletion is allowed
  const validation = await canDeleteRecord('QUOTATION', params.id);

  if (!validation.isValid) {
    return NextResponse.json(
      {
        error: 'Cannot delete record',
        reasons: validation.errors,
        suggestion: 'Use "Void" or "Cancel" action instead with a reason.',
      },
      { status: 400 }
    );
  }

  // Fetch record before deletion (for audit log)
  const quotation = await prisma.quotation.findUnique({
    where: { id: params.id },
    include: { items: true, terms: true },
  });

  // Delete record
  await prisma.quotation.delete({ where: { id: params.id } });

  // Log deletion
  await logDelete(
    session.user.id,
    AuditModule.QUOTATION,
    quotation.quotationNo,
    quotation.id,
    quotation,
    'User deleted draft quotation',
    getIpAddress(request.headers),
    getUserAgent(request.headers)
  );

  return NextResponse.json({ message: 'Quotation deleted successfully' });
}
```

### 4.4 Alternative: VOID/CANCEL Actions

Instead of DELETE, implement VOID/CANCEL:

```typescript
// POST /api/quotations/[id]/void
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const { reason } = await request.json();

  if (!reason || reason.length < 10) {
    return NextResponse.json(
      { error: 'Void reason must be at least 10 characters' },
      { status: 400 }
    );
  }

  const quotation = await prisma.quotation.update({
    where: { id: params.id },
    data: {
      status: 'VOID',
      voidReason: reason,
      voidedBy: session.user.id,
      voidedAt: new Date(),
    },
  });

  // Log void action
  await logAudit({
    userId: session.user.id,
    module: AuditModule.QUOTATION,
    action: AuditAction.VOID,
    documentNo: quotation.quotationNo,
    documentId: quotation.id,
    description: `Voided quotation: ${reason}`,
    metadata: { reason, voidedAt: new Date().toISOString() },
    ipAddress: getIpAddress(request.headers),
    userAgent: getUserAgent(request.headers),
  });

  return NextResponse.json({ quotation });
}
```

### 4.5 Frontend: Hide Delete Button for Approved Records

```typescript
// In quotation detail page
const canDelete = quotation.status === 'DRAFT' && quotation.salesOrders.length === 0;

return (
  <div>
    {canDelete ? (
      <button onClick={handleDelete} className="btn-danger">
        Delete Quotation
      </button>
    ) : (
      <button onClick={handleVoid} className="btn-warning">
        Void Quotation
      </button>
    )}
  </div>
);
```

---

## 5. Implementation in API Routes

### 5.1 API Routes Requiring Audit Logging

All API routes for the following modules MUST implement audit logging:

- ✅ `/api/quotations/*` - CREATE, UPDATE, DELETE, APPROVE
- ✅ `/api/sales-orders/*` - CREATE, UPDATE, STATUS_CHANGE
- ✅ `/api/purchase-orders/*` - CREATE, UPDATE, APPROVE, CANCEL
- ✅ `/api/purchase-requisitions/*` - CREATE, UPDATE, APPROVE
- ✅ `/api/grn/*` - CREATE, UPDATE
- ✅ `/api/inventory/*` - CREATE, UPDATE, STATUS_CHANGE
- ✅ `/api/inspections/*` - CREATE, UPDATE (result change)
- ✅ `/api/ncr/*` - CREATE, UPDATE, STATUS_CHANGE
- ✅ `/api/dispatch/*` - CREATE
- ✅ `/api/invoices/*` - CREATE, UPDATE
- ✅ `/api/payments/*` - CREATE
- ✅ `/api/users/*` - CREATE, UPDATE, DELETE
- ✅ `/api/customers/*` - CREATE, UPDATE
- ✅ `/api/vendors/*` - CREATE, UPDATE

### 5.2 Standard Pattern for All API Routes

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logCreate, logUpdate, logDelete, AuditModule, getIpAddress, getUserAgent } from '@/lib/audit/audit-logger';
import { canDeleteRecord } from '@/lib/validators/business-rules';

// POST - Create
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  // Business logic
  const record = await prisma.entity.create({ data: body });

  // Audit log
  await logCreate(
    session.user.id,
    AuditModule.ENTITY_NAME,
    record.entityNo,
    record.id,
    record,
    getIpAddress(request.headers),
    getUserAgent(request.headers)
  );

  return NextResponse.json({ record });
}

// PUT - Update
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch old data
  const oldRecord = await prisma.entity.findUnique({ where: { id } });

  // Update
  const newRecord = await prisma.entity.update({ where: { id }, data: body });

  // Audit log
  await logUpdate(
    session.user.id,
    AuditModule.ENTITY_NAME,
    oldRecord.entityNo,
    oldRecord.id,
    oldRecord,
    newRecord,
    getIpAddress(request.headers),
    getUserAgent(request.headers)
  );

  return NextResponse.json({ record: newRecord });
}

// DELETE
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Validate deletion
  const validation = await canDeleteRecord('ENTITY_TYPE', id);
  if (!validation.isValid) {
    return NextResponse.json({ error: 'Cannot delete', reasons: validation.errors }, { status: 400 });
  }

  // Fetch before delete
  const record = await prisma.entity.findUnique({ where: { id } });

  // Delete
  await prisma.entity.delete({ where: { id } });

  // Audit log
  await logDelete(
    session.user.id,
    AuditModule.ENTITY_NAME,
    record.entityNo,
    record.id,
    record,
    'Deleted by user',
    getIpAddress(request.headers),
    getUserAgent(request.headers)
  );

  return NextResponse.json({ message: 'Deleted successfully' });
}
```

---

## 6. Frontend Integration

### 6.1 Show Audit Trail to Users

**Audit Trail Component:**

```typescript
// components/audit-trail.tsx
import { useEffect, useState } from 'react';

interface AuditLog {
  id: string;
  timestamp: Date;
  user: { name: string; email: string };
  action: string;
  description: string;
  oldValue?: any;
  newValue?: any;
}

export function AuditTrail({ documentNo }: { documentNo: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs();
  }, [documentNo]);

  const fetchAuditLogs = async () => {
    const response = await fetch(`/api/audit/logs?documentNo=${documentNo}`);
    const data = await response.json();
    setLogs(data.logs);
    setLoading(false);
  };

  if (loading) return <div>Loading audit trail...</div>;

  return (
    <div className="audit-trail">
      <h3 className="text-lg font-semibold mb-4">Audit Trail</h3>
      <div className="space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="border-l-4 border-blue-500 pl-4 py-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{log.description}</p>
                <p className="text-sm text-gray-600">
                  by {log.user.name} ({log.user.email})
                </p>
              </div>
              <p className="text-sm text-gray-500">
                {new Date(log.timestamp).toLocaleString()}
              </p>
            </div>

            {log.action === 'UPDATE' && log.oldValue && log.newValue && (
              <div className="mt-2 text-sm">
                <details>
                  <summary className="cursor-pointer text-blue-600">
                    View Changes
                  </summary>
                  <div className="mt-2 bg-gray-50 p-2 rounded">
                    <p><strong>Old:</strong> {JSON.stringify(log.oldValue)}</p>
                    <p><strong>New:</strong> {JSON.stringify(log.newValue)}</p>
                  </div>
                </details>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Usage in Quotation Detail Page:**

```typescript
import { AuditTrail } from '@/components/audit-trail';

export default function QuotationDetailPage({ params }: { params: { id: string } }) {
  // ... fetch quotation ...

  return (
    <div>
      {/* Quotation details */}
      <div className="quotation-details">
        {/* ... */}
      </div>

      {/* Audit Trail Section */}
      {session.user.role === 'ADMIN' && (
        <div className="mt-8">
          <AuditTrail documentNo={quotation.quotationNo} />
        </div>
      )}
    </div>
  );
}
```

---

## 7. Testing Security Features

### 7.1 Audit Logging Tests

```typescript
// __tests__/audit-logging.test.ts
import { logCreate, logUpdate, AuditModule } from '@/lib/audit/audit-logger';
import { prisma } from '@/lib/prisma';

describe('Audit Logging', () => {
  it('should log CREATE operation', async () => {
    await logCreate(
      'user-id-123',
      AuditModule.QUOTATION,
      'NPS/26/00100',
      'quotation-id-123',
      { customer: 'Test Corp', amount: 10000 },
      '192.168.1.1',
      'Mozilla/5.0'
    );

    const log = await prisma.auditLog.findFirst({
      where: { documentNo: 'NPS/26/00100' },
    });

    expect(log).toBeTruthy();
    expect(log.action).toBe('CREATE');
    expect(log.module).toBe('QUOTATION');
  });

  it('should log field changes on UPDATE', async () => {
    const oldData = { amount: 10000, validUpto: '2026-03-01' };
    const newData = { amount: 12000, validUpto: '2026-03-15' };

    await logUpdate(
      'user-id-123',
      AuditModule.QUOTATION,
      'NPS/26/00100',
      'quotation-id-123',
      oldData,
      newData
    );

    const logs = await prisma.auditLog.findMany({
      where: { documentNo: 'NPS/26/00100', action: 'UPDATE' },
    });

    expect(logs.length).toBeGreaterThan(0);
    // Should log both field changes
    expect(logs.some(l => JSON.parse(l.newValue).amount === 12000)).toBe(true);
  });
});
```

### 7.2 Business Rules Validation Tests

```typescript
// __tests__/business-rules.test.ts
import { canDeleteRecord, validateMandatoryAttachments } from '@/lib/validators/business-rules';

describe('Business Rules', () => {
  it('should prevent deletion of approved quotation', async () => {
    // Create approved quotation
    const quotation = await prisma.quotation.create({
      data: { /* ... */ status: 'APPROVED' },
    });

    const validation = await canDeleteRecord('QUOTATION', quotation.id);

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Cannot delete approved quotation');
  });

  it('should require MTC for GRN', async () => {
    const grn = await prisma.gRN.create({
      data: { /* ... */ mtcNo: null, mtcDocument: null },
    });

    const validation = await validateMandatoryAttachments('GRN', grn.id);

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('MTC (Material Test Certificate) is mandatory');
  });
});
```

### 7.3 Manual UAT Testing

**Test Scenario: Audit Trail Verification (UAT-012)**

1. Create a draft quotation
2. Verify CREATE log entry exists
3. Update the quotation (change amount)
4. Verify UPDATE log shows old and new values
5. Submit for approval
6. Verify SUBMIT_FOR_APPROVAL log
7. Approve quotation
8. Verify APPROVE log with approver details
9. Try to delete approved quotation
10. Verify deletion is blocked
11. Export audit trail to Excel
12. Verify all actions are logged

**Test Scenario: Mandatory Attachments**

1. Try to create GRN without MTC
2. Verify error message displayed
3. Upload MTC document
4. Submit GRN successfully
5. Try to release inspection without report
6. Verify error message
7. Upload inspection report
8. Release inspection successfully

---

## 8. Summary Checklist

### Implementation Checklist

- [ ] ✅ Audit logging system created (`audit-logger.ts`)
- [ ] ✅ Password validation created (`validators/auth.ts`)
- [ ] ✅ Business rules validation created (`validators/business-rules.ts`)
- [ ] ⏭️ Update all API routes to include audit logging
- [ ] ⏭️ Add password validation to user registration/change password forms
- [ ] ⏭️ Add mandatory attachment checks to GRN and Inspection forms
- [ ] ⏭️ Hide delete buttons for approved records in frontend
- [ ] ⏭️ Add "Void" and "Cancel" actions as alternatives to delete
- [ ] ⏭️ Create audit trail viewer component for admins
- [ ] ⏭️ Write unit tests for all security features
- [ ] ⏭️ Conduct UAT-012 (Audit Trail verification)

### API Routes to Update (Priority Order)

**High Priority (Core Business Operations):**
1. `/api/quotations/*` - Most frequently used
2. `/api/sales-orders/*`
3. `/api/purchase-orders/*`
4. `/api/grn/*`
5. `/api/invoices/*`

**Medium Priority:**
6. `/api/inspections/*`
7. `/api/dispatch/*`
8. `/api/inventory/*`
9. `/api/purchase-requisitions/*`

**Low Priority (Less frequent):**
10. `/api/ncr/*`
11. `/api/customers/*`
12. `/api/vendors/*`
13. `/api/users/*`

---

**Document Status:** Implementation guide complete. Code utilities created. API route updates in progress.

**Next Steps:**
1. Systematically update all API routes with audit logging
2. Add validation to frontend forms
3. Test all security features
4. Conduct UAT-012

---

**Prepared by:** Claude Code Assistant
**Date:** February 12, 2026
