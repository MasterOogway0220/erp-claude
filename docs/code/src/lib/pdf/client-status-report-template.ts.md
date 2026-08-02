# src/lib/pdf/client-status-report-template.ts

> The order status report — what to send when a client phones and asks where
> their order is.

See [README.md](./README.md) for the shared pattern.

## Why this exists

The order processing flow document asks for exactly this: a report a user can
generate on demand covering PO details, items ordered, material prepared,
inspection and testing status, and expected dispatch.

Without it, answering a client means opening five screens and writing an email
by hand.

## What it does

HTML summarising an order's progress: references, items, and per-stage status
through preparation, inspection, testing and dispatch.

## How it works

Assembles state from across the pipeline — the sales order, the warehouse
intimation, inspections, lab reports and dispatch — into one client-facing
view. The same seven stages the tracking dashboard uses.

The report is deliberately **client-facing**: it reports progress, not internal
cost or supplier detail.

## Domain notes

The stages mirror `/api/po-tracking`: PO Received, PO Acceptance, Material
Preparation, Inspection, Lab Testing, Documentation, Dispatch Clearance.

## Gotchas and constraints

- **Point-in-time.** Nothing is stored; the report reflects the moment it was
  generated.
- **Three output paths** — PDF, Excel and email — as separate routes under
  `reports/client-status/[salesOrderId]/`. A change to what the report says
  needs checking against all three.
- Some stage statuses are derived approximations rather than explicit fields;
  see the comments in the tracking route.

## Related

- `src/app/api/reports/client-status/[salesOrderId]/pdf/route.tsx`,
  `excel/route.ts`, `email/route.tsx`
- `src/app/api/po-tracking/route.ts` — the same stage model.
