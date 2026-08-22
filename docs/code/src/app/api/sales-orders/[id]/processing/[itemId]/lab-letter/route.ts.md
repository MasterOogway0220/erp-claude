# src/app/api/sales-orders/[id]/processing/[itemId]/lab-letter/route.ts

> `/api/sales-orders/[id]/processing/[itemId]/lab-letter` — POST

See [../../../../README.md](../../../../README.md) for this module's shared behaviour, and
[the API pattern](../../../../../README.md) for the conventions every route follows.

## What it does

Operates on `salesOrderItem`, `testingMaster`, `labLetter`.

- **POST** — Create

## How it works

- Gated by `checkAccess("labLetter", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- **Not company-scoped.** Either catalogue data (deliberately global) or scoped via a parent record — verify which before changing.
- Allocates a document number with `generateDocumentNumber()` (per company, per financial year).

## testIds / testNames are JSON strings, not arrays

Both are `String?` (`@db.LongText`). This route used to hand Prisma a bare JS
array with an `as any` and a comment claiming Prisma would serialise it; under
Prisma 7 with the MariaDB adapter it does not — every call died with
`Argument \`testIds\`: Invalid value provided. Expected String or Null, provided
(String)` and the screen showed only "Failed to generate lab letter". Lab letter
generation was broken for every item, found by walking the flow in a test
environment.

They are now `JSON.stringify`d on write, and every reader goes through
`parseStringArray`. The readers previously used `Array.isArray(...)`, which is
false for a JSON string — so a fix on the write side alone would have produced
letters that saved and then displayed no tests at all.

## The "other test"

Besides the eleven standard lab tests, a processing item can carry
`otherLabTests` — free text for a test the client named that is not on the list.
Those names are appended to `testNames` and the letter generates on them alone
if no standard test was ticked. They have no `TestingMaster` row, so they travel
by name only and contribute no `testIds`.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Confirm the company-scoping story before reusing this as a template.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/document-numbering.ts`
- [Module overview](../../../../README.md)
