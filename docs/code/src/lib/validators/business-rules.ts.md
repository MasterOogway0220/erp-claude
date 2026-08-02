# src/lib/validators/business-rules.ts

> The mandatory controls from PRD section 10 — attachments, approval
> thresholds, stock and quantity checks — as reusable validators.

## Why this exists

The ERP is built to an ISO 9001 process, and certain things must not be
possible: releasing material with no MTC on file, closing an inspection with no
report, dispatching more than was ordered. These are audit findings if they
happen, not just bugs.

Collecting them here means the rule is stated once and the routes call it.

## What it does

Exports a set of `async` validators returning a common shape:

```ts
interface ValidationResult { isValid: boolean; errors: string[]; warnings?: string[] }
```

The main ones cover mandatory attachments (`GRN` / `INSPECTION` / `NCR`),
approval-threshold configuration, and quantity/stock consistency.

## How it works

### Errors versus warnings

The distinction is the useful part. `errors` block the operation; `warnings`
are surfaced and the user proceeds. A missing MTC at GRN is an error. A
delivery a few days late is a warning — real, worth showing, not worth
refusing.

Callers must treat them differently; a caller that only reads `isValid` throws
the warnings away.

### Accumulating

Like `validatePassword`, these gather every failure rather than returning on
the first, so a user fixes one screen rather than iterating.

### Attachment checks are database reads

`validateMandatoryAttachments` queries for the actual document path rather than
trusting a flag. A row can claim an MTC number with no file behind it — and
until recently every uploaded file was being lost, so a path that pointed
nowhere was the normal case. Verifying the stored path is what makes the
control meaningful.

## Domain notes

- **MTC** — Mill Test Certificate, mandatory at GRN. Without it the material
  has no provenance and cannot be certified onward to the client. This is the
  single most important attachment rule in the system.
- **NCR** — Non-Conformance Report, raised when material fails inspection.
- **QC release** — the gate that moves stock from `UNDER_INSPECTION` to
  `ACCEPTED` and makes it available to reserve.

## Gotchas and constraints

- **`ApprovalThresholdConfig` (`quotationThreshold`, `poThreshold`) is declared
  here but nothing calls it.** The purchase workflow document specifies
  value-banded approval (Purchase Manager / Director / Management) and it is
  **not implemented** — the type exists, the enforcement does not. Two obstacles:
  the role enum has no Director or Purchase Manager, and role enforcement is
  globally disabled (see `rbac.ts`). Do not assume approvals are value-gated.
- **These are opt-in.** Nothing forces a route to call them; a new endpoint
  that skips the check is not flagged.
- Each validator issues its own queries — no batching. Fine at current volume.
- Several read as PRD transcription rather than observed behaviour. Verify
  against the route before relying on one.

## Related

- `src/lib/validators/auth.ts` — the password half of PRD section 9/10.
- `src/app/api/inventory/grn/route.ts`, `src/app/api/quality/**` — callers.
- `src/lib/business-logic/po-variance-detection.ts` — related PO checks.
