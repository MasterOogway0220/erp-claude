# src/app/api/reports/ — reporting endpoints

15 files.

See [the API pattern](../README.md) for shared conventions.

## What is here

Sales, purchase, inventory ageing, vendor performance, quotation analysis,
on-time delivery, NCR analysis, management review, and the **client status
report** in three output formats.

## The client status report

The one clients see. Answers "where is my order" across the whole pipeline, in
the seven stages the tracking dashboard uses: PO Received, PO Acceptance,
Material Preparation, Inspection, Lab Testing, Documentation, Dispatch
Clearance.

Three separate routes — `pdf`, `excel`, `email` — under
`client-status/[salesOrderId]/`. **A change to what the report says needs
checking against all three.**

## Vendor performance

On-time delivery percentage, quality score from inspection failures and
returns, and annual spend. Feeds the vendor tracking dashboard the purchase
workflow document specifies.

## Gotchas

- **Reports aggregate across modules** and are the most likely place to meet a
  slow query.
- **Point-in-time** — nothing is stored, so two runs can differ.
- Some stage statuses in the client report are derived approximations rather
  than explicit fields; the source comments say which.
- Company-scoped, so a `SUPER_ADMIN` with no active company sees everything.

## Related

- `src/app/api/po-tracking/route.ts` — the same stage model.
- `src/lib/pdf/client-status-report-template.ts`
