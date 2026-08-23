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
connectionLimit: Number(process.env.DB_POOL_SIZE) || 5
minimumIdle:     1        // MUST NOT be 0 — see below
idleTimeout:     10       // seconds
connectTimeout:  5_000
acquireTimeout:  15_000
socketTimeout:   30_000
```

`connectionLimit` is bounded by the host being **shared hosting** with a
per-user cap on concurrent connections — 75, recorded as
`SERVER_MAX_USER_CONNECTIONS` in the file and asserted in `prisma.test.ts`.

The right value depends entirely on **how many processes there are**, which is
a property of the deployment and not of the code — hence the `DB_POOL_SIZE`
environment variable rather than a hardcoded number:

- **Vercel — the only deployment today: unset, so 5.** This is 5 *per lambda
  instance*, and the application-wide total is 5 × however many happen to be
  warm — not a number anyone controls. Raising it here is the fastest way to
  exhaust the cap, so it stays unset in production.
- **A single long-lived process** (a container or VM, should the app ever move
  to one) wants the opposite: there the pool is the entire application budget
  for concurrent queries, and 5 would make a handful of simultaneous users
  queue behind `acquireTimeout` and receive the same `pool timeout` error that
  a move off serverless would exist to eliminate — an identical-looking failure
  with a completely different cause. Roughly 10 is right there, and only there.

**The default must stay low**, because every warm instance draws from one
75-connection cap. A container deployment was prepared once (`Dockerfile` and
`render.yaml`, commit `5e300cd`) and later dropped in favour of staying on
Vercel; the files are removed but recoverable from git history if that decision
is revisited.

The other four exist because of a specific outage, and the reasoning matters
more than the numbers:

- The server's `wait_timeout` and `interactive_timeout` are **20 seconds**
  (`SERVER_WAIT_TIMEOUT_SEC` in the file records this). The driver's
  `minimumIdle` defaults to `connectionLimit`, so the pool used to keep five
  sockets warm that the server killed every 20 seconds — measured at **20 fresh
  connections per 70 seconds of a completely idle instance**, forever, on every
  warm lambda. Holding **one** instead of five cuts that by 80%;
  `idleTimeout: 10` retires anything above `minimumIdle` before the server
  does.
- **`minimumIdle` must never be `0`.** See the gotcha below — a zero here takes
  the entire application down.
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
- **There are two copies of the `mariadb` driver installed, and the one that
  matters is not the obvious one.** `@prisma/adapter-mariadb` bundles its own
  nested `mariadb` (3.4.5 at the time of writing); npm also hoists a different
  version (3.5.1) to the top level. The adapter loads *its* nested copy, so
  anything you verify against the top-level one may be meaningless.

  The two disagree about `minimumIdle: 0`. In 3.4.5 the decision to open a
  socket is `idleConnections.length < opts.minimumIdle`, which with `0` is
  false forever — the pool never opens a single connection, and every query in
  the application waits out `acquireTimeout` and fails with
  `active=0 idle=0`. 3.5.1 rewrote it to also open on demand for a pending
  request, so `0` is harmless there. A `minimumIdle: 0` was shipped on that
  basis and took production down for roughly 40 minutes while the database
  itself was idle and healthy. `prisma.test.ts` now resolves the driver the way
  the adapter does and asserts the pool actually attempts a connection.
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
