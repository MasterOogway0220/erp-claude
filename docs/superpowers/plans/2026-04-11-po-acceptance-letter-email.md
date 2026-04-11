# PO Acceptance Letter PDF & Email — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-generate a PO Acceptance Letter on ISSUED status, allow PDF download, and enable emailing it to the client with a preview dialog.

**Architecture:** HTML template generates the acceptance letter. PUT handler triggers generation on status change. Separate PDF and email API endpoints serve the letter. Email follows the existing Nodemailer + EmailLog pattern from quotations. Detail page gets Download PDF, Send to Client, and Email History UI.

**Tech Stack:** Next.js 16, Prisma, Nodemailer, HTML-based PDF (browser print), date-fns

**Spec:** `docs/superpowers/specs/2026-04-11-po-acceptance-letter-email-design.md`

---

## File Map

### New Files
| File | Purpose |
|------|---------|
| `src/lib/pdf/po-acceptance-template.ts` | HTML template for PO Acceptance Letter |
| `src/app/api/po-acceptance/[id]/pdf/route.ts` | GET endpoint — returns acceptance letter HTML for download/print |
| `src/app/api/po-acceptance/[id]/email/route.tsx` | POST endpoint — emails acceptance letter to client via Nodemailer |
| `src/app/api/po-acceptance/[id]/emails/route.ts` | GET endpoint — fetches email logs for this acceptance |

### Modified Files
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add `generatedPath` to POAcceptance, add `POAcceptanceEmailLog` model, add reverse relations |
| `src/app/api/po-acceptance/[id]/route.ts` | Flag generation on ISSUED in PUT handler |
| `src/app/(dashboard)/po-acceptance/[id]/page.tsx` | Add Download PDF button, Send to Client dialog, Email History section |

---

## Task 1: Schema — POAcceptanceEmailLog + generatedPath

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `generatedPath` to POAcceptance model**

Find the `POAcceptance` model (around line 2734). Add after `attachmentUrl`:

```prisma
  generatedPath         String?
```

- [ ] **Step 2: Add `emailLogs` relation to POAcceptance**

In the POAcceptance model, add at the end of the relations section:

```prisma
  emailLogs           POAcceptanceEmailLog[]
```

- [ ] **Step 3: Add POAcceptanceEmailLog model**

Add at the end of the schema file:

```prisma
model POAcceptanceEmailLog {
  id               String         @id @default(cuid())
  poAcceptanceId   String
  sentTo           String
  sentCc           String?
  subject          String
  messageBody      String         @db.Text
  sentById         String?
  sentAt           DateTime       @default(now())
  status           EmailLogStatus
  errorMessage     String?        @db.Text

  poAcceptance POAcceptance @relation(fields: [poAcceptanceId], references: [id])
  sentBy       User?        @relation("POAEmailSentBy", fields: [sentById], references: [id])

  @@index([poAcceptanceId])
  @@index([sentById])
}
```

- [ ] **Step 4: Add reverse relation on User**

In the `User` model, add:

```prisma
  poaEmailsSent         POAcceptanceEmailLog[]  @relation("POAEmailSentBy")
```

- [ ] **Step 5: Validate and push schema**

```bash
npx prisma validate
npx prisma db push
```

- [ ] **Step 6: Commit**

```bash
git add prisma/
git commit -m "feat: add POAcceptanceEmailLog model and generatedPath field"
```

---

## Task 2: PO Acceptance Letter HTML Template

**Files:**
- Create: `src/lib/pdf/po-acceptance-template.ts`

- [ ] **Step 1: Create the template file**

Create `src/lib/pdf/po-acceptance-template.ts`:

```typescript
// PO Acceptance Letter PDF Template — Portrait A4

interface CompanyInfo {
  companyName: string;
  regAddressLine1?: string | null;
  regAddressLine2?: string | null;
  regCity?: string | null;
  regPincode?: string | null;
  regState?: string | null;
  regCountry?: string | null;
  telephoneNo?: string | null;
  email?: string | null;
  website?: string | null;
  companyLogoUrl?: string | null;
}

interface CustomerInfo {
  name: string;
  contactPerson?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  email?: string | null;
  phone?: string | null;
  gstNo?: string | null;
}

interface POAcceptanceData {
  acceptanceNo: string;
  acceptanceDate: string | Date;
  committedDeliveryDate: string | Date;
  remarks?: string | null;
  followUpName?: string | null;
  followUpEmail?: string | null;
  followUpPhone?: string | null;
  qualityName?: string | null;
  qualityEmail?: string | null;
  qualityPhone?: string | null;
  accountsName?: string | null;
  accountsEmail?: string | null;
  accountsPhone?: string | null;
  clientPO: {
    cpoNo: string;
    clientPoNumber: string;
    clientPoDate?: string | Date | null;
    projectName?: string | null;
    paymentTerms?: string | null;
    deliveryTerms?: string | null;
    currency: string;
    subtotal?: number | null;
    grandTotal?: number | null;
  };
  items: {
    sNo: number;
    product?: string | null;
    material?: string | null;
    additionalSpec?: string | null;
    sizeLabel?: string | null;
    ends?: string | null;
    uom?: string | null;
    qtyOrdered: number;
    unitRate: number;
    amount: number;
  }[];
  customer: CustomerInfo;
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatCurrency(value: number | null | undefined, currency: string): string {
  if (value === null || value === undefined) return "";
  const symbol = currency === "INR" ? "₹" : currency + " ";
  return `${symbol}${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generatePOAcceptanceLetterHtml(
  data: POAcceptanceData,
  company: CompanyInfo
): string {
  const companyAddress = [
    company.regAddressLine1,
    company.regAddressLine2,
    company.regCity,
    company.regState ? `${company.regState} - ${company.regPincode || ""}` : company.regPincode,
    company.regCountry,
  ].filter(Boolean).join(", ");

  const customerAddress = [
    data.customer.addressLine1,
    data.customer.addressLine2,
    data.customer.city,
    data.customer.state,
  ].filter(Boolean).join(", ");

  const currency = data.clientPO.currency || "INR";

  const itemRows = data.items.map((item) => `
    <tr>
      <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${item.sNo}</td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;">
        ${escapeHtml(item.product) || "-"}
        ${item.material ? `<br><span style="font-size:11px;color:#666;">${escapeHtml(item.material)}${item.additionalSpec ? ` / ${escapeHtml(item.additionalSpec)}` : ""}</span>` : ""}
      </td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${escapeHtml(item.sizeLabel) || "-"}</td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${item.qtyOrdered}</td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${escapeHtml(item.uom) || "-"}</td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:right;">${formatCurrency(item.unitRate, currency)}</td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:right;">${formatCurrency(item.amount, currency)}</td>
    </tr>
  `).join("");

  const contactRows: string[] = [];
  if (data.followUpName) {
    contactRows.push(`<tr><td style="padding:4px 8px;border:1px solid #d1d5db;">Follow-up</td><td style="padding:4px 8px;border:1px solid #d1d5db;">${escapeHtml(data.followUpName)}</td><td style="padding:4px 8px;border:1px solid #d1d5db;">${escapeHtml(data.followUpEmail)}</td><td style="padding:4px 8px;border:1px solid #d1d5db;">${escapeHtml(data.followUpPhone)}</td></tr>`);
  }
  if (data.qualityName) {
    contactRows.push(`<tr><td style="padding:4px 8px;border:1px solid #d1d5db;">Quality</td><td style="padding:4px 8px;border:1px solid #d1d5db;">${escapeHtml(data.qualityName)}</td><td style="padding:4px 8px;border:1px solid #d1d5db;">${escapeHtml(data.qualityEmail)}</td><td style="padding:4px 8px;border:1px solid #d1d5db;">${escapeHtml(data.qualityPhone)}</td></tr>`);
  }
  if (data.accountsName) {
    contactRows.push(`<tr><td style="padding:4px 8px;border:1px solid #d1d5db;">Accounts</td><td style="padding:4px 8px;border:1px solid #d1d5db;">${escapeHtml(data.accountsName)}</td><td style="padding:4px 8px;border:1px solid #d1d5db;">${escapeHtml(data.accountsEmail)}</td><td style="padding:4px 8px;border:1px solid #d1d5db;">${escapeHtml(data.accountsPhone)}</td></tr>`);
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PO Acceptance Letter - ${escapeHtml(data.acceptanceNo)}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    @media print { body { margin: 0; } }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.5; }
    table { border-collapse: collapse; width: 100%; }
    .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 12px; margin-bottom: 20px; }
    .header h1 { font-size: 20px; color: #1e40af; margin: 0 0 4px; }
    .header p { font-size: 11px; color: #64748b; margin: 2px 0; }
    .section-title { font-size: 14px; font-weight: bold; color: #1e40af; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin: 20px 0 10px; }
    .info-grid { display: flex; justify-content: space-between; margin-bottom: 16px; }
    .info-block { width: 48%; }
    .info-block p { margin: 2px 0; font-size: 12px; }
    .info-label { font-weight: bold; color: #475569; }
    .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(company.companyName)}</h1>
    <p>${escapeHtml(companyAddress)}</p>
    ${company.telephoneNo ? `<p>Tel: ${escapeHtml(company.telephoneNo)} | Email: ${escapeHtml(company.email)}</p>` : ""}
    ${company.website ? `<p>${escapeHtml(company.website)}</p>` : ""}
  </div>

  <h2 style="text-align:center;font-size:16px;color:#1e293b;margin:0 0 20px;">PURCHASE ORDER ACCEPTANCE</h2>

  <div class="info-grid">
    <div class="info-block">
      <p><span class="info-label">To:</span></p>
      <p><strong>${escapeHtml(data.customer.name)}</strong></p>
      ${data.customer.contactPerson ? `<p>Attn: ${escapeHtml(data.customer.contactPerson)}</p>` : ""}
      <p>${escapeHtml(customerAddress)}</p>
      ${data.customer.gstNo ? `<p>GSTIN: ${escapeHtml(data.customer.gstNo)}</p>` : ""}
    </div>
    <div class="info-block" style="text-align:right;">
      <p><span class="info-label">Acceptance No:</span> ${escapeHtml(data.acceptanceNo)}</p>
      <p><span class="info-label">Date:</span> ${formatDate(data.acceptanceDate)}</p>
      <p><span class="info-label">Your PO No:</span> ${escapeHtml(data.clientPO.clientPoNumber)}</p>
      ${data.clientPO.clientPoDate ? `<p><span class="info-label">PO Date:</span> ${formatDate(data.clientPO.clientPoDate)}</p>` : ""}
      ${data.clientPO.projectName ? `<p><span class="info-label">Project:</span> ${escapeHtml(data.clientPO.projectName)}</p>` : ""}
      <p><span class="info-label">Our Ref:</span> ${escapeHtml(data.clientPO.cpoNo)}</p>
    </div>
  </div>

  <p>Dear ${escapeHtml(data.customer.contactPerson) || "Sir/Madam"},</p>
  <p>We acknowledge receipt of your Purchase Order No. <strong>${escapeHtml(data.clientPO.clientPoNumber)}</strong>${data.clientPO.clientPoDate ? ` dated <strong>${formatDate(data.clientPO.clientPoDate)}</strong>` : ""} and are pleased to confirm our acceptance of the same.</p>
  <p>The committed delivery date for this order is <strong>${formatDate(data.committedDeliveryDate)}</strong>.</p>

  <div class="section-title">Order Details</div>
  <table>
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;width:40px;">S.No</th>
        <th style="padding:6px 8px;border:1px solid #d1d5db;">Product Description</th>
        <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">Size</th>
        <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">Qty</th>
        <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">UOM</th>
        <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:right;">Rate</th>
        <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
    <tfoot>
      <tr style="background:#f8fafc;font-weight:bold;">
        <td colspan="6" style="padding:6px 8px;border:1px solid #d1d5db;text-align:right;">Total:</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:right;">${formatCurrency(data.clientPO.grandTotal, currency)}</td>
      </tr>
    </tfoot>
  </table>

  ${data.clientPO.paymentTerms || data.clientPO.deliveryTerms ? `
  <div class="section-title">Terms</div>
  <table>
    ${data.clientPO.paymentTerms ? `<tr><td style="padding:4px 8px;width:140px;font-weight:bold;">Payment Terms:</td><td style="padding:4px 8px;">${escapeHtml(data.clientPO.paymentTerms)}</td></tr>` : ""}
    ${data.clientPO.deliveryTerms ? `<tr><td style="padding:4px 8px;width:140px;font-weight:bold;">Delivery Terms:</td><td style="padding:4px 8px;">${escapeHtml(data.clientPO.deliveryTerms)}</td></tr>` : ""}
  </table>
  ` : ""}

  ${contactRows.length > 0 ? `
  <div class="section-title">Contact Persons</div>
  <table>
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="padding:4px 8px;border:1px solid #d1d5db;">Department</th>
        <th style="padding:4px 8px;border:1px solid #d1d5db;">Name</th>
        <th style="padding:4px 8px;border:1px solid #d1d5db;">Email</th>
        <th style="padding:4px 8px;border:1px solid #d1d5db;">Phone</th>
      </tr>
    </thead>
    <tbody>
      ${contactRows.join("")}
    </tbody>
  </table>
  ` : ""}

  ${data.remarks ? `<p style="margin-top:16px;"><strong>Remarks:</strong> ${escapeHtml(data.remarks)}</p>` : ""}

  <div style="margin-top:40px;">
    <p>Thanking you,</p>
    <p style="margin-top:40px;">
      <strong>For ${escapeHtml(company.companyName)}</strong><br>
      <span style="color:#64748b;">Authorized Signatory</span>
    </p>
  </div>

  <div class="footer">
    This is a system generated document from ${escapeHtml(company.companyName)}
  </div>
</body>
</html>`;
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/pdf/po-acceptance-template.ts
git commit -m "feat: add PO Acceptance Letter HTML template"
```

---

## Task 3: PDF Download API Endpoint

**Files:**
- Create: `src/app/api/po-acceptance/[id]/pdf/route.ts`

- [ ] **Step 1: Create the PDF endpoint**

Create `src/app/api/po-acceptance/[id]/pdf/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { generatePOAcceptanceLetterHtml } from "@/lib/pdf/po-acceptance-template";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("poAcceptance", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const acceptance = await prisma.pOAcceptance.findUnique({
      where: { id },
      include: {
        clientPurchaseOrder: {
          include: {
            customer: {
              select: {
                name: true, contactPerson: true, email: true, phone: true,
                addressLine1: true, addressLine2: true, city: true, state: true, gstNo: true,
              },
            },
            items: { orderBy: { sNo: "asc" } },
          },
        },
        company: true,
      },
    });

    if (!acceptance) {
      return NextResponse.json({ error: "PO Acceptance not found" }, { status: 404 });
    }

    if (acceptance.status !== "ISSUED") {
      return NextResponse.json({ error: "Acceptance letter is only available for issued acceptances" }, { status: 400 });
    }

    const cpo = acceptance.clientPurchaseOrder;
    const company = acceptance.company || {
      companyName: "NPS Piping Solutions",
      regAddressLine1: "1210/1211, Prasad Chambers, Tata Road no. 2, Opera House, Charni Road (E)",
      regCity: "Mumbai", regPincode: "400004", regState: "Maharashtra", regCountry: "India",
      telephoneNo: "+91 22 23634200/300", email: "info@n-pipe.com", website: "www.n-pipe.com",
    };

    const html = generatePOAcceptanceLetterHtml(
      {
        acceptanceNo: acceptance.acceptanceNo,
        acceptanceDate: acceptance.acceptanceDate,
        committedDeliveryDate: acceptance.committedDeliveryDate,
        remarks: acceptance.remarks,
        followUpName: acceptance.followUpName,
        followUpEmail: acceptance.followUpEmail,
        followUpPhone: acceptance.followUpPhone,
        qualityName: acceptance.qualityName,
        qualityEmail: acceptance.qualityEmail,
        qualityPhone: acceptance.qualityPhone,
        accountsName: acceptance.accountsName,
        accountsEmail: acceptance.accountsEmail,
        accountsPhone: acceptance.accountsPhone,
        clientPO: {
          cpoNo: cpo.cpoNo,
          clientPoNumber: cpo.clientPoNumber,
          clientPoDate: cpo.clientPoDate,
          projectName: cpo.projectName,
          paymentTerms: cpo.paymentTerms,
          deliveryTerms: cpo.deliveryTerms,
          currency: cpo.currency,
          subtotal: cpo.subtotal ? Number(cpo.subtotal) : null,
          grandTotal: cpo.grandTotal ? Number(cpo.grandTotal) : null,
        },
        items: cpo.items.map((item) => ({
          sNo: item.sNo,
          product: item.product,
          material: item.material,
          additionalSpec: item.additionalSpec,
          sizeLabel: item.sizeLabel,
          ends: item.ends,
          uom: item.uom,
          qtyOrdered: Number(item.qtyOrdered),
          unitRate: Number(item.unitRate),
          amount: Number(item.amount),
        })),
        customer: cpo.customer,
      },
      company as any
    );

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error generating PO acceptance PDF:", error);
    return NextResponse.json({ error: "Failed to generate acceptance letter" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/po-acceptance/\[id\]/pdf/
git commit -m "feat: add PO acceptance letter PDF download endpoint"
```

---

## Task 4: Email API Endpoint

**Files:**
- Create: `src/app/api/po-acceptance/[id]/email/route.tsx`

- [ ] **Step 1: Create the email endpoint**

Create `src/app/api/po-acceptance/[id]/email/route.tsx`:

```tsx
import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generatePOAcceptanceLetterHtml } from "@/lib/pdf/po-acceptance-template";
import nodemailer from "nodemailer";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const DEFAULT_COMPANY = {
  companyName: "NPS Piping Solutions",
  regAddressLine1: "1210/1211, Prasad Chambers, Tata Road no. 2, Opera House, Charni Road (E)",
  regCity: "Mumbai", regPincode: "400004", regState: "Maharashtra", regCountry: "India",
  telephoneNo: "+91 22 23634200/300", email: "info@n-pipe.com", website: "www.n-pipe.com",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("poAcceptance", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { to, cc, subject, message } = body;

    if (!to) {
      return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
    }

    // Check SMTP configuration
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json(
        { error: "Email not configured. Please set SMTP environment variables." },
        { status: 500 }
      );
    }

    const acceptance = await prisma.pOAcceptance.findUnique({
      where: { id },
      include: {
        clientPurchaseOrder: {
          include: {
            customer: {
              select: {
                name: true, contactPerson: true, email: true, phone: true,
                addressLine1: true, addressLine2: true, city: true, state: true, gstNo: true,
              },
            },
            items: { orderBy: { sNo: "asc" } },
          },
        },
        company: true,
      },
    });

    if (!acceptance) {
      return NextResponse.json({ error: "PO Acceptance not found" }, { status: 404 });
    }

    if (acceptance.status !== "ISSUED") {
      return NextResponse.json({ error: "Can only email issued acceptances" }, { status: 400 });
    }

    const cpo = acceptance.clientPurchaseOrder;
    const companyInfo = acceptance.company || DEFAULT_COMPANY;

    // Generate acceptance letter HTML
    const letterHtml = generatePOAcceptanceLetterHtml(
      {
        acceptanceNo: acceptance.acceptanceNo,
        acceptanceDate: acceptance.acceptanceDate,
        committedDeliveryDate: acceptance.committedDeliveryDate,
        remarks: acceptance.remarks,
        followUpName: acceptance.followUpName,
        followUpEmail: acceptance.followUpEmail,
        followUpPhone: acceptance.followUpPhone,
        qualityName: acceptance.qualityName,
        qualityEmail: acceptance.qualityEmail,
        qualityPhone: acceptance.qualityPhone,
        accountsName: acceptance.accountsName,
        accountsEmail: acceptance.accountsEmail,
        accountsPhone: acceptance.accountsPhone,
        clientPO: {
          cpoNo: cpo.cpoNo,
          clientPoNumber: cpo.clientPoNumber,
          clientPoDate: cpo.clientPoDate,
          projectName: cpo.projectName,
          paymentTerms: cpo.paymentTerms,
          deliveryTerms: cpo.deliveryTerms,
          currency: cpo.currency,
          subtotal: cpo.subtotal ? Number(cpo.subtotal) : null,
          grandTotal: cpo.grandTotal ? Number(cpo.grandTotal) : null,
        },
        items: cpo.items.map((item) => ({
          sNo: item.sNo,
          product: item.product,
          material: item.material,
          additionalSpec: item.additionalSpec,
          sizeLabel: item.sizeLabel,
          ends: item.ends,
          uom: item.uom,
          qtyOrdered: Number(item.qtyOrdered),
          unitRate: Number(item.unitRate),
          amount: Number(item.amount),
        })),
        customer: cpo.customer,
      },
      companyInfo as any
    );

    // Compose email
    const emailSubject = subject || `PO Acceptance — ${acceptance.acceptanceNo} | ${(companyInfo as any).companyName || "NPS Piping Solutions"}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <h2 style="color: #1e293b;">PO Acceptance: ${acceptance.acceptanceNo}</h2>
        <p>Dear ${cpo.customer.contactPerson || "Sir/Madam"},</p>
        <p>${message || "Please find below our Purchase Order Acceptance for your reference."}</p>

        <div style="margin: 24px 0; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden;">
          ${letterHtml}
        </div>

        <p>Should you have any queries, please feel free to contact us.</p>
        <p>Best regards,<br>
        <strong>${(companyInfo as any).companyName || "NPS Piping Solutions"}</strong><br>
        ${(companyInfo as any).email || ""}<br>
        ${(companyInfo as any).telephoneNo || ""}</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 11px; color: #94a3b8;">
          This is a computer generated document. For any discrepancies, please contact us directly.
        </p>
      </div>
    `;

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.SMTP_FROM || `"${(companyInfo as any).companyName || "NPS Piping Solutions"}" <${process.env.SMTP_USER || "noreply@npspipe.com"}>`,
      to,
      subject: emailSubject,
      html: emailHtml,
    };
    if (cc && cc.trim()) {
      mailOptions.cc = cc;
    }

    // Send
    try {
      await transporter.sendMail(mailOptions);
    } catch (sendError: any) {
      try {
        await prisma.pOAcceptanceEmailLog.create({
          data: {
            poAcceptanceId: id,
            sentTo: to,
            sentCc: cc || null,
            subject: emailSubject,
            messageBody: emailHtml,
            sentById: session?.user?.id || null,
            status: "FAILED",
            errorMessage: sendError?.message || "Unknown error",
          },
        });
      } catch (logErr) {
        console.error("Failed to log email failure:", logErr);
      }
      console.error("Error sending email:", sendError?.message || sendError);
      return NextResponse.json(
        { error: sendError?.message || "Failed to send email. Please check SMTP configuration." },
        { status: 500 }
      );
    }

    // Log success
    try {
      await prisma.pOAcceptanceEmailLog.create({
        data: {
          poAcceptanceId: id,
          sentTo: to,
          sentCc: cc || null,
          subject: emailSubject,
          messageBody: emailHtml,
          sentById: session?.user?.id || null,
          status: "SUCCESS",
        },
      });
    } catch (logErr) {
      console.error("Failed to log successful email:", logErr);
    }

    createAuditLog({
      userId: session?.user?.id,
      action: "EMAIL_SENT",
      tableName: "POAcceptance",
      recordId: id,
      newValue: JSON.stringify({ to, cc: cc || null, subject: emailSubject }),
    }).catch((err) => console.error("Failed to create audit log:", err));

    return NextResponse.json({ success: true, message: "PO Acceptance letter sent successfully" });
  } catch (error: any) {
    console.error("Error in PO acceptance email route:", error?.message || error);
    return NextResponse.json({ error: error?.message || "Failed to send email" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/po-acceptance/\[id\]/email/
git commit -m "feat: add PO acceptance email sending endpoint with Nodemailer"
```

---

## Task 5: Email Logs API Endpoint

**Files:**
- Create: `src/app/api/po-acceptance/[id]/emails/route.ts`

- [ ] **Step 1: Create the emails log endpoint**

Create `src/app/api/po-acceptance/[id]/emails/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("poAcceptance", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const logs = await prisma.pOAcceptanceEmailLog.findMany({
      where: { poAcceptanceId: id },
      include: {
        sentBy: { select: { name: true } },
      },
      orderBy: { sentAt: "desc" },
    });

    return NextResponse.json(
      logs.map((log) => ({
        id: log.id,
        sentTo: log.sentTo,
        sentCc: log.sentCc,
        subject: log.subject,
        sentBy: log.sentBy?.name || null,
        sentAt: log.sentAt,
        status: log.status,
        errorMessage: log.errorMessage,
      }))
    );
  } catch (error) {
    console.error("Error fetching email logs:", error);
    return NextResponse.json({ error: "Failed to fetch email logs" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/po-acceptance/\[id\]/emails/
git commit -m "feat: add PO acceptance email logs endpoint"
```

---

## Task 6: Flag Generation on ISSUED in PUT Handler

**Files:**
- Modify: `src/app/api/po-acceptance/[id]/route.ts`

- [ ] **Step 1: Update PUT handler to set generatedPath on ISSUED**

In the PUT handler, after the `prisma.pOAcceptance.update` call and the audit log creation, add:

```typescript
// Flag letter as generated when issuing
if (status === "ISSUED" && existing.status === "DRAFT") {
  await prisma.pOAcceptance.update({
    where: { id },
    data: { generatedPath: `generated-${new Date().toISOString()}` },
  });
}
```

This goes right after the audit log block (after line 150 in the current file).

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/po-acceptance/\[id\]/route.ts
git commit -m "feat: flag PO acceptance letter as generated on ISSUED status"
```

---

## Task 7: Detail Page — Download PDF, Send Dialog, Email History

**Files:**
- Modify: `src/app/(dashboard)/po-acceptance/[id]/page.tsx`

- [ ] **Step 1: Add state variables and email log interface**

Add to the imports:
```typescript
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send } from "lucide-react";
```

Add interface for email logs:
```typescript
interface EmailLog {
  id: string;
  sentTo: string;
  sentCc: string | null;
  subject: string;
  sentBy: string | null;
  sentAt: string;
  status: string;
  errorMessage: string | null;
}
```

Add state variables after the existing ones:
```typescript
const [showEmailDialog, setShowEmailDialog] = useState(false);
const [emailTo, setEmailTo] = useState("");
const [emailCc, setEmailCc] = useState("");
const [emailSubject, setEmailSubject] = useState("");
const [emailMessage, setEmailMessage] = useState("");
const [sendingEmail, setSendingEmail] = useState(false);
const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
```

- [ ] **Step 2: Add fetchEmailLogs function**

Add after `fetchAcceptance`:
```typescript
const fetchEmailLogs = async () => {
  try {
    const res = await fetch(`/api/po-acceptance/${id}/emails`);
    if (res.ok) {
      setEmailLogs(await res.json());
    }
  } catch (error) {
    console.error("Failed to fetch email logs:", error);
  }
};
```

Call it in the existing `useEffect` after `fetchAcceptance()`:
```typescript
useEffect(() => {
  fetchAcceptance();
  fetchEmailLogs();
}, [id]);
```

- [ ] **Step 3: Add openEmailDialog and sendEmail functions**

```typescript
const openEmailDialog = () => {
  if (!acceptance) return;
  const cpo = acceptance.clientPurchaseOrder;
  setEmailTo(cpo.customer.email || acceptance.followUpEmail || "");
  setEmailCc("");
  setEmailSubject(`PO Acceptance — ${acceptance.acceptanceNo} | NPS Piping Solutions`);
  setEmailMessage("Please find below our Purchase Order Acceptance for your reference.");
  setShowEmailDialog(true);
};

const sendEmail = async () => {
  if (!emailTo.trim()) {
    toast.error("Recipient email is required");
    return;
  }
  setSendingEmail(true);
  try {
    const res = await fetch(`/api/po-acceptance/${id}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: emailTo,
        cc: emailCc || null,
        subject: emailSubject,
        message: emailMessage,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success("Email sent successfully");
      setShowEmailDialog(false);
      fetchEmailLogs();
    } else {
      toast.error(data.error || "Failed to send email");
    }
  } catch (error) {
    toast.error("Failed to send email");
  } finally {
    setSendingEmail(false);
  }
};
```

- [ ] **Step 4: Add Download PDF and Send to Client buttons**

In the header buttons area, after the existing DRAFT buttons block and before the Back button, add:

```tsx
{acceptance.status === "ISSUED" && (
  <>
    <Button
      variant="outline"
      onClick={() => window.open(`/api/po-acceptance/${id}/pdf`, "_blank")}
    >
      <Download className="w-4 h-4 mr-2" />
      Download PDF
    </Button>
    <Button onClick={openEmailDialog}>
      <Mail className="w-4 h-4 mr-2" />
      Send to Client
    </Button>
  </>
)}
```

- [ ] **Step 5: Add Email History section**

At the end of the page, before the closing `</div>`, add:

```tsx
{/* Email History */}
{emailLogs.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Mail className="w-4 h-4" />
        Email History
      </CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sent To</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Sent By</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emailLogs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>{log.sentTo}</TableCell>
              <TableCell className="max-w-[200px] truncate">{log.subject}</TableCell>
              <TableCell>{log.sentBy || "-"}</TableCell>
              <TableCell>{format(new Date(log.sentAt), "dd MMM yyyy, HH:mm")}</TableCell>
              <TableCell>
                <Badge variant={log.status === "SUCCESS" ? "default" : "destructive"}>
                  {log.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
)}
```

- [ ] **Step 6: Add Send Email dialog**

At the very end of the component, before the last closing `</div>`, add:

```tsx
{/* Send Email Dialog */}
{showEmailDialog && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEmailDialog(false)}>
    <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <h3 className="text-lg font-semibold mb-4">Send PO Acceptance to Client</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>To *</Label>
          <Input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="recipient@email.com" />
        </div>
        <div className="space-y-2">
          <Label>CC</Label>
          <Input value={emailCc} onChange={(e) => setEmailCc(e.target.value)} placeholder="cc@email.com" />
        </div>
        <div className="space-y-2">
          <Label>Subject</Label>
          <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} rows={3} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={() => setShowEmailDialog(false)}>Cancel</Button>
        <Button onClick={sendEmail} disabled={sendingEmail}>
          <Send className="w-4 h-4 mr-2" />
          {sendingEmail ? "Sending..." : "Send Email"}
        </Button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 7: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 8: Commit**

```bash
git add src/app/\(dashboard\)/po-acceptance/\[id\]/page.tsx
git commit -m "feat: add PDF download, send to client dialog, and email history on PO acceptance detail"
```

---

## Task 8: Final Verification

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Build check**

```bash
npx next build 2>&1 | tail -10
```

Expected: Build succeeds with `/po-acceptance/[id]` in the output.

- [ ] **Step 3: Commit if fixes needed**

```bash
git add -A && git commit -m "fix: address issues found during verification"
```
