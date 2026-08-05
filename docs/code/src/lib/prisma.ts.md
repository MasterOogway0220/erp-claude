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

Built by `poolConfig(databaseUrl)`, which is exported (and covered by
`prisma.test.ts`) purely so the tuning can be asserted without opening a socket.

```
connectionLimit: 5
minimumIdle:     0
idleTimeout:     10       // seconds
connectTimeout:  5_000
acquireTimeout:  15_000
socketTimeout:   30_000
```

`connectionLimit` is low because the host is **shared hosting** with a cap on
concurrent connections, and serverless makes that worse: every warm lambda holds
its own pool, so the effective total is 5 × instances. Raising this is the
fastest way to start seeing connection errors under load.

The other four exist because of a specific outage, and the reasoning matters
more than the numbers:

- The server's `wait_timeout` and `interactive_timeout` are **20 seconds**
  (`SERVER_WAIT_TIMEOUT_SEC` in the file records this). The driver's
  `minimumIdle` defaults to `connectionLimit`, so the pool used to keep five
  sockets warm that the server killed every 20 seconds — measured at **20 fresh
  connections per 70 seconds of a completely idle instance**, forever, on every
  warm lambda. `minimumIdle: 0` opens on demand instead; `idleTimeout: 10`
  retires a socket before the server does. Same measurement after the change:
  two connections, and nothing held while idle.
- `connectTimeout` must stay well under `acquireTimeout`. Both were 10 000, and
  the driver clamps `connectTimeout` down to `acquireTimeout` — so one slow
  connect consumed the entire acquire window and the request failed instead of
  retrying. At 5 000 / 15 000 the driver's backoff gets two or three attempts
  inside one acquire.

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
- **The signature of a pool problem** is a 500 from *every* DB-touching route
  at once, with `prisma:error pool timeout: failed to retrieve a connection
  from pool after Nms (pool connections: active=0 idle=0 limit=5)` in the
  Vercel runtime log. `active=0 idle=0` means the pool could not open a single
  connection — look at the host, not at the route that happened to fail. Users
  report it as "cannot save the quotation", because that is the screen they
  were on. Fetch the evidence with
  `vercel logs --environment production --query "status:500" -x`.

## Related

- `prisma/schema.prisma`
- `src/lib/rbac.ts` — `companyFilter`, applied to most queries.
- `src/lib/auth.ts` — the DB-error tolerance in the `jwt` callback.
