# src/lib/business-logic/auto-pr-generation.ts

> Raises a Purchase Requisition automatically when a sales order cannot be
> fully served from stock.

## Why this exists

When a sales order is confirmed, stock is reserved against it. Whatever cannot
be reserved has to be bought, and someone has to notice the shortfall and raise
a PR. Doing that by eye across a multi-line order is where orders slip.

This closes the loop: the shortfall computed during reservation becomes a
requisition automatically.

## What it does

Takes a set of `ShortfallItem`s — product, material, size, required quantity,
available quantity, shortfall — and creates a `PurchaseRequisition` of type
`AGAINST_SO` with a line per shortfall, writing an audit entry.

Also exports configuration around when a shortfall is worth acting on
(`minShortfallQty`).

## How it works

The shortfall is supplied by the caller rather than recomputed here — the
reservation logic already knows what it could not allocate, and recalculating
risks the two disagreeing.

A minimum-quantity threshold suppresses trivial shortfalls; raising a
requisition for a metre of pipe creates more administration than it saves.
The skip reason is reported rather than silently dropped.

The generated PR is linked to the sales order, so the PR → RFQ → CS → PO chain
carries the reference through to the purchase order and the eventual GRN. That
link is what makes end-to-end traceability work: a client asking why their
order is late can be answered from the PO's delivery status.

## Domain notes

**This is the sales-order route into procurement, and it is the only automatic
one.** The purchase workflow document also specifies **stock replenishment**
PRs driven by a minimum stock level per item — "Current Stock | Min Level |
Reorder Qty". That is **not implemented**: no minimum level is stored anywhere,
so the `STOCK_REPLENISHMENT` requisition type exists but is only usable
manually. Do not assume min-level reordering works.

**PR types:** `AGAINST_SO` (this file), `STOCK_REPLENISHMENT` (manual),
`EMERGENCY`.

## Gotchas and constraints

- **Triggered from a route, not a schedule.** `/api/sales-orders/[id]/generate-pr`
  calls it; nothing runs it in the background.
- **No deduplication against existing PRs.** Calling twice for the same
  shortfall creates two requisitions.
- Matching is on product/material/size strings, which must line up with how the
  quotation captured them.
- The created PR is `DRAFT` — it still needs a buyer to act on it.

## Related

- `src/app/api/sales-orders/[id]/generate-pr/route.ts` — the caller.
- `src/app/api/sales-orders/[id]/allotment/route.ts` — reservation, where the
  shortfall is computed.
- `prisma/schema.prisma` → `PurchaseRequisition`, `RequisitionType`.
- `src/lib/purchase/rfq-reminders.ts` — the next step in the chain.
