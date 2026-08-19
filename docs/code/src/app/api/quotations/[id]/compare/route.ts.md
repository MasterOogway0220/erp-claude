# src/app/api/quotations/[id]/compare/route.ts

> `/api/quotations/[id]/compare` — GET

See [../../README.md](../../README.md) for this module's shared behaviour, and
[the API pattern](../../../README.md) for the conventions every route follows.

## What it does

Operates on `quotation`.

- **GET** — Read

## How it works

- Gated by `checkAccess("quotation", "read")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Diffs two revisions of the same quotation, item by item, matched on `sNo`.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- **`itemCompareFields` is an explicit list**, so a new `QuotationItem` column
  is invisible here until it is added by name. `isRegret` is in the list
  because without it a revision that declines a line shows only
  `unitRate: 250 → null`, with nothing saying the line was regretted — and this
  view is what an approver reads before signing off a revision. The PUT audit
  diff in `../route.ts` keeps its own parallel list; both need updating
  together.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../README.md)
