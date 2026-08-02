# prisma/seed-test-company.ts

> Creates the "NPS Test Environment" company so testing does not touch live
> data.

## Why this exists

Three companies share this database. One of them exists purely so the test user
can exercise the system without their quotations, orders and stock appearing in
the live company's lists.

## What it does

Creates the test company and its supporting records.

## Domain notes

The three companies are `N-Pipe Solutions Inc.` (live), a near-duplicate
`N-PIPE SOLUTIONS INC.`, and `NPS Test Environment`.

**The test user belongs to the test company, not the live one.** That has a
consequence worth knowing: any API route that company-scopes catalogue data
returns nothing for them. Catalogue masters are therefore deliberately
unscoped — see `rbac.ts`.

## Gotchas and constraints

- The two near-identically named live companies are a data-entry artefact, not
  a designed distinction. Check `companyId` rather than name.
- Run once. Not idempotent in the way `seed-production.ts` is.

## Related

- `prisma/seed-test-user.ts`
- `src/lib/rbac.ts` — company scoping and the catalogue exception.
