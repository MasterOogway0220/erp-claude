# src/app/api/health/route.ts

> `/api/health` — GET

See [README.md](README.md) for this module's shared behaviour, and
[the API pattern](../README.md) for the conventions every route follows.

## What it does

Reports whether the deployment can reach its database. Two modes:

- **GET `/api/health`** — runs `SELECT 1` through Prisma. `200 healthy` or
  `503 unhealthy` with the error text and the parsed (password-free)
  `DATABASE_URL`. This is the liveness check.
- **GET `/api/health?deep=1`** — skips Prisma entirely and reports *why* a
  connection cannot be opened. Always `200`; read the body.

## How it works

### Why `?deep=1` exists

Prisma's pool reports one thing when the database is unreachable:

```
pool timeout: failed to retrieve a connection from pool after 15000ms
    (pool connections: active=0 idle=0 limit=5)
```

That is the symptom, and it is identical for every underlying cause. `deep`
runs two probes that separate them:

- `tcp` — a bare `node:net` socket to the database host and port, 5s budget.
  Answers "do our packets arrive at all".
- `driver` — a direct `mariadb.createConnection`, 5s budget, reporting the
  driver's `code`, `errno` and full `message` untruncated.

Read them together:

| tcp | driver | Meaning |
|---|---|---|
| `reachable: false`, `TCP_TIMEOUT` | — | Packets are dropped. The host's firewall is blocking this deployment's egress IPs. Not fixable from this repo. |
| `reachable: false`, `ECONNREFUSED` | — | Nothing is listening; wrong host or port. |
| `reachable: true` | `Host '…' is blocked` | MySQL's own `max_connect_errors` cut-off. Cleared by `FLUSH HOSTS` on the server. |
| `reachable: true` | `Host '…' is not allowed to connect` | The IP is missing from the host's remote-access allowlist. |
| `reachable: true` | `Access denied` | Credentials. |
| `reachable: true` | `connected: true` | The network is fine; the fault is in pool configuration — see `src/lib/prisma.ts`. |

The two budgets are run *instead of* the Prisma query, not after it. Chained
after a 15s pool timeout they would push the function past its execution limit
and return nothing at all.

## Domain notes

None.

## Gotchas

- **Unauthenticated, by design** — a health check that needs a session cannot
  report that the database holding sessions is down. It discloses the DB host,
  port, database name and user (never the password), which is what the
  non-deep branch already did before `deep` was added. Do not extend it to
  echo anything else.
- `deep` returns **200 even when everything failed**. The result is the
  payload, not the status code; a 503 here would be indistinguishable from the
  platform's own.
- The header comment says "for Render". The app is deployed on **Vercel**; the
  comment predates the move.
- Errors from the non-deep branch return `error.message`, so thrown text
  reaches the caller.

## Related

- `src/lib/prisma.ts` — the pool whose timeout this endpoint exists to explain.
- [Module overview](README.md)
