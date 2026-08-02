# src/lib/po-acceptance/advance-cpo.ts

> When a PO Acceptance is issued, the parent Client PO advances to ACCEPTED —
> this is the one place that rule lives.

## Why this exists

A PO Acceptance can reach `ISSUED` by three different routes: the create
wizard's `finalize` POST, and the detail page's `PUT` and `PATCH` status
updates. Each must advance the parent Client PO the same way.

They did not. The rule had been implemented on one path, so a CPO whose
acceptance was issued through a different screen kept its old status — and
`from-cpo` refuses to create a sales order unless the acceptance is `ISSUED`
*and* the CPO has moved on. The order silently could not proceed, with no error
explaining why.

Extracting the rule means fixing it fixes every path. This is the same lesson
the codebase learned on `dealOwnerId` and `preparedById`: a state transition
implemented per-caller will be fixed per-caller, and one will be missed.

## What it does

| Export | Behaviour |
|---|---|
| `cpoStatusAfterIssue(currentCpoStatus)` | `"ACCEPTED"` if the CPO is `REGISTERED`/`DRAFT`, else `null`. |
| `isPoaIssueTransition(newStatus, prevStatus)` | True only on a *fresh* move into `ISSUED`. |

`null` means "leave it alone".

## How it works

### Only advancing from the start

`cpoStatusAfterIssue` returns `ACCEPTED` **only** from `REGISTERED` or `DRAFT`.

That whitelist is the safety property. A CPO that has already progressed —
partially or fully fulfilled, closed — must not be dragged back to `ACCEPTED`
because someone re-saved the acceptance document. Writing the status
unconditionally would regress live orders, and status drives what the rest of
the pipeline will let you do.

### Only on a fresh transition

`isPoaIssueTransition` requires the new status to be `ISSUED` **and** the
previous not to be. Editing an already-issued acceptance — correcting a
contact, regenerating the PDF — is not a re-issue and must not re-trigger the
side effect.

The two functions are separate because callers need them at different moments:
the transition check runs against the in-flight update, the status decision
against the CPO that was loaded.

## Domain notes

**The Client PO chain.** A client sends a purchase order → it is registered as
a **CPO** (`REGISTERED`) → the company issues a **PO Acceptance**, the
countersigned commitment with a committed delivery date and named contacts →
the CPO becomes `ACCEPTED` → a **Sales Order** is created from it and execution
begins.

The acceptance is the commercial commitment. Until it is issued, the company
has not formally accepted the order, which is why the sales order gate depends
on it.

## Gotchas and constraints

- Pure. Neither function touches the database; the caller performs the update
  inside its own transaction.
- Statuses are compared as plain strings — `POAcceptance.status` is a `String`
  column, not an enum, so there is no compile-time protection against a typo.
- Only handles the forward step. Cancelling an acceptance does not walk the
  CPO back; there is no such flow yet.

## Related

- `src/lib/po-acceptance/advance-cpo.test.ts`
- `src/app/api/po-acceptance/[id]/finalize/route.ts`,
  `src/app/api/po-acceptance/[id]/route.ts` — the three callers.
- `src/app/api/sales-orders/from-cpo/route.ts` — requires `ISSUED`.
