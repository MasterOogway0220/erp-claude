# src/lib/pdf/po-acceptance-template.ts

> The P.O. Acceptance sent back to a client — the company's formal
> acknowledgement of their order.

See [README.md](./README.md) for the shared pattern.

## Why this exists

When a client sends a purchase order, the company returns an acceptance: yes,
we have your order, here is what we have understood it to say, here is the
delivery date we commit to, and here is who to contact about it.

It is the commercial commitment. Until it is issued the order has not been
formally accepted, which is why the sales order cannot be created before it.

## What it does

HTML for the acceptance: client and order references, accepted items, the
commercial summary, the committed delivery date, and three named contacts.

## How it works

Items and totals mirror the client PO. The parts specific to this document:

- **Committed delivery date** — a promise, distinct from any date on the
  client's own PO.
- **Three contact blocks** — Follow-up, Quality/Inspection, Accounts, each with
  name, email and phone, stored on `POAcceptance` as nine flat columns. The
  purchase workflow document asks for exactly these three, because a client
  chasing delivery, arranging inspection and querying an invoice needs three
  different people.

## Domain notes

The chain is: client PO → registered as a **CPO** → **PO Acceptance** issued →
CPO becomes `ACCEPTED` → **Sales Order** created → execution.

The acceptance is emailed to the client, and their countersigned copy is
uploaded back against the record (`signedCopyPath`).

## Gotchas and constraints

- **Contacts are free text**, not links to `EmployeeMaster`. They can name
  someone who has left.
- The generated PDF's path is recorded in `generatedPath`; the client's signed
  copy is separate (`signedCopyPath`).
- Issuing advances the parent CPO — see `po-acceptance/advance-cpo.ts`, which
  exists because that rule was previously implemented on only one of three
  routes.

## Related

- `src/lib/po-acceptance/advance-cpo.ts`
- `src/app/api/po-acceptance/[id]/pdf/route.ts`, `email/route.tsx`,
  `finalize/route.ts`
- `src/app/(dashboard)/po-acceptance/[id]/page.tsx` — signed-copy upload.
