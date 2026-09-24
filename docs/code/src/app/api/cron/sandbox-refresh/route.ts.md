# src/app/api/cron/sandbox-refresh/route.ts

> `/api/cron/sandbox-refresh` — GET. Nightly rebuild of the sandbox login's
> `sbx_` table copies.

## Why this exists

The sandbox works on a snapshot. Re-taking it every night means the sandbox
user starts each day on current real data. See
[the sandbox module](../../../../lib/sandbox/README.md).

## What it does

Calls `refreshSandboxCopy(DATABASE_URL)` and returns `{ tables, ms }`.
Scheduled in `vercel.json` at `30 21 * * *` (21:30 UTC = 03:00 IST).

## How it works

Same guard as `cron/rfq-reminders`: requires `Authorization: Bearer
$CRON_SECRET`; answers **503 if `CRON_SECRET` is unset**, 401 on a wrong token,
**409** if a refresh (e.g. a sandbox reset) is already running.

## Gotchas and constraints

- Wipes whatever the sandbox user changed that day — by design.
- Needs `CRON_SECRET` set in Vercel production or it never runs.
- `maxDuration` 60 s.

## Related

- `src/lib/sandbox/refresh.ts`, `src/app/api/sandbox/route.ts`, `vercel.json`.
