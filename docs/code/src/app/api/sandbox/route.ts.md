# src/app/api/sandbox/route.ts

> `/api/sandbox` — GET, POST. The sandbox banner's endpoint; sandbox logins only.

## Why this exists

The sandbox login needs to see how old its copy is and to be able to start
over. See [the sandbox module](../../../lib/sandbox/README.md).

## What it does

- **GET** → `{ lastRefreshAt }` — when the `sbx_` copies were last rebuilt.
- **POST** ("Reset Sandbox") → rebuilds the copies from real data now
  (`refreshSandboxCopy`), discarding the sandbox user's changes; returns
  `{ tables, ms, lastRefreshAt }`.
- 401 without a session; **403 for any non-sandbox user**; **429** if the last
  refresh finished less than 2 minutes ago (`SANDBOX_RESET_COOLDOWN_MS`
  overrides, for the e2e test only); **409** if a refresh is already running.

## How it works

`checkAuth()` then `session.user.isSandbox`. The refresh itself uses its own
client on the real database URL (it must read the real tables as the source).
`lastRefreshAt` reads `information_schema` through `realPrisma`.

## Gotchas and constraints

- A reset takes seconds and briefly breaks sandbox queries while the copies
  are rebuilt; the banner reloads the page when it finishes.
- `maxDuration` 60 s.

## Related

- `src/components/layout/sandbox-banner.tsx`, `src/lib/sandbox/refresh.ts`,
  `src/app/api/cron/sandbox-refresh/route.ts`.
