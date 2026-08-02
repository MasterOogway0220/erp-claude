# src/lib/prisma.ts

> The single Prisma client, wired to MariaDB through the adapter and cached on
> `globalThis`.

## Why this exists

Every model access in the app imports this. It is a small file with two
non-default decisions worth knowing before touching it.

## What it does

Exports `prisma`, a `PrismaClient` using `@prisma/adapter-mariadb`, cached on
`globalThis`.

## How it works

### Why an adapter rather than a connection string

Prisma's built-in MySQL connector is not used. The database is **MariaDB**, not
MySQL, and `PrismaMariaDb` speaks its dialect properly. `DATABASE_URL` is
parsed manually with `new URL()` and fed to the adapter as discrete fields.

`decodeURIComponent` on username and password matters: these are percent-encoded
in the URL, and a password containing `@` or `/` — common in generated
credentials — authenticates incorrectly without it.

### Pool settings

```
connectionLimit: 5
connectTimeout:  10_000
socketTimeout:   30_000
```

Five is low because the host is **shared hosting** with a cap on concurrent
connections, and serverless makes that worse: every warm lambda holds its own
pool, so the effective total is 5 × instances. Raising this is the fastest way
to start seeing connection errors under load.

Note the server's own `wait_timeout` is **20 seconds** — shorter than the
30-second socket timeout. The server will drop an idle connection before the
client gives up on it.

### The `globalThis` cache

Standard Next.js pattern, but the comment is explicit that it applies in
**production too**, not just dev hot-reload. Some Node hosts re-evaluate
modules; without the cache each evaluation builds a new pool against a host
that has few connections to spare.

## Domain notes

None.

## Gotchas and constraints

- **`prisma migrate dev` does not work against this host.** Shared hosting
  denies `CREATE DATABASE`, which Prisma needs for its shadow database. The
  working procedure is to hand-write `migration.sql` and run
  `prisma migrate deploy`, then verify with `SHOW COLUMNS`. Every migration in
  this repo was authored that way.
- Logging is `["error","warn"]` in development and `["error"]` in production.
- No `$connect()`; the client connects lazily on first query.
- A transient failure here surfaces in odd places — the NextAuth `jwt` callback
  explicitly catches DB errors so an outage does not delete session cookies.

## Related

- `prisma/schema.prisma`
- `src/lib/rbac.ts` — `companyFilter`, applied to most queries.
- `src/lib/auth.ts` — the DB-error tolerance in the `jwt` callback.
