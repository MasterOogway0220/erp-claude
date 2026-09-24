# src/lib/sandbox/refresh.ts

> Rebuilds every `sbx_` table copy from the real tables — structure, data and
> foreign keys — and reports when that last happened.

## Why this exists

The sandbox login works on copies. They need to be created once, re-taken
nightly so the sandbox starts each day on current data, and re-taken on demand
("Reset Sandbox"). See the [module README](./README.md).

## What it does

- `refreshStatements(tables, fks)` — pure; the ordered statements.
- `refreshSandboxCopy(databaseUrl)` — runs them; returns `{ tables, ms }`.
  Throws `RefreshBusyError` if another refresh holds the lock.
- `lastRefreshAt(client)` — when the last *complete* refresh finished, or null.
- `Fk` — one foreign key as read from `information_schema`.
- `RefreshBusyError`.

## How it works

1. Read every real foreign key between model tables from
   `information_schema.REFERENTIAL_CONSTRAINTS` ⨝ `KEY_COLUMN_USAGE`.
2. For each table: `DROP TABLE IF EXISTS sbx_T`; then `CREATE TABLE sbx_T LIKE
   T`; then `INSERT INTO sbx_T SELECT * FROM T`.
3. Re-add every foreign key between the copies (same columns and
   `ON DELETE` / `ON UPDATE` rules) — `CREATE TABLE … LIKE` copies indexes but
   not foreign keys, and without them deletes would not cascade in the sandbox.
   Constraint names are `sbx_<original>`, shortened with a hash past MySQL's
   64-character limit.

4. The first statement drops the marker table `sbx__refreshed`; the last
   creates it. `lastRefreshAt` reads the marker's age, so a refresh that dies
   part-way reads as "not refreshed", never as fresh. The age is computed on
   the server (`TIMESTAMPDIFF(SECOND, CREATE_TIME, NOW())`) because
   `CREATE_TIME` is a zone-less server-local DATETIME.

It all runs as **one multi-statement script** on a dedicated one-connection
client with `FOREIGN_KEY_CHECKS = 0` (a session setting, hence one
connection; tables are copied in schema order, not dependency order). One
script means one network round trip instead of ~400.

Before the script, `GET_LOCK('sbx_refresh', 0)` on that connection: a second
refresh (the cron overlapping a reset, or two resets) gets `RefreshBusyError`
instead of dropping the first one's half-built copies. The lock is released
when the connection closes, even on failure.

The script sets `READ COMMITTED` so `INSERT … SELECT` reads the real tables as
a consistent snapshot without locking real rows (production already defaults
to it and has binary logging off — checked 2026-09-24).

Rebuilding structure every time, rather than truncating, keeps the copies in
step with migrations.

## Gotchas and constraints

- **Wipes the sandbox user's changes.** That is the point of it.
- The unit test pins the safety property: every written identifier starts with
  `sbx_`; real tables appear only as the source of `LIKE` / `SELECT`.
- Measured locally (Docker on Windows, 113 tables): ~6 s, dominated by DDL.
  The production database is small (14.5 MB, ~7.7k rows on 2026-09-24).
- `multipleStatements: true` is set only on this dedicated client, never on the
  app's pools.
- While a refresh runs, sandbox queries can fail briefly (tables are dropped
  and recreated).

## Related

- `src/app/api/cron/sandbox-refresh/route.ts` (nightly),
  `src/app/api/sandbox/route.ts` (Reset button), `tables.ts`.
- `refresh.test.ts`, `sandbox.db.test.ts`.
