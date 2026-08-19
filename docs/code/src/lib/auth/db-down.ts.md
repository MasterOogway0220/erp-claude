# src/lib/auth/db-down.ts

> Tells a database outage apart from a wrong password, so the login screen
> stops blaming the user for an infrastructure failure.

## Why this exists

This is a diagnosis fix, not a connectivity fix.

next-auth collapses every `authorize()` failure into a single generic error
code. `authorize()` starts with `prisma.user.findUnique`, so when the database
cannot be reached that query throws, and the failure reaches the login page
indistinguishable from a bad password. Both login pages then said **"Invalid
email or password"**.

The result has played out twice: the database became unreachable, every user
was told their password was wrong, and hours went into resetting passwords and
checking accounts while the actual fault was a network one.

The underlying fault is that **Hostinger drops this app's connections to
`srv1128:3306`** when the Remote MySQL allowlist stops covering the
deployment's egress IPs. That has already forced one region move — Vercel
functions were relocated `bom1` → `sin1` in commit `5764432` after Hostinger
banned the `bom1` egress ranges on port 3306, and `vercel.json` pins
`"regions": ["sin1"]` to hold that.

**The app cannot fix the outage.** Allowing the connection is a change in
hPanel → Remote MySQL. What the app can do is stop misreporting which of the
two failures happened, so the next occurrence is identified in seconds instead
of hours.

## What it does

| Export | Behaviour |
|---|---|
| `DB_DOWN_MESSAGE` | The message shown in place of "invalid password", naming the real cause and where the fix lives. |
| `databaseIsDown()` | `true` when the database is unreachable. Called only on the sign-in failure path. |
| `interpretHealth(body)` | The decision alone, given a parsed health body — the tested part. |

## How it works

`databaseIsDown()` calls **`/api/health?deep=1`**, not the plain health check.
That matters for timing: the plain check runs a query through Prisma's pool and
takes the full 15s acquire timeout to fail, *on top of* the 15s the sign-in
attempt just spent. The deep probe opens a bare TCP socket and gives up after
5s, so a dropped connection is identified in seconds rather than half a minute.
A 12s `AbortSignal.timeout` bounds it regardless.

`interpretHealth` reads **both** probes the deep endpoint returns:

- `tcp.reachable === false` — packets are being dropped; the firewall case.
- `driver.connected === false` — the network is fine but MySQL itself refused
  the host (*"Host is not allowed to connect"*), which is the same allowlist
  problem one layer up.
- a top-level `error` — `DATABASE_URL` is not set at all.

**Every uncertain answer is `false`.** If the health endpoint times out, 500s,
or returns something unparseable, the user is told their password was wrong.
Telling someone with a genuinely mistyped password that the database is down
would be the same class of mistake in the other direction, and wrong passwords
are far commoner than outages.

## Gotchas and constraints

- **Failure path only.** A successful login never calls this, so it adds
  nothing to normal sign-in time.
- `/api/health?deep=1` is unauthenticated and its response includes `dbConfig`
  (host, port, database name, user — no password). That predates this file;
  this only made calling it routine. Worth revisiting if the endpoint is ever
  hardened.
- Both login pages must stay in sync. They already drifted once — the
  superadmin page carried its own copy of the same message — which is why the
  message and the check live here rather than in either page.

## Related

- `src/app/(auth)/login/page.tsx`, `src/app/(auth)/superadmin/login/page.tsx`
- `src/app/api/health/route.ts` — the probes this reads.
- `src/lib/prisma.ts` — the pool timeouts that make the plain check slow.
- `src/lib/auth.ts` — the `authorize()` whose errors next-auth collapses.
