# src/app/api/search/route.ts

> `/api/search` — GET

See [README.md](README.md) for this module's shared behaviour, and
[the API pattern](../README.md) for the conventions every route follows.

## What it does

Operates on `quotation`, `salesOrder`, `purchaseOrder`, `goodsReceiptNote`, `inventoryStock`, `inspection`.

- **GET** — Read

## How it works

- Gated by `checkAccess("reports", "read")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Up to 5 matches per type, each matched on its document number. Two types
  also match the client's own number: quotations on `inquiryNo` (the client's
  enquiry reference), and tenders — type `"Tender"`, linking to
  `/tenders/[id]` — on `tenderRef` (the client's tender number) as well as our
  `tenderNo`. Tenders were not searchable here before 5 Oct 2026.
- Soft-deleted quotations and tenders are excluded.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](README.md)
