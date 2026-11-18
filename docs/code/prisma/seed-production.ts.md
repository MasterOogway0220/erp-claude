# prisma/seed-production.ts

> The safe, idempotent bootstrap — admin user and document sequences only.

## Why this exists

A fresh deployment needs the minimum to be usable: someone who can log in, and
the counters that let documents be numbered. Everything else is entered through
the UI or loaded by a master script.

Idempotent because it was written to run automatically on deploy, where it may
execute many times against a database that already has data.

## What it does

Creates or leaves alone: the admin user, the company record, and a
`DocumentSequence` row per document type. `npm run seed:prod`.

Requires `ADMIN_PASSWORD` in the environment; it throws `ADMIN_PASSWORD is not
set` before touching the database otherwise. The admin email is fixed at
`admin@erp.com`.

## How it works

Upserts throughout — every write is keyed so a second run is a no-op. Exits
early with a clear message if `DATABASE_URL` is unset, rather than failing
deeper with a connection error.

Document sequences are created at `currentNumber: 0` for the current financial
year, so the first document of each type gets 1 (or 15001 for the quotation
series, which carries a +15000 base for continuity with the company's pre-ERP
numbering).

## Gotchas and constraints

- **The header comment says "runs on Render"** — the app is on Vercel now. The
  script is still valid; the comment is stale.
- **No default password.** It used to fall back to `Admin@123` when
  `ADMIN_PASSWORD` was unset, and printed which password it used. Since the
  repo is public, any deployment seeded without the variable had a guessable
  admin login. Now the variable is mandatory and the password is never logged.
- The script does not check `ADMIN_PASSWORD` against the 12-character minimum
  the app enforces (`MIN_PASSWORD_LENGTH` in `src/lib/rbac.ts`); choose one
  that meets it. If the admin already exists, the variable is still required
  but the existing password is left unchanged.
- Safe to re-run, but it will not repair a sequence someone has edited by hand.

## Related

- `src/lib/document-numbering.ts` — consumes the sequences.
- `prisma/seed.ts` — the older, unsafe one.
