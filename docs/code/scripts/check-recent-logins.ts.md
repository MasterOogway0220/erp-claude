# scripts/check-recent-logins.ts

> Read-only diagnostic: DB health plus all login and audit activity in a recent
> window.

## Why this exists

The app and database live on different hosts (Vercel and Hostinger shared
MariaDB), so when the client reports "the system was slow" or "someone changed
something", there is no single dashboard to look at. This script answers both
questions from a terminal in one run: is the database healthy right now, and
who did what recently.

## What it does

```bash
source .env && export DATABASE_URL && npx tsx scripts/check-recent-logins.ts
```

Prints, for the last `HOURS` hours (a constant at the top, default 10):

- a `SELECT 1` round-trip time and MySQL global status counters
  (connections, aborts, uptime) — skipped gracefully when the shared host
  denies `SHOW GLOBAL STATUS`;
- every successful login with timestamp, IP and email;
- all audit activity grouped by action × table, sorted by count;
- the 40 most recent audit rows in full;
- every user account with last-login time, active flag and role, flagging any
  account modified inside the window.

## Gotchas and constraints

- Read-only: nothing is written, safe to run against production at any time.
- Login rows exist only because the auth callback writes a `LOGIN` audit row;
  if that ever changes, the logins section goes quiet, not wrong.
- Connects with `connectionLimit: 2` to stay under the shared host's cap.

## Related

- `src/lib/audit.ts` — writes the audit rows this reads.
- `prisma/schema.prisma` — `AuditLog`, `User`.
