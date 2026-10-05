# src/lib/soft-delete.ts

> Two constants for soft deletion — exclude deleted rows, and mark a row
> deleted.

## Why this exists

The helpers for soft deletion: a row is marked deleted by setting `deletedAt`
instead of being removed, and reads exclude it.

**What actually soft-deletes today (5 Oct 2026): quotations and tenders.**
`DELETE /api/quotations/[id]` (DRAFT only) and `DELETE /api/tenders/[id]` (no
quotation or sales order raised from it) call `softDeleteData()`, and every
quotation and tender read in the app filters `deletedAt: null`. About 17 models carry a
`deletedAt` column, but the master DELETE routes still hard-delete or
deactivate; nothing else reads or writes `deletedAt`. An earlier version of
this doc described masters as soft-deleted; they are not.

## What it does

| Export | Use |
|---|---|
| `notDeleted` | Spread into a `where`: `{ ...notDeleted, isActive: true }` |
| `softDeleteData(hasIsActive?)` | The `data` for the update that deletes. |

## How it works

`notDeleted` is `{ deletedAt: null } as const`.

`softDeleteData(true)` also sets `isActive: false`. Some models carry both
flags, for different reasons: `isActive` is a business state a user toggles
(this vendor is dormant), `deletedAt` is removal. A deleted row must also be
inactive, or a query filtering only on `isActive` would still surface it. The
argument exists because setting `isActive` on a model that lacks the column is
a runtime Prisma error.

## Domain notes

Why masters are never really deleted: a `QuotationItem` denormalises product
and material as **strings** but a `SizeMaster` link is a real foreign key.
Historical documents must keep rendering exactly as issued — for ISO
traceability and because a client can ask about a three-year-old quotation.

## Gotchas and constraints

- **Nothing enforces this.** There is no Prisma middleware applying
  `notDeleted` globally; every query opts in. Omitting it is silent, and the
  symptom is a deleted master reappearing in a dropdown.
- **Not every model has `deletedAt`.** Spreading `notDeleted` into a `where`
  for a model without the column is a compile error, which is the good case.
- Nothing purges old soft-deleted rows, by design.

## Related

- `src/app/api/quotations/[id]/route.ts`, `src/app/api/tenders/[id]/route.ts` — the callers of `softDeleteData`.
- `prisma/schema.prisma` — models carrying `deletedAt`.
