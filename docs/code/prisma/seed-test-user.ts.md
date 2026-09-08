# prisma/seed-test-user.ts

> Creates `testuser@erp.com`, an ADMIN login on the test company.

## Why this exists

Originally this address was the **one bypass of the production module
lockdown**: modules not yet handed to the client were marked
`productionHidden` in the sidebar and hidden from live users, and somebody
still had to reach them to test. Rather than a flag per user, one known address
was hardcoded as the exception.

That lockdown is gone — every module is now visible to every signed-in user —
so the bypass has nothing left to bypass. The script survives because a
disposable ADMIN account on the test company is independently useful: it
exercises admin-only screens without touching live-company data.

## What it does

Creates the test user with a bcrypt-hashed password, `ADMIN` role, attached to
the test company.

## How it works

The address is a literal in this script. Nothing in `src/` refers to it any
more — the `TEST_USER_EMAIL` constant it used to pair with was deleted along
with `isNavItemVisible`. Renaming the account here breaks nothing.

## Gotchas and constraints

- **This account has no special powers.** It is an ordinary ADMIN. If you are
  reading it as a privileged tester login, that stopped being true when the
  lockdown was removed.
- The user is `ADMIN`, so with 2FA enabled they are also **exempt from the
  login code** (`OTP_EXEMPT_ROLES`).
- Belongs to the test company, so live-company data is invisible to them.
- It is a real, seeded login with a known-shaped password on a production
  database. Treat deleting it as a live option once it stops being used.

## Related

- `prisma/seed-test-company.ts`
- `src/lib/access/module-access.ts` — where the bypass constant used to live.
