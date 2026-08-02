# prisma/seed-test-user.ts

> Creates `testuser@erp.com`, the login that sees modules hidden from
> production users.

## Why this exists

Modules not yet ready for the client are marked `productionHidden` in the
sidebar. Somebody still has to be able to reach them to test. Rather than a
flag per user, one known address bypasses the lockdown.

## What it does

Creates the test user with a bcrypt-hashed password, `ADMIN` role, attached to
the test company.

## How it works

`TEST_USER_EMAIL` in `src/lib/access/module-access.ts` is the hardcoded
counterpart — `isNavItemVisible` compares against it.

## Gotchas and constraints

- **The bypass is a hardcoded email address.** One account only; a second
  tester needs a code change or explicit module grants.
- The user is `ADMIN`, so with 2FA enabled they are also **exempt from the
  login code** (`OTP_EXEMPT_ROLES`).
- Belongs to the test company, so live-company data is invisible to them.

## Related

- `src/lib/access/module-access.ts` — `TEST_USER_EMAIL`.
- `prisma/seed-test-company.ts`
