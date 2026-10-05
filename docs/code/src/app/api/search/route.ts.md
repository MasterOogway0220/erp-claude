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

## Sandbox preview (temporary, from 5 Oct 2026)

`route.ts` is currently a gate: the sandbox login gets `route.sandbox.ts`
— the behaviour this doc describes — and every other user gets
`route.legacy`, the version from before the 03/10/26 meeting fixes. See
`src/lib/sandbox/preview.ts.md`. Going live: replace this file with the
`.sandbox` copy and delete both copies; then delete this section.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](README.md)
