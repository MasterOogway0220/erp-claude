# PO Acceptance Letter PDF & Email — Design Spec

**Date:** 2026-04-11
**Sub-system:** 2 of 4 (Sales Order Module Overhaul)
**Status:** Draft

---

## Overview

When a PO Acceptance is issued (status → ISSUED), auto-generate a PO Acceptance Letter as HTML/PDF. The letter can be downloaded as PDF and emailed to the client via a manual "Send to Client" action with preview.

---

## 1. Schema Changes

### Add `generatedPath` to POAcceptance

```prisma
generatedPath String?   // path/key for generated PDF HTML
```

### Add POAcceptanceEmailLog model

Following the existing `QuotationEmailLog` / `InvoiceEmailLog` pattern:

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

Add reverse relations:
- `POAcceptance`: `emailLogs POAcceptanceEmailLog[]`
- `User`: `poaEmailsSent POAcceptanceEmailLog[] @relation("POAEmailSentBy")`

---

## 2. PDF Template

### File
`src/lib/pdf/po-acceptance-template.ts`

### Function
`generatePOAcceptanceLetterHtml(acceptance, clientPO, company)` → returns HTML string

### Default Layout (swappable later)
- **Company letterhead**: logo, company name, address, contact info
- **Date & Reference**: Acceptance No, Date, Client PO No, Client PO Date
- **Customer address block**: Customer name, contact person, city, state
- **Body**: "Dear [contact], We acknowledge receipt of your Purchase Order No. [X] dated [Y] and confirm our acceptance of the same."
- **Committed Delivery Date**: Clearly stated
- **Item summary table**: S.No, Product Description, Size, Qty, UOM, Rate, Amount
- **Totals**: Subtotal, additional charges, GST, Grand Total
- **Payment Terms & Delivery Terms** (from the CPO)
- **Contact Persons section**: Follow-up, Quality, Accounts (name, email, phone)
- **Signature block**: "For NPS Piping Solutions" with space for authorized signatory
- **Footer**: "This is a system generated document"

### Styling
- A4 portrait, professional formatting
- Consistent with existing quotation/invoice PDF templates in the project

---

## 3. Auto-Generate on ISSUED

### Trigger
In the existing PUT handler at `src/app/api/po-acceptance/[id]/route.ts`, when status changes from DRAFT → ISSUED:

1. Fetch full acceptance data with CPO, items, customer, and company
2. Call `generatePOAcceptanceLetterHtml()` to generate the HTML
3. Store a reference (save the generated HTML content or mark `generatedPath` as generated)

No external storage needed — the HTML is regenerated on demand for download/email. The `generatedPath` field simply flags that the letter has been generated (set to `"generated"` or a timestamp-based key).

---

## 4. Download PDF

### API Endpoint
`GET /api/po-acceptance/[id]/pdf`

- Auth: `checkAccess("poAcceptance", "read")`
- Fetches acceptance + CPO + items + company data
- Calls `generatePOAcceptanceLetterHtml()`
- Returns HTML with `Content-Type: text/html` (the frontend uses browser print/save-as-PDF, matching existing pattern)
- Alternative: If the project has a PDF rendering utility (`render-pdf.ts`), use that

### UI
- "Download PDF" button on PO Acceptance detail page (`src/app/(dashboard)/po-acceptance/[id]/page.tsx`)
- Visible only when status is ISSUED
- Opens the PDF endpoint in a new tab

---

## 5. Send to Client (Email)

### API Endpoint
`POST /api/po-acceptance/[id]/email`

Following the exact pattern of `src/app/api/quotations/[id]/email/route.tsx`:

- Auth: `checkAccess("poAcceptance", "write")`
- Body: `{ to, cc, subject, message }`
- Fetches acceptance + CPO + items + company
- Generates acceptance letter HTML
- Creates Nodemailer transporter using `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` env vars
- Sends email with the letter HTML embedded inline
- Creates `POAcceptanceEmailLog` record (status SUCCESS or FAILED)
- If SMTP vars are missing, returns 500 with clear message: "Email not configured. Please set SMTP environment variables."

### Email Content
- Subject (default): "PO Acceptance — [Acceptance No] | [Company Name]"
- Body: Greeting, custom message, acceptance letter HTML inline, signature block
- From: `SMTP_USER` or company email

### UI — Send Dialog
On the PO Acceptance detail page, add a "Send to Client" button (visible when ISSUED).

Clicking opens a dialog with:
- **To**: Pre-filled from customer email or followUpEmail
- **CC**: Empty, editable
- **Subject**: Pre-filled, editable
- **Message**: Default text, editable textarea
- **Send** and **Cancel** buttons

After sending:
- Success toast: "Email sent successfully"
- Error toast with message from API
- Button state changes to show "Sent" with timestamp (from email log)

### Email Log Display
On the detail page, show a small section "Email History" listing sent emails:
- Sent to, date/time, status (SUCCESS/FAILED)
- Only visible if emailLogs exist

---

## 6. Files Summary

| Action | File |
|--------|------|
| Create | `src/lib/pdf/po-acceptance-template.ts` |
| Create | `src/app/api/po-acceptance/[id]/pdf/route.ts` |
| Create | `src/app/api/po-acceptance/[id]/email/route.tsx` |
| Modify | `prisma/schema.prisma` (POAcceptance + POAcceptanceEmailLog) |
| Modify | `src/app/api/po-acceptance/[id]/route.ts` (auto-generate on ISSUED) |
| Modify | `src/app/(dashboard)/po-acceptance/[id]/page.tsx` (PDF download, send dialog, email log) |

---

## 7. Error Handling

- **SMTP not configured**: Return 500 with "Email not configured" message. UI shows toast with the error. Does not prevent PDF generation or download.
- **Email send failure**: Log as FAILED in POAcceptanceEmailLog with errorMessage. Show error toast to user.
- **PDF generation**: If data is missing (no items, no customer), return 400 with specific message.
