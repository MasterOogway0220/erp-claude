# src/app/api/purchase/ — procurement

18 files. Requisition through to purchase order and vendor tracking.

See [the API pattern](../README.md) for shared conventions.

## The chain

```
PurchaseRequisition   what we need, and why
      ↓
RFQ → RFQVendor       sent to several vendors
      ↓
VendorQuotation       their replies, with commercial terms
      ↓
ComparativeStatement  landed-cost ranking, L1 / L2 / L3
      ↓
PurchaseOrder         issued to the winner
      ↓
GoodsReceiptNote      material arrives (in the inventory module)
```

## Why ranking is on landed cost, not rate

A vendor quoting CIF includes freight and insurance; one quoting Ex-Works does
not. Comparing rates would pick the wrong vendor. `CSEntry` therefore breaks
out material cost, freight, testing, TPI, packing and tax, and ranks on the
total — see `src/lib/constants/supplier-quotations.ts` for the price-basis
glossary.

**Choosing anyone but L1 requires written justification**
(`justificationRemarks`). Procurement here is auditable.

## PR types

`AGAINST_SO`, `STOCK_REPLENISHMENT`, `EMERGENCY`.

Only the first is automated — `auto-pr-generation.ts` raises one from a sales
order shortfall. **Stock replenishment is manual**, because no minimum stock
level is stored anywhere despite the workflow document specifying one.

## PO status

```
DRAFT → PENDING_APPROVAL → OPEN → SENT_TO_VENDOR
      → ACKNOWLEDGED → IN_PRODUCTION → READY_FOR_DISPATCH
      → PARTIALLY_RECEIVED → FULLY_RECEIVED → CLOSED
```

The three middle stages are vendor-reported, skippable and forward-only. A
vendor shipping from stock is never "in production", and one who dispatches
without acknowledging must not block the GRN. **Delivery is driven by the GRN**,
not a button — it is a counted fact, not a claim.

## Not implemented

**Value-banded approval.** The workflow document specifies Purchase Head /
Director / Management thresholds. The config type exists in
`validators/business-rules.ts` and nothing calls it, there is no Director role,
and role enforcement is disabled app-wide. Any approver can approve any value.

## Gotchas

- **RFQ reminders** run from a daily cron (`/api/cron/rfq-reminders`), which
  needs `CRON_SECRET`. With SMTP unconfigured it still records expiries but
  cannot send.
- **PO variance detection** compares a PO to its quotation positionally by
  `sNo`; reordering lines produces false variances.
- Supplier quotation documents now store to the database.

## Related

- `src/lib/purchase/`, `src/lib/business-logic/po-variance-detection.ts`
- `src/lib/constants/supplier-quotations.ts`
- `src/lib/pdf/purchase-order-template.ts`
