# src/app/api/sales-orders/[id]/allotment/route.ts

> `/api/sales-orders/[id]/allotment` — POST

See [../../README.md](../../README.md) for this module's shared behaviour, and
[the API pattern](../../../README.md) for the conventions every route follows.

## What it does

Operates on `salesOrder`, `salesOrderItem`, `warehouseIntimation`, `alert`, `purchaseRequisition`.

- **POST** — Create

## How it works

- Gated by `checkAccess("salesOrder", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- **Not company-scoped.** Either catalogue data (deliberately global) or scoped via a parent record — verify which before changing.
- Allocates a document number with `generateDocumentNumber()` (per company, per financial year).
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Technical requirements reach both destinations

The order-processing configuration is read once here and used twice: to derive
the warehouse intimation's inspection/testing statuses, and to stamp
`PRItem.technicalRequirements` on every requisition line raised for procurement.

The warehouse always received the requirements; purchase did not, so a vendor PO
could be placed for non-compliant material and the problem only appeared at GRN.
The text is a snapshot taken at PR creation — later changes to the item's
processing do not rewrite a PR that has already gone out.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Confirm the company-scoping story before reusing this as a template.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/document-numbering.ts`
- `src/lib/business-logic/technical-requirements.ts`, `src/lib/quality/qap.ts`
- [Module overview](../../README.md)
