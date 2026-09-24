# Sandbox user (Akash) — design

Date: 2026-09-24
Status: revised 2026-09-24 on the owner's instruction — copy tables replace the
real-time shadow overlay. The earlier revision (temporary shadow tables +
`SandboxChange` overlay) is superseded.

## Goal

One login, **Akash** (`akash.sandbox@demo.local`), that behaves exactly like an
`ADMIN` of N-Pipe Solutions Inc. — every screen and every action, including
deletes, user management and company settings — while nothing he does ever
changes the real data or is seen by anyone else.

## Decisions (owner, 2026-09-24)

| Question | Decision |
|---|---|
| Where Akash's data lives | Copies of every table **inside the live database**, named `sbx_<Table>` |
| Freshness | Snapshot, re-copied from the real tables **every night**; a re-copy wipes Akash's changes |
| Reset button | "Reset Sandbox" re-copies immediately (same operation as the nightly job) |
| External read-only lookups (GSTIN, FX, pincode) | Allowed |
| Akash's company / role | N-Pipe Solutions Inc. (`cmmrs9ytr0001panemoxnq3gf`), `ADMIN` (OTP-exempt) |
| Build / verify where | Local MariaDB 11.8 in Docker (`erp-sandbox-db`, port 3307) |

What this means in practice: Akash sees real data as of the last copy (at most
a day old). Real users' changes during the day reach him after the next
nightly copy. Changes he makes last until then.

## Architecture

### Identity
- `User.isSandbox Boolean @default(false)` — the only schema change.
- NextAuth token and session carry `isSandbox`.
- `authorize()` skips the `lastLogin` update and the LOGIN audit for sandbox users.

### Marking the request (`src/middleware.ts`)
- Matcher gains `/api/:path*`. Every request has any client-sent
  `x-erp-sandbox` header removed; when the verified JWT has `isSandbox` (and
  the path is not `/api/auth/*`) it is set to the user id.
- Normal users: one JWT decode, no DB query.

### Routing (`src/lib/prisma.ts`)
- The exported `prisma` becomes a router. Each model call, `$transaction`, and
  raw call reads the header (`next/headers`; no request → no header) and uses
  either the existing client (unchanged) or the **sandbox client**.
- No route file changes.
- `checkAccess`/`checkAuth` return 500 if the session is a sandbox session but
  the header is absent (defence in depth).

### The sandbox client (`src/lib/sandbox/`)
- A second `PrismaClient` whose driver adapter is wrapped: every SQL statement
  (queries, writes, transactions, raw SQL) has each table name — backticked or
  bare, outside string literals — renamed to `sbx_<Table>` before it is sent.
- **Fail-closed:** after renaming, if any real table name is still present the
  statement is refused with an error; it never reaches the database.
- Own pool: `connectionLimit: 2`, `minimumIdle: 0`.

### The copy (`src/lib/sandbox/refresh.ts`)
- For every model table `T`: `DROP TABLE IF EXISTS sbx_T`, `CREATE TABLE sbx_T
  LIKE T`, `INSERT INTO sbx_T SELECT * FROM T`; then every real foreign key is
  recreated between the copies (same columns, same `ON DELETE`/`ON UPDATE`),
  so cascades and restricts behave as on real data. Runs with
  `FOREIGN_KEY_CHECKS = 0` on its own connection.
- Rebuilding structure every time keeps the copies in step with migrations.
- The statement builder only ever names a real table as the *source* of
  `LIKE` / `SELECT`; every written identifier starts with `sbx_` (unit-tested).
- Triggers: nightly Vercel cron `/api/cron/sandbox-refresh` (`CRON_SECRET`),
  and `POST /api/sandbox/reset` from Akash's banner.

## Side effects when Akash acts

| Channel | Handling |
|---|---|
| Email (7 senders via `mailer()`) | Sandbox → `sendMail` logs `[SANDBOX] blocked email …` and returns success |
| Audit log, alerts, uploaded files, document numbers | DB rows → land in `sbx_` tables |
| Master cache (`unstable_cache`, shared by every user) | Sandbox reads bypass it — otherwise his data would be cached under keys real users read, and real cached data served to him |
| GSTIN / FX / pincode lookups | Allowed |
| RFQ reminder cron | Real data only; never uses the sandbox client |
| Login bookkeeping | Skipped for sandbox users |

## UI
- Amber **SANDBOX MODE** banner when `session.user.isSandbox`, showing when the
  copy was last refreshed.
- **Reset Sandbox** button → re-copy now.

## What is written to the live database
- Once: the `User.isSandbox` column and Akash's `User` row.
- The `sbx_*` tables (created by the first copy, rebuilt nightly and on reset).
- Nothing else. Real tables are never written by Akash's activity.

## Verification (local MariaDB, end-to-end against `next dev`)
1. Akash edits a record → he sees it; admin sees the original.
2. Akash creates a record → only he sees it.
3. Akash deletes a record → hidden only for him; still in the real table.
4. Admin edits a record → Akash sees it after the next refresh (snapshot, by design).
5. Row counts + `CHECKSUM TABLE` of every real (non-`sbx_`) table identical before/after a full Akash session.
6. No email reaches SMTP during Akash's session (fake SMTP listener counts 0).
7. Reset Sandbox → Akash sees pure real data again.
8. MariaDB `general_log` during Akash's session: every `INSERT/UPDATE/DELETE/REPLACE/CREATE/ALTER/DROP/TRUNCATE` names only `sbx_` tables.

## Known limits
- Snapshot: up to a day stale; refresh wipes Akash's work (owner's choice).
- `prisma db push` against the live DB would see `sbx_*` tables as drift and
  offer to drop them; the next copy recreates them. `migrate deploy` ignores them.
- Refresh briefly holds one connection for a few seconds (14.5 MB, ~7.7k rows as of 2026-09-24).
- The nightly cron needs `CRON_SECRET` set in Vercel production.
