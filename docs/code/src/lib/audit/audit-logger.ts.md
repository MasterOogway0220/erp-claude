# src/lib/audit/audit-logger.ts

> The typed audit logger — module-scoped enums, helper functions per action,
> and request metadata capture.

## Why this exists

The ISO 9001 process requires a complete trail of every create, update and
delete. `src/lib/audit.ts` writes a raw row; this is the structured layer over
it, with enums so a module name or action cannot be misspelled, and helpers so
each call site does not reassemble the payload.

## What it does

Exports `AuditAction` and `AuditModule` enums, request-metadata helpers
(`getIpAddress`, `getUserAgent`), and per-action helpers such as `logCreate`,
`logUpdate`, `logDelete` and `logEmailSent`.

## How it works

Enums instead of strings, so `AuditModule.QUOTATION` cannot be typed
`"Quotaton"`. That is the main value over the raw writer.

The per-action helpers take the shape each action actually needs — a create
does not have an old value; a status change is a from/to pair — rather than one
function with eight optional arguments.

Request metadata (IP, user agent) is pulled from headers when a request object
is available, which the raw writer does not do.

## Domain notes

`AuditAction` covers the document lifecycle this business runs on:
`SUBMIT_FOR_APPROVAL`, `APPROVE`, `REJECT`, `VOID`, `STATUS_CHANGE`, plus
`EXPORT` and `EMAIL_SENT` — sending a quotation to a client is an auditable
event, not just a side effect.

## Gotchas and constraints

- **There are two audit writers, and the split is not clean.** Most route
  handlers use the simpler `src/lib/audit.ts`; this one is used by
  `business-logic/*`. The consequence is concrete: `EMAIL_SENT` rows only ever
  come from *this* helper, so querying the audit log for them returns nothing
  even when mail routes have run. During an investigation, zero `EMAIL_SENT`
  rows was **not** evidence that email had never worked — it was evidence the
  mail routes use the other writer. Do not treat this table as complete
  coverage.
- **`AuditAction` here is a TypeScript enum that shadows the Prisma enum** of
  the same name. They must stay in step; a value added here but not in the
  schema fails at insert.
- Like the raw writer, failures are swallowed.
- No pruning.

## Related

- `src/lib/audit.ts` — the simpler writer used by most routes. Consolidating
  the two would be a genuine cleanup.
- `prisma/schema.prisma` → `AuditLog`, `AuditAction`.
- `src/lib/business-logic/**` — the main callers.
