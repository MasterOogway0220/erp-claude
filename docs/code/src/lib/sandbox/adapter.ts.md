# src/lib/sandbox/adapter.ts

> Wraps a Prisma driver adapter so every statement it sends is renamed onto the
> `sbx_` copies first.

## Why this exists

Prisma 7 talks to MariaDB through a driver adapter (`@prisma/adapter-mariadb`).
Every SQL statement Prisma generates — and every raw query — passes through
the adapter's `queryRaw` / `executeRaw`. Hooking there catches all of them,
including statements inside interactive transactions, without touching the
query engine or any route. See the [module README](./README.md).

## What it does

`sandboxAdapter(factory, tables)` returns an adapter factory to hand to
`new PrismaClient({ adapter })`. Everything behaves like the wrapped factory
except that SQL is passed through `toSandboxSql` first.

## How it works

Two layers of `Proxy`:

- The factory's `connect()` returns a wrapped adapter.
- The adapter's (and each transaction's) `queryRaw` / `executeRaw` rename the
  query's `sql`; `executeScript` renames the script; `startTransaction()`
  returns a wrapped transaction. Everything else (`commit`, `rollback`,
  `dispose`, metadata) passes through bound.

A rename failure throws from inside the adapter, so Prisma reports it as a
failed query and nothing is sent.

## Gotchas and constraints

- The types come from `@prisma/driver-adapter-utils`, a transitive dependency
  of the adapter. A Prisma upgrade that changes the adapter interface (new
  query methods) must be reflected here — an unwrapped method would bypass the
  renamer. The e2e test's `general_log` audit is the check that would catch it.
- Proven against Prisma 7.3 / adapter-mariadb by `sandbox.db.test.ts` and
  `e2e/sandbox.e2e.ts`.

## Related

- `rewrite.ts`, `src/lib/prisma.ts` (`createSandboxClient`).
