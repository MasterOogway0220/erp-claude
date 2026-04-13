# Design: PO Edit (DRAFT) + Tender → Quotation/SO Linkage

**Date:** 2026-04-13  
**Status:** Approved

---

## 1. PO Edit (DRAFT Only)

### Goal
Allow full editing of a Purchase Order while it is in DRAFT status — vendor, line items, rates, dates, and other fields — without creating a new amendment/revision.

### Backend

**File:** `src/app/api/purchase/orders/[id]/route.ts` (PATCH)

Extend the existing PATCH handler with a new action path: when no `action` field is in the body and status is `DRAFT`, treat the request as a full edit:
- Accept full PO fields: `vendorId`, `deliveryDate`, `specialRequirements`, `paymentTerms`, `deliveryAddress`, `termsAndConditions`, `followUpNotes`, and `items[]`
- Guard: reject with 400 if PO status is not `DRAFT`
- Delete existing `POItem` records for this PO, then recreate from submitted items (same pattern as quotation edit)
- Recalculate `totalAmount` from submitted items

**Item fields accepted:** `sNo`, `product`, `material`, `additionalSpec`, `sizeLabel`, `quantity`, `unitRate`, `amount`, `deliveryDate`, `fittingId`, `flangeId`

### Frontend

**New page:** `src/app/(dashboard)/purchase/orders/[id]/edit/page.tsx`

- Fetches existing PO via the existing GET endpoint (`/api/purchase/orders/[id]`)
- Pre-populates all fields: vendor selector, delivery date, special requirements, payment terms, delivery address, terms & conditions, follow-up notes, line items
- Line items: same structure as create page — product/material/spec/size/qty/rate per row, add/remove rows
- On submit: PATCH `/api/purchase/orders/[id]` with full data
- On success: redirect to `/purchase/orders/[id]`
- On error: show toast error

**Detail page change:** `src/app/(dashboard)/purchase/orders/[id]/page.tsx`

- Add an "Edit" button in the header action area
- Button is only rendered when `po.status === "DRAFT"`
- Clicking navigates to `/purchase/orders/[id]/edit`

---

## 2. Tender → Quotation / Sales Order Linkage

### Goal
When a tender is WON, allow creating a Quotation or Sales Order directly from it (pre-filled), and track the link back on the tender detail page.

### Schema Changes

**File:** `prisma/schema.prisma`

Add to `Quotation` model:
```prisma
sourceTenderId String?
sourceTender   Tender? @relation("TenderQuotations", fields: [sourceTenderId], references: [id])
```

Add to `SalesOrder` model:
```prisma
sourceTenderId String?
sourceTender   Tender? @relation("TenderSalesOrders", fields: [sourceTenderId], references: [id])
```

Add reverse relations to `Tender` model:
```prisma
quotations   Quotation[]  @relation("TenderQuotations")
salesOrders  SalesOrder[] @relation("TenderSalesOrders")
```

Migration: `npx prisma migrate dev --name add_tender_source_to_quotation_and_so`

### Backend

**Quotation POST** (`src/app/api/quotations/route.ts`):
- Accept `sourceTenderId` from body
- Store it on the created Quotation

**Sales Order POST** (`src/app/api/sales-orders/route.ts` or equivalent):
- Accept `sourceTenderId` from body
- Store it on the created SalesOrder

**Tender GET** (`src/app/api/tenders/[id]/route.ts`):
- Include linked quotations and sales orders in response:
  ```ts
  quotations: { select: { id, quotationNo, quotationDate, status } }
  salesOrders: { select: { id, soNo, soDate, status } }
  ```

### Frontend

**Tender detail page** (`src/app/(dashboard)/tenders/[id]/page.tsx`):

1. **Action buttons** — shown only when `tender.status === "WON"`:
   - "Create Quotation" → opens a small dialog asking **Standard or Non-Standard**, then navigates to `/quotations/create/standard?tenderId=[id]` or `/quotations/create/nonstandard?tenderId=[id]`
   - "Create Sales Order" → navigates to `/sales/create?tenderId=[id]`

2. **Linked Documents section** — always visible, shows:
   - Quotations created from this tender (quotation number, date, status) with link to quotation detail
   - Sales Orders created from this tender (SO number, date, status) with link to SO detail
   - Shows "None yet" if no linked documents exist

**Quotation create pages** (`standard/page.tsx`, `nonstandard/page.tsx`):
- Read `tenderId` from URL search params on mount
- If present: fetch tender via `/api/tenders/[tenderId]`
- Pre-fill: `customerId`, `kindAttention` (project name), items (mapped from `TenderItem[]` with description/material/qty)
- Store `sourceTenderId` in form state, send in mutation body

**Sales Order create page** (`src/app/(dashboard)/sales/create/page.tsx`):
- Read `tenderId` from URL search params on mount
- If present: fetch tender, pre-fill `customerId` and `projectName`
- Store `sourceTenderId` in form state, send in mutation body

---

## Summary of Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `sourceTenderId` to Quotation + SalesOrder; add reverse relations to Tender |
| `src/app/api/purchase/orders/[id]/route.ts` | Extend PATCH for full DRAFT edit |
| `src/app/api/quotations/route.ts` | Accept `sourceTenderId` in POST |
| `src/app/api/sales-orders/route.ts` | Accept `sourceTenderId` in POST |
| `src/app/api/tenders/[id]/route.ts` | Include linked quotations + SOs in GET |
| `src/app/(dashboard)/purchase/orders/[id]/page.tsx` | Add "Edit" button when DRAFT |
| `src/app/(dashboard)/purchase/orders/[id]/edit/page.tsx` | New edit page |
| `src/app/(dashboard)/tenders/[id]/page.tsx` | Add action buttons + linked docs section |
| `src/app/(dashboard)/quotations/create/standard/page.tsx` | Read tenderId param, pre-fill |
| `src/app/(dashboard)/quotations/create/nonstandard/page.tsx` | Read tenderId param, pre-fill |
| `src/app/(dashboard)/sales/create/page.tsx` | Read tenderId param, pre-fill |
