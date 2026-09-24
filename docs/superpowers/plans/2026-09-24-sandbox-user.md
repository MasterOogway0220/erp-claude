# Sandbox User (Akash) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A login (`akash.sandbox@demo.local`) with full ADMIN powers whose every query runs against `sbx_*` copies of the tables inside the live database, refreshed nightly, so real data is never changed and no one else sees his work.

**Architecture:** Middleware marks Akash's API requests with `x-erp-sandbox` (from the verified JWT, client copies stripped). `src/lib/prisma.ts` routes each call to either the existing client or a sandbox `PrismaClient` whose driver adapter renames every table in every SQL statement to `sbx_<Table>` and refuses any statement that still names a real table. `refresh.ts` rebuilds the copies (structure, data, foreign keys).

**Tech Stack:** Next.js 16.1.6, NextAuth v4 JWT, Prisma 7.3 + `@prisma/adapter-mariadb`, MariaDB 11.8, vitest 2.

**Spec:** `docs/superpowers/specs/2026-09-24-sandbox-user-design.md` (revised copy-table design).

## Global Constraints

- Sandbox SQL must never name a real table; enforced by the adapter wrapper (refuse, never pass through).
- Normal users: zero behaviour change, zero extra DB queries.
- Akash: name `Akash`, email `akash.sandbox@demo.local`, password `Akash@Sandbox#2026`, bcrypt 10 rounds, role `ADMIN`, company `cmmrs9ytr0001panemoxnq3gf` in production, `isSandbox = true`.
- Develop/verify only against local `mysql://root:localroot@127.0.0.1:3307/erp_local`. Nothing runs against the `.env` DATABASE_URL without the user's go-ahead.
- No git commits unless the user asks.
- Every added/changed code file gets its `docs/code/<path>.md`; new ones get an INDEX row. Graphify rebuild after code changes.

## Proven by spike (local, 2026-09-24)

Adapter-level renaming of backticked table names: model reads/writes, includes, `_count`, relation filters, interactive tx with nested writes, FK cascade between copies, aggregate, raw backticked SQL — all hit only `sbx_` tables; real rows unchanged. Bare (unquoted) names in raw SQL (`FROM InventoryStock` in `sales-orders/[id]/reserve`) are not covered by backtick renaming → the renamer must also handle bare identifiers. No column in the schema shares a name with a table.

## Tasks

### Task 1: Schema + local fixture
- [ ] `User.isSandbox Boolean @default(false)` in `prisma/schema.prisma`.
- [ ] Migration `prisma/migrations/20260924120000_user_is_sandbox/migration.sql`: ``ALTER TABLE `User` ADD COLUMN `isSandbox` BOOLEAN NOT NULL DEFAULT false;``
- [ ] `db push` to local + `prisma generate`.
- [ ] `prisma/seed-sandbox-user.ts` (upsert Akash; company from `SANDBOX_COMPANY_ID`, default production id; fails if company missing).
- [ ] Seed local: base seed + a company + Akash.

### Task 2: SQL renamer (pure, TDD) — `src/lib/sandbox/rewrite.ts`
Interface: `SANDBOX_PREFIX = "sbx_"`; `toSandboxSql(sql: string, tables: readonly string[]): string` (throws `SandboxSqlError` if a real table name survives).
Tests: backticked names renamed incl. `` `T`.`col` ``; bare `FROM InventoryStock` and `InventoryStock.id` renamed; names inside `'…'`/`"…"` literals untouched; column `quotationId` untouched; already-prefixed `sbx_T` untouched (idempotent); `` `db`.`T` `` renamed; guard throws on a contrived survivor.

### Task 3: Adapter wrapper + copy builder — `src/lib/sandbox/adapter.ts`, `src/lib/sandbox/refresh.ts`
- `sandboxAdapter(factory: SqlDriverAdapterFactory, tables): SqlDriverAdapterFactory` — wraps `connect()` → adapter whose `queryRaw`/`executeRaw`/`executeScript` rename and whose `startTransaction()` returns a wrapped transaction.
- `refreshStatements(tables: string[], fks: Fk[]): string[]` (pure; tested: every statement's written identifier starts with `sbx_`; FK constraint names ≤ 64 chars and unique).
- `refreshSandboxCopy(client: PrismaClient): Promise<{ tables: number; ms: number }>` — reads FKs from `information_schema`, runs statements on one connection with `FOREIGN_KEY_CHECKS=0`. Last-refresh time = `information_schema.TABLES.CREATE_TIME` of `sbx_User` (`lastRefreshAt(client)`).
- DB test (`refresh.db.test.ts`, local only): after refresh, every model table has an `sbx_` twin with equal row count; sandbox client edit/create/delete + cascade touch only `sbx_`; real `CHECKSUM TABLE` unchanged; raw reserve-style SQL works.

### Task 4: Routing — `src/lib/sandbox/headers.ts`, `context.ts`, `src/lib/prisma.ts`
- `markSandboxHeaders(incoming, token)` (pure, tested); `currentSandbox(): Promise<string | null>` (user id).
- `prisma.ts`: routed Proxy. Model delegate methods → `currentSandbox().then(s => (s ? sandbox() : base())[delegate][method](...args))`; `$transaction(fn|array)`, `$queryRaw*`, `$executeRaw*` → same choice (array form → `Promise.all`, `ponytail:` ceiling note); other props → base. Sandbox client: `new PrismaClient({ adapter: sandboxAdapter(new PrismaMariaDb({ ...poolConfig(url), connectionLimit: 2 }), ALL_TABLES) })`, globalThis-cached.
- Test: routed proxy with injected picker — normal path calls base; sandbox path calls sandbox; array tx works; existing `prisma.test.ts` passes.

### Task 5: Identity — middleware, auth, rbac
- auth.ts `isSandbox` in Session/User/JWT; authorize skips lastLogin + LOGIN audit for sandbox; jwt re-verify refreshes it.
- middleware: `/api/:path*` in matcher; `authorized` lets `/api/*` through to the route's own auth; set headers via `markSandboxHeaders` (null token for `/api/auth/*`).
- rbac: 500 if `session.user.isSandbox` and no `currentSandbox()`.

### Task 6: Side effects
- mailer `sendMail` stub for sandbox; master-cache bypass for sandbox. Unit tests with `vi.mock("@/lib/sandbox/context")`.

### Task 7: Refresh triggers + UI
- `src/app/api/cron/sandbox-refresh/route.ts` (Bearer `CRON_SECRET`, 503 if unset — same pattern as `cron/rfq-reminders`), `vercel.json` cron `30 21 * * *` (03:00 IST).
- `src/app/api/sandbox/reset/route.ts` (sandbox session only → `refreshSandboxCopy(base)`), `GET` returns last refresh time.
- `src/components/layout/sandbox-banner.tsx` + layout render.

### Task 8: End-to-end checks 1–8 (`vitest.e2e.config.ts`, `e2e/`)
As listed in the spec's Verification section, against `next dev -p 3100` on the local DB with a fake SMTP listener and `general_log`.

### Task 9: Docs, graph, review, report
- `docs/code` mds + INDEX; graphify rebuild; `vitest run`, `tsc --noEmit`; quality-guardian; report incl. deploy steps (migration, seed Akash with prod company id, first copy, `CRON_SECRET`) — deploy only on the user's go-ahead.
