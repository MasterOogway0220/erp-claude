# src/lib/sandbox/ — the sandbox login

> One login (Akash, `akash.sandbox@demo.local`) with full ADMIN powers whose
> every query runs against `sbx_*` copies of the tables, so nothing he does
> changes real data or is seen by anyone else.

## Why this exists

The owner wanted a demo/training login that can do *anything* an admin can —
create, edit, delete, send, manage users — on realistic data, with zero effect
on the real business data or on anyone else's screens. Design history and the
decisions behind it: `docs/superpowers/specs/2026-09-24-sandbox-user-design.md`.

An earlier design (per-request MySQL temporary tables shadowing the real ones,
plus an overlay table, for real-time freshness) was dropped on 2026-09-24 in
favour of plain copies, on the owner's instruction: simpler, and "the copy is
used by the sandbox, the live data is not touched" was the requirement.

## How a sandbox request flows

1. **Login.** `User.isSandbox = true` rides in the JWT (`src/lib/auth.ts`).
   Login bookkeeping (`lastLogin`, LOGIN audit) is skipped for sandbox users.
2. **Marking.** `src/middleware.ts` covers every `/api/*` path, including
   `/api/auth/*` (change-password writes there). It deletes any client-sent
   `x-erp-sandbox` header and, when the verified token says `isSandbox`, sets
   it to the user id ([headers.ts](./headers.ts.md)). Login and the session
   re-verify read identity through `realPrisma`, so they always see the real
   `User` table.
3. **Routing.** The exported `prisma` ([router.ts](./router.ts.md), wired in
   `src/lib/prisma.ts`) reads the header on every model call, `$transaction`
   and raw query ([context.ts](./context.ts.md)) and runs it on either the
   real client (unchanged) or the sandbox client. No route file knows.
4. **Renaming.** The sandbox client's driver adapter
   ([adapter.ts](./adapter.ts.md)) passes every SQL statement through
   [rewrite.ts](./rewrite.ts.md): each real table name becomes `sbx_<name>`,
   and a statement that still names a real table is **refused**, never sent.
5. **The copies.** [refresh.ts](./refresh.ts.md) rebuilds every `sbx_` table
   (structure, data, foreign keys) from the real tables — nightly via
   `/api/cron/sandbox-refresh`, and on demand from the banner's Reset button
   (`/api/sandbox`, at most one per 2 minutes). A refresh wipes the sandbox
   user's changes. Only one refresh runs at a time (a DB lock); it reads the
   real tables under `READ COMMITTED`, so it takes no locks on real rows.

Side channels that do not go through the database are handled where they
live: `mailer()` fakes `sendMail` for sandbox requests, and
`cachedMasterRead` bypasses the shared cache (otherwise sandbox rows would be
cached under keys real users read). `checkAccess`/`checkAuth` refuse a sandbox
session on a request that middleware did not mark.

## What the live database holds because of this

- `User.isSandbox` (migration `20260924120000_user_is_sandbox`) and Akash's row
  (`prisma/seed-sandbox-user.ts`).
- One `sbx_<Table>` per model table, rebuilt on every refresh.
- Nothing else. Real tables are never written by sandbox activity — verified
  end to end by `e2e/sandbox.e2e.ts` (checksums of every real table, and
  MariaDB's `general_log` showing every write statement names only `sbx_`
  tables).

## Files

| File | Role |
|---|---|
| [tables.ts](./tables.ts.md) | The list of real tables (from the Prisma schema) |
| [rewrite.ts](./rewrite.ts.md) | SQL renamer + the refuse-if-real guard |
| [adapter.ts](./adapter.ts.md) | Wraps the MariaDB driver adapter with the renamer |
| [router.ts](./router.ts.md) | Per-call choice of real vs sandbox client |
| [context.ts](./context.ts.md) | Reads the sandbox header in a request |
| [headers.ts](./headers.ts.md) | Strips/sets the header (middleware side) |
| [refresh.ts](./refresh.ts.md) | Rebuilds the `sbx_` copies |

## Gotchas

- **Snapshot, not live.** Akash sees real data as of the last refresh (at most
  a day). Real users' changes reach him after the next nightly copy.
- **`prisma db push` against the live DB sees `sbx_*` as drift** and offers to
  drop them. The repo's procedure is hand-written SQL + `migrate deploy`, which
  ignores them; if they are ever dropped, the next refresh recreates them.
- **A migration adding a column** leaves the copies on the old structure until
  the next refresh, and the sandbox client will then fail on that column.
  Trigger a refresh (Reset button or the cron URL) after deploying a migration.
- **Refresh needs Akash's own `User` row to exist first** — rows he creates
  reference him. Seed, then refresh.
- **The nightly cron needs `CRON_SECRET`** in Vercel production, like
  `cron/rfq-reminders`; without it the endpoint answers 503.

## Related

- Tests: `rewrite.test.ts`, `refresh.test.ts`, `headers.test.ts`,
  `router.test.ts` (unit); `sandbox.db.test.ts` (local DB); `e2e/sandbox.e2e.ts`
  (end to end, checks 1–8 of the spec).
