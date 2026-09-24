# src/lib/sandbox/rewrite.ts

> Renames every real table in a SQL statement to its `sbx_` copy, and refuses
> any statement that still names a real table. The isolation boundary of the
> sandbox login.

## Why this exists

The sandbox client runs the app's normal queries against copies of the tables.
Doing that at the SQL level (rather than with a second generated Prisma client
or per-route checks) means *nothing* a route does — includes, nested writes,
transactions, raw SQL — can reach a real table by a path nobody thought of.
See the [module README](./README.md).

## What it does

- `SANDBOX_PREFIX` — `"sbx_"`.
- `toSandboxSql(sql, tables)` — the statement with each real table renamed;
  throws `SandboxSqlError` if one survives.
- `assertNoRealTables(sql, tables)` — throws if the statement names a real
  table. Also used by `e2e/sandbox.e2e.ts` to audit MariaDB's statement log.

## How it works

The statement is split into code, `` `backticked` `` identifiers, and `'…'` /
`"…"` string literals (doubled quotes and backslash escapes stay inside the
literal, as in MySQL's default mode).

- A backticked identifier equal to a table name is renamed —
  `` `Quotation`.`id` `` and `` `db`.`Quotation` `` both work because each part
  is its own identifier.
- In code, a bare word equal to a table name is renamed — needed because raw
  SQL in `sales-orders/[id]/reserve` says `FROM InventoryStock` unquoted.
  Word boundaries exclude `\w` and `$`, so `quotationId`, `QuotationItemCount`
  and `sbx_Quotation` are left alone (the last makes it idempotent).
- String literals are never touched: a customer called "Quotation" is data.

**Comments are refused outright** (`--`, `#`, `/* */` outside string
literals): a quote inside a comment would open a phantom literal in the scan
and hide what follows, and MariaDB executes `/*! … */` and `/*M! … */`
comments as SQL. Neither Prisma's generated SQL nor the app's raw SQL
contains comments.

The guard runs the same scan over the output. If the renamer ever misses a
case, the statement is refused with the table named — a sandbox error on
screen, never a write to real data.

## Gotchas and constraints

- Relies on no column being named exactly like a table. True as of 2026-09-24
  (checked against `information_schema.COLUMNS`); a column named `User` would be
  renamed to `sbx_User` and the query would fail loudly, not leak.
- Case-sensitive, matching how Prisma and this codebase write table names.
- Assumes `ANSI_QUOTES` is off (double quotes are strings). Production's
  `sql_mode` is `IGNORE_SPACE,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION`
  (checked 2026-09-24). If `ANSI_QUOTES` were ever enabled, a `"Quotation"`
  identifier would pass unrenamed.

## Related

- `adapter.ts` (the only runtime caller), `tables.ts` (the table list).
- `rewrite.test.ts`.
