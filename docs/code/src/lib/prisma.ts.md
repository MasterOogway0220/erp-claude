# src/lib/prisma.ts

> The single Prisma client, wired to MariaDB through the adapter and cached on
> `globalThis`.

## Why this exists

Every model access in the app imports this. It is a small file with two
non-default decisions worth knowing before touching it.

## What it does

Exports `prisma`, a `PrismaClient` using `@prisma/adapter-mariadb`, cached on
`globalThis`. Each call on it is **routed**: a request that middleware marked as
the sandbox login runs on a second, sandbox client whose SQL is renamed onto the
`sbx_*` table copies; everything else runs on the real client exactly as before.
See [the sandbox module](./sandbox/README.md).

Also exports:

- `realPrisma` — the real client behind the original lazy proxy, never
  routed. Only for reads that must see real data even inside a sandbox request
  (the login lookup and the `jwt` re-verify in `auth.ts`, `lastRefreshAt`).
- `poolConfig(url)` — the pool settings, reused by the sandbox client, seeds
  and the sandbox refresh.

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
minimumIdle:     0        // load-bearing; requires the npm override — see below
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
  warm lambda.
- **`minimumIdle` is `0`, and that is the point.** The cap that actually takes
  this application down is not the 75 concurrent connections but the hosting
  account's `MAX_CONNECTIONS_PER_HOUR` (~500, recorded from the earlier
  lockouts — it counts *new connections*, not concurrent ones, and resets only
  when the hour rolls over). Any non-zero `minimumIdle` means the pool reopens
  whatever the server's 20-second timeout just killed, so connection count
  becomes a function of **wall-clock time rather than of traffic**: at
  `minimumIdle: 1` one warm instance spends roughly 180 connects an hour doing
  nothing at all, and a few warm instances lock the database out before anyone
  logs in. At `0` an idle instance holds nothing and opens a socket only when a
  query needs one. Measured against a socket-counting local server:
  `minimumIdle: 1` produced **5 dials in 12 idle seconds**, `minimumIdle: 0`
  produced **0**. `idleTimeout: 10` still retires a working connection before
  the server does.

  The sibling app `finance-crm` runs the same stack (Next.js on Vercel, Prisma,
  Hostinger MySQL) and has never hit this, because stock Prisma's Rust engine
  pool has no keep-warm minimum — it is lazy by default. This setting is what
  brings the driver-adapter pool back to that behaviour.
- `connectTimeout` must stay well under `acquireTimeout`. Both were 10 000, and
  the driver clamps `connectTimeout` down to `acquireTimeout` — so one slow
  connect consumed the entire acquire window and the request failed instead of
  retrying. At 5 000 / 15 000 the driver's backoff gets two or three attempts
  inside one acquire.

### The `globalThis` cache, and why `prisma` is a Proxy

Standard Next.js pattern, but the comment is explicit that it applies in
**production too**, not just dev hot-reload. Some Node hosts re-evaluate
modules; without the cache each evaluation builds a new pool against a host
that has few connections to spare.

The exported `prisma` is a `Proxy` whose `get` trap builds the real client on
first property access and stores it on `globalThis`. It is not lazy for
elegance — it is lazy because **`next build` evaluates every route module** to
collect page data, and every route that touches the database imports this file.
Reading `DATABASE_URL` at module scope therefore made the *build* depend on a
runtime secret. On Vercel that variable is scoped to the **Production
environment only**, so every preview build failed during page-data collection
with:

```
TypeError: Invalid URL ... { code: 'ERR_INVALID_URL', input: 'undefined' }
Failed to collect page data for /api/admin/audit-logs
```

The named route is a red herring — it is simply whichever route was collected
first. Production builds passed only because the variable happens to exist
there, which is why this went unnoticed for months.

Deferring costs nothing: constructing a `PrismaClient` opens no socket, since
the driver adapter's pool connects lazily on the first query. The only thing
that moves is *when* the URL is read.

Two constraints on that trap, both of which have teeth:

- **Do not also assign `globalForPrisma.prisma = prisma` at module scope.**
  That stores the proxy itself; the `??=` inside the trap then finds it already
  set, and every property access resolves back through the proxy into itself
  and recurses until the stack blows.
- **Functions must be bound to the client.** `Reflect.get` returns `$transaction`
  and friends unbound, and they lose their `this`. Model delegates
  (`prisma.quotation`) are plain properties and need no binding.

A missing `DATABASE_URL` now throws `DATABASE_URL is not set` rather than
`Invalid URL ... input: 'undefined'`, which named neither the variable nor the
file.

### Routing to the sandbox client

Since 2026-09-24 the proxy is built by `routedClient` (`sandbox/router.ts`)
from two lazy factories — the real client and `createSandboxClient()` — plus
`currentSandbox` (reads the `x-erp-sandbox` header). Model calls,
`$transaction` and raw SQL go to whichever the request calls for; lifecycle
methods stay on the real client. The laziness above is preserved: neither
client is built until first use, and the sandbox one only by a sandbox request.

The sandbox client wraps the MariaDB adapter with `sandboxAdapter` and has its
own pool of **2** connections (not 1: route code sometimes calls `prisma.*`
inside a `$transaction` callback, which needs a second socket).

## Domain notes

None.

## Gotchas and constraints

- **`prisma migrate dev` does not work against this host.** Shared hosting
  denies `CREATE DATABASE`, which Prisma needs for its shadow database. The
  working procedure is to hand-write `migration.sql` and run
  `prisma migrate deploy`, then verify with `SHOW COLUMNS`. Every migration in
  this repo was authored that way.
- **Routed model calls start immediately** (plain Promises, not lazy
  `PrismaPromise`s), so **`prisma.$transaction([...])` throws** — use the
  callback form. See `sandbox/router.ts`.
- The sandbox pool adds up to 2 connections per warm instance serving the
  sandbox login, counted against the same hourly connection cap.
- Logging is `["error","warn"]` in development and `["error"]` in production.
- No `$connect()`; the client connects lazily on first query.
- A transient failure here surfaces in odd places — the NextAuth `jwt` callback
  explicitly catches DB errors so an outage does not delete session cookies.
- **The `overrides` block in `package.json` is load-bearing. Deleting it is an
  outage.**

  ```json
  "overrides": { "@prisma/adapter-mariadb": { "mariadb": "$mariadb" } }
  ```

  `@prisma/adapter-mariadb` depends on `mariadb` at the **exact** version
  `3.4.5`, so without the override npm nests that copy inside the adapter and
  the `^3.5.1` hoisted to the top level never loads. The adapter always loads
  whichever copy resolves from *its own* directory, so anything verified
  against the top-level one is meaningless. The `$mariadb` form is required
  rather than a literal `"3.5.1"`: npm silently ignores an override on a
  package the root also depends on directly unless the spec is referenced this
  way, and `$mariadb` resolves to the root's own `^3.5.1`.

  The two versions disagree about `minimumIdle: 0`. In 3.4.5 the decision to
  open a socket is `idleConnections.length < opts.minimumIdle`, which with `0`
  is false forever — the pool never opens a single connection, and every query
  in the application waits out `acquireTimeout` and fails with `active=0
  idle=0`. 3.5.1 rewrote it to also open on demand for a pending request.
  Measured by counting TCP dials against a local server: on one query,
  **3.4.5 dialled 0 times, 3.5.1 dialled 4**. A `minimumIdle: 0` was once
  shipped against 3.4.5 and took production down for roughly 40 minutes while
  the database itself was idle and healthy.

  `prisma.test.ts` resolves the driver exactly as the adapter does and asserts
  a socket is actually attempted, so the config and the override cannot drift
  apart silently.

- **Changing anything about the adapter's version invites npm to move it.**
  `npm install @prisma/adapter-mariadb` (the only way found to make npm
  re-resolve that subtree after the override was added — plain `npm install`
  reports "up to date" and ignores it) also bumped the adapter from 7.4.2 to
  7.10.0 while `@prisma/client` stayed at 7.3.0. Re-pin it deliberately;
  adapter/client skew is not something the test suite checks.
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
- `src/lib/sandbox/` — the router, the SQL renamer, the table copies.
