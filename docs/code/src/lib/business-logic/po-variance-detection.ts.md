# src/lib/business-logic/po-variance-detection.ts

> Compares a purchase order against the quotation it came from and reports
> every difference in rate, quantity and total.

## Why this exists

A PO is generated from a quotation, but the buyer can edit it before issuing.
Most edits are legitimate; some are not, and an unnoticed rate change between
what was quoted and what was ordered is a margin leak that nobody sees until
the invoice.

So rather than blocking edits, the system **detects and reports** them, and
flags when the difference is large enough to warrant a second pair of eyes.

## What it does

`detectPOVariances(quotationId, poItems, poTotalAmount)` → `VarianceReport`:

```ts
{
  hasVariances: boolean;
  totalVarianceAmount?: number;
  totalVariancePercent?: number;
  items: VarianceItem[];       // per line: field, quotation value, PO value, delta
  warnings: string[];
  requiresApproval: boolean;
}
```

## How it works

Loads the quotation with its items ordered by `sNo`, then walks the PO lines
against them, recording a `VarianceItem` per differing field with both values,
the absolute delta and a percentage.

The percentage is what drives `requiresApproval` — an absolute figure is
meaningless across orders of different sizes, while a percentage is comparable.

`warnings` carries human-readable text assembled from the same findings, so a
caller can display the summary without re-deriving it.

## Domain notes

**Why quantity variance is normal and rate variance is not.** A client
frequently orders part of what was quoted — the quotation balance mechanism
exists precisely for that, and partial ordering is expected. A changed *rate*
between quotation and PO is different: the price was offered and accepted, so a
difference means either a renegotiation that should be recorded, or an error.

## Gotchas and constraints

- **Reports, does not block.** `requiresApproval` is advisory; whether a route
  acts on it is the route's decision. Related: the value-banded approval
  thresholds the purchase document specifies are not implemented at all (see
  `validators/business-rules.ts`).
- **Matching is positional, by `sNo`.** Reordering or inserting a PO line
  against a quotation shifts the comparison, producing variances that are
  artefacts of alignment rather than real changes.
- `poItems` is typed `any[]`.
- One quotation per PO is assumed; a PO consolidating several is not handled.

## Related

- `src/app/api/purchase/orders/[id]/variance/route.ts`
- `src/app/(dashboard)/purchase/orders/[id]/page.tsx` — shows the report.
- `src/app/api/quotations/[id]/balance/route.ts` — the legitimate partial-order
  path.
