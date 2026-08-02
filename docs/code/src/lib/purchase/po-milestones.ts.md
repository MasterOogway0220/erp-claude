# src/lib/purchase/po-milestones.ts

> The vendor-reported stages of a purchase order, and which of them a given PO
> still has ahead of it.

## Why this exists

`POStatus` used to go from `SENT_TO_VENDOR` straight to `PARTIALLY_RECEIVED`.
Between placing an order and goods arriving — which for pipe made to order can
be months — there was no way to record that the vendor had acknowledged it, or
started manufacturing, or had it ready to ship. Buyers were tracking that in
their heads and in email.

The purchase workflow document specifies exactly those stages, and they are
most of what it means by "Vendor Delivery Tracking".

This file holds the ordering so the UI and the tests agree on it, and so the
"which buttons do I show" question has one tested answer.

## What it does

| Export | Purpose |
|---|---|
| `VENDOR_MILESTONES` | The three reportable stages with their button labels. |
| `MILESTONE_ORDER` | The vendor-facing chain, in order. |
| `isMilestoneAhead(current, target)` | Has this PO not yet reached that stage? |

## How it works

`MILESTONE_ORDER` is `SENT_TO_VENDOR → ACKNOWLEDGED → IN_PRODUCTION →
READY_FOR_DISPATCH`. `isMilestoneAhead` compares `indexOf` positions and
returns true only when the target is strictly later.

The `from >= 0` guard carries the weight. A status **not in the array** —
`DRAFT`, `PENDING_APPROVAL`, `OPEN`, `PARTIALLY_RECEIVED`, `FULLY_RECEIVED`,
`CLOSED`, `CANCELLED` — yields `-1`, and every comparison against it is false,
so no milestone is offered.

That single condition is what stops "Mark Acknowledged" appearing on a
cancelled order or one already received. Without it, `-1 < 1` is true and every
button shows on every PO. It is the reason this function is extracted and
tested rather than inlined in the page.

### Delivered is not here

The document's chain ends *Ready for Dispatch → Delivered*, but `Delivered` is
deliberately absent. Receipt is recorded by the **GRN**, which counts what
physically arrived and sets `PARTIALLY_RECEIVED` or `FULLY_RECEIVED` from the
quantities. A button claiming delivery would be someone's assertion competing
with a counted fact.

### Skippable by design

The API's transition map lets any of these move directly to any later stage.
A vendor shipping from stock is never "in production", and one who dispatches
without acknowledging must not be blocked from having a GRN raised. Only
backwards moves are refused.

## Domain notes

- **GRN** — Goods Receipt Note. The document raised when material physically
  arrives, recording quantities, heat numbers and condition. It is the
  authority on what was delivered.
- **Acknowledged** means the vendor has confirmed the order — price, quantity
  and delivery date accepted. In this trade an unacknowledged PO is not a
  commitment, which is why it is worth tracking separately from "sent".
- **In Production** applies to made-to-order material. Stock items skip it.

## Gotchas and constraints

- `MILESTONE_ORDER` and the API's `VALID_PO_STATUS_TRANSITIONS` encode the same
  sequence in two places. If a stage is added, both change — the map decides
  what is *permitted*, this decides what is *offered*.
- `VENDOR_MILESTONES` is `as const`, so the status strings are literal types.
  A typo will not compile against `POStatus`.
- Labels are UI text living beside the data. Acceptable at three entries; if it
  grows, separate them.

## Related

- `src/lib/purchase/po-milestones.test.ts` — the cancelled/received cases.
- `src/app/api/purchase/orders/[id]/route.ts` — `VALID_PO_STATUS_TRANSITIONS`
  and the `vendor_milestone` action.
- `src/app/(dashboard)/purchase/orders/[id]/page.tsx` — renders the buttons.
- `prisma/migrations/20260802160000_add_po_vendor_milestones/`
