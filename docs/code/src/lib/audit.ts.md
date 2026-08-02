# src/lib/audit.ts

> Writes an `AuditLog` row. Swallows its own failures on purpose.

## Why this exists

The ERP is built to an ISO 9001 process, so who changed what has to be
recoverable. This is the lightweight writer used by route handlers; a richer
typed helper exists in `src/lib/audit/audit-logger.ts`.

## What it does

`createAuditLog({ tableName, recordId, action, fieldName?, oldValue?,
newValue?, userId?, companyId? })`. Async, returns nothing, **never throws**.

## How it works

A single insert wrapped in `try/catch` that logs to the console and continues.

That swallow is the whole design decision. Audit writes happen alongside
business operations — creating a quotation, approving a PO, logging in. If
this threw, an audit failure would roll back the operation it was recording.
The login path makes the point: `authorize()` writes a `LOGIN` audit row, and
a logging failure must not stop a legitimate user signing in.

The trade-off is accepted deliberately: a lost audit row is worse than nothing
in a compliance sense, but a failed login is worse operationally, and the
console error preserves the evidence.

Empty strings normalise to `null` so "not recorded" is one value, not two.

## Domain notes

`AuditAction` covers `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `APPROVE`,
`REJECT`, `SUBMIT_FOR_APPROVAL`, `STATUS_CHANGE`, `EMAIL_SENT` and others.

`newValue` is frequently a **JSON blob**, not a scalar — the quotation PUT
stores an item-level diff there. So the column is a change record, not
strictly an old/new pair, and anything reading it must cope with both shapes.

## Gotchas and constraints

- **Two audit helpers exist.** This one, and `audit/audit-logger.ts` with
  typed module actions and IP capture. Route handlers mostly use this. Note the
  consequence: `EMAIL_SENT` rows are produced by the *other* helper, so a query
  for them returns nothing even though mail routes ran — the audit log was not
  proof that email worked.
- **`tableName` is a free string**, not tied to a Prisma model name, and casing
  is inconsistent across callers (`"user"` vs `"Quotation"`). Query with that
  in mind.
- No pruning. The table grows forever.

## Related

- `src/lib/audit/audit-logger.ts` — the richer variant.
- `prisma/schema.prisma` → `AuditLog`, `AuditAction`.
