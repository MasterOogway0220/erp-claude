# src/lib/alerts.ts

> Creates a workflow alert for a role. Split into a pure builder and a
> non-throwing writer.

## Why this exists

The ERP raises alerts when something needs a human — material awaiting
inspection, a PO overdue, stock below what an order reserved. They are
addressed to a **role**, not a person, so whoever is on duty picks them up.

Alerts are always a *side effect* of a business operation. That drives the two
design decisions: the payload is built by a pure function so defaults can be
tested without a database, and the writer never throws so a failed alert cannot
roll back the operation that triggered it.

## What it does

| Export | Behaviour |
|---|---|
| `buildAlertData(input)` | The `data` payload with defaults applied. Pure. |
| `createAlert(input)` | Writes it. Async, returns `void`, never throws. |

## How it works

### The lazy Prisma import

```ts
const { prisma } = await import("./prisma");
```

Inside the function, not at the top. That keeps the module importable in a unit
test without `DATABASE_URL` being set — importing `prisma` at module scope
would construct the adapter, which parses the URL and throws if it is absent.
`buildAlertData` is therefore testable in isolation, which is where the default
logic lives.

### Defaults

`severity` → `MEDIUM`, `status` → `UNREAD`, `companyId` and `dueDate`
normalised to `null`. Applied in the builder so the test asserts them rather
than a caller having to remember.

### Swallowing errors

Same reasoning as `audit.ts`. A GRN that fails because its notification could
not be written is worse than a GRN with no notification. Logged, not raised.

## Domain notes

**Role-addressed, not user-addressed.** `assignedToRole` is `STORES`, `QC`,
`SALES`, `PURCHASE` — the work belongs to a function, not an individual, and
the ERP does not model shift rosters.

`relatedModule` + `relatedId` form a loose pointer back to the source document.
Loose because there is no foreign key: an alert must survive the thing it
refers to being deleted, and it spans many different tables.

Typical triggers, from `alerts.ts` callers and the alerts API: stock received
and awaiting QC (`STORES`, then `QC`), inspection due, a sales order that
cannot be fully reserved (`SALES`), a PO past its delivery date (`PURCHASE`).

## Gotchas and constraints

- **Silent failure.** If alerts stop appearing, check the server log; nothing
  surfaces in the UI.
- **No deduplication.** Calling twice makes two alerts. Callers that run inside
  a loop or a retried request need their own guard.
- **`dueDate` is not enforced.** Nothing sweeps overdue alerts; the UI computes
  overdue from the date at render time.

## Related

- `src/lib/alerts.test.ts` — the defaults.
- `src/app/api/alerts/route.ts` — listing, and several triggers.
- `src/app/api/po-acceptance/[id]/finalize/route.ts`,
  `src/app/api/sales-orders/[id]/allotment/route.ts`,
  `src/app/api/quality/inspections/route.ts` — representative callers.
- `prisma/schema.prisma` → `Alert`, `AlertType`, `AlertSeverity`.
