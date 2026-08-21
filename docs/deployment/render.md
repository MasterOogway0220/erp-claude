# Deploying to Render

> How this app is hosted, why it moved off Vercel, and what to measure during
> the one-month trial before deciding whether to keep it here.

## Why this move exists

Users reported two symptoms, repeatedly: **"I can't log in"** and **"it won't
save."** Both are the same fault.

The app ran on Vercel serverless, which means many short-lived instances, each
opening its own MySQL connection pool, from a rotating set of egress IP
addresses. The database is Hostinger *shared* MySQL, whose limits are not ours
to change (measured on `srv1128.hstgr.io`, 2026-08-21):

| Setting | Value | Consequence |
|---|---|---|
| `max_user_connections` | 75 | shared by every instance at once |
| `wait_timeout` | 20s | an idle socket is killed after twenty seconds |
| `interactive_timeout` | 20s | same |
| `Aborted_connects` (lifetime) | 918,270 | how often this has already gone wrong |

Hostinger's firewall also auto-bans IPs that reconnect too aggressively. That
ban is what caused the 2026-08-14 outage, and it is why `vercel.json` pinned
`regions: ["sin1"]` — commit `5764432` moved the functions from `bom1` to
`sin1` purely to obtain egress IPs Hostinger had not yet banned.

When the pool cannot get a socket, the error is
`pool timeout ... (active=0 idle=0 limit=N)`. Then:

- **Login breaks** because `authorize()` starts with `prisma.user.findUnique`,
  and NextAuth collapses every failure into one generic code. See
  `src/lib/auth/db-down.ts`, which exists solely to stop the login page
  blaming the user's password for a network fault.
- **Saves break** because the route waits out `acquireTimeout` (15s) and
  returns a 500.

On 2026-08-21 this was still happening: 100+ pool timeouts between 12:06 and
12:21 UTC across `/api/alerts`, `/api/auth/session`,
`/api/auth/callback/credentials`, `/api/masters/*` and `/api/quotations/*`.

**One long-lived process on a fixed set of outbound IPs removes the cause.**
Instead of dozens of pools churning connections, there is one pool of ten,
opened once, from IPs that can be allowlisted permanently.

## What this does and does not fix

**Fixed:** connection churn, rotating egress IPs, firewall auto-bans, cold
starts, and reconnecting on every request.

**Not fixed:** the database is still Hostinger shared MySQL. The 75-connection
cap and the 20-second `wait_timeout` still apply — we simply stop provoking
them. If the box itself has a bad day, the app still has a bad day. Moving the
database to a managed MySQL is the remaining step, and is the thing to discuss
if the trial month is not clean.

## Cost

| Item | Plan | Cost |
|---|---|---|
| Web service | Standard — 2 GB RAM, 1 CPU | $25/mo |
| Cron job (`rfq-reminders`) | Starter, billed per second | ~$1/mo |
| Workspace | Hobby, 5 GB bandwidth | $0 |

**Standard is the floor, not a preference.** Starter is 512 MB, and a single
Chromium PDF render wants 300 MB–1 GB on top of the Next.js server. Free
instances additionally spin down after 15 minutes of inactivity and take about
a minute to wake, which for an internal ERP means the first person in each
morning waits a minute and may see a database error while the pool re-warms.

Watch bandwidth: PDFs are the bulk of egress. Hobby includes 5 GB/mo; the next
tier up is $25/mo.

## Prerequisites

- The repo pushed to GitHub, with Render granted access.
- The current production environment variables. Get them from Vercel rather
  than retyping: `vercel env pull .env.production` (the Vercel CLI is already
  authenticated as `adi0820` on the `erp-claude` project).

## Deploy

### 1. Create the services

Render Dashboard → **New** → **Blueprint** → select this repo. It reads
`render.yaml` and creates two services:

- `nps-erp` — the web service, built from `Dockerfile`
- `nps-erp-rfq-reminders` — the cron job that replaces the `vercel.json` entry

Every environment variable is declared `sync: false`, so Render prompts for
each value rather than storing secrets in git.

### 2. Set the environment variables

| Variable | Value |
|---|---|
| `DATABASE_URL` | unchanged — same Hostinger database |
| `NEXTAUTH_SECRET` | unchanged |
| `NEXTAUTH_URL` | **must change** — the Render URL at first, then `https://erp.n-pipe.com` after DNS cutover |
| `NEXT_PUBLIC_BASE_URL` | **must change**, same as above |
| `CRON_SECRET` | unchanged; set it on *both* services |
| `APP_URL` | cron service only — the app's public URL |
| `SETUP_SECRET`, `ADMIN_PASSWORD`, `GST_API_TOKEN` | unchanged |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | unchanged |
| `OTP_ENABLED`, `NEXT_PUBLIC_OTP_ENABLED`, `NEXT_PUBLIC_PRODUCTION_MODE` | unchanged |

> **`NEXT_PUBLIC_*` are compiled into the browser bundle at build time.**
> Changing one requires a redeploy, not a restart. Render passes service
> variables to the Docker build automatically; the `ARG` lines in `Dockerfile`
> are what make them visible to `next build`.

### 3. Allowlist Render's outbound IPs in Hostinger — do not skip this

Without this step the app cannot reach the database at all and every user sees
a login failure.

1. Render Dashboard → the `nps-erp` service → **Connect** dropdown →
   **Outbound** tab. Copy the IP ranges listed there. They are fixed per
   region and do not rotate, which is the entire point of this move.
2. hPanel → **Databases** → **Remote MySQL** → add each address.

If hPanel rejects a CIDR range such as `216.24.60.0/24`, add the individual
addresses Render lists instead. Do **not** reach for `%` (allow any host) as a
shortcut — that opens the database to the whole internet with only the
password in front of it.

### 4. Verify before touching DNS

Against the temporary `*.onrender.com` URL:

```bash
curl -s "https://<service>.onrender.com/api/health?deep=1"
```

Expect `tcp.reachable: true` and `driver.connected: true`. `TCP_TIMEOUT` here
means step 3 was missed or incomplete.

Then check by hand, because these are the paths that have actually broken:

- [ ] Log in as a normal user.
- [ ] Open a quotation, edit it, save it. Reload and confirm it persisted.
- [ ] Download one PDF — an invoice or an MTC certificate. This proves
      Chromium works in the container; it is the part most likely to fail.
- [ ] Upload a file and open it again (uploads live in the database as
      `StoredFile`, so no persistent disk is needed — see
      `src/app/api/upload/route.ts`).
- [ ] Trigger the cron job manually from the Render dashboard and confirm a
      200, not a 401.

### 5. Cut DNS over

Render Dashboard → **Settings** → **Custom Domains** → add `erp.n-pipe.com`,
then update the DNS record as instructed. Set `NEXTAUTH_URL` and
`NEXT_PUBLIC_BASE_URL` to the real domain and redeploy (a redeploy, because
`NEXT_PUBLIC_BASE_URL` is build-time).

**Keep the Vercel project deployed but idle for the trial month.** It is the
rollback: point DNS back and you are live again in minutes. Do not delete
`vercel.json` until the trial is over.

## Speed — what to expect, and what to watch

Two changes should make it *faster* than Vercel:

- **No cold starts.** A paid Render instance runs continuously. Vercel froze
  idle functions, and the first request after a freeze paid both the function
  boot and a fresh database connect.
- **A warm pool.** The same ten connections are reused for the life of the
  process instead of being opened and discarded per instance.

One change could make it slower, and is the thing to watch:

- **One CPU, shared.** Vercel scaled horizontally; Render Standard is a single
  1-CPU instance. A Chromium PDF render is CPU-heavy, so a large dossier
  render can make the app feel sluggish for everyone at that moment. With a
  handful of concurrent users this should be invisible; if it is not, the
  first lever is Pro (2 CPU, 4 GB, $85/mo) — at which point moving the
  database to a managed host is likely the better spend.

Database latency is unchanged: Render Singapore to Hostinger Mumbai is the
same hop Vercel's `sin1` region was already making.

### Trial checkpoints

Check weekly, in the Render dashboard and via `vercel logs`-equivalent
(Render → **Logs**):

| Metric | Where | Healthy |
|---|---|---|
| `pool timeout` occurrences | Render logs, search the phrase | **zero** |
| Failed logins that were really DB outages | search `[auth] re-verify skipped` | zero |
| Memory | Render → Metrics | steady; a sawtooth that climbs means a Chromium leak |
| CPU during a PDF render | Render → Metrics | returns to baseline promptly |
| Page response time | subjective, ask the users | no worse than Vercel |

**If `pool timeout` still appears after this move, the app is no longer the
variable — the database host is,** and the remaining fix is to move MySQL off
Hostinger shared hosting.

## Gotchas

- **`numInstances` must stay 1.** Every extra instance is another pool of ten
  against a 75-connection cap. Scaling this service horizontally recreates the
  original bug.
- **No health check path is configured, deliberately.** `/api/health` runs
  `SELECT 1` and returns 503 when the database is unreachable. Wiring that to
  Render's health check would restart the app during a database blip, turning
  a brief outage into a restart loop. Render still verifies the port is
  listening on deploy.
- **`connectionLimit` is 10** (`src/lib/prisma.ts`). On Vercel it was 5 *per
  instance*; here it is the whole application's budget. A test asserts it
  stays under a third of the server's cap.
- **Chromium fonts.** The image installs `fonts-liberation` and
  `fonts-noto-core`. Without them the rupee sign and any non-Latin text render
  as empty boxes on documents that go to clients — silently, with no error.
- **`dumb-init` is PID 1** so orphaned Chrome processes get reaped. On Vercel
  the lambda was discarded after each request and leaks did not accumulate;
  this container runs for weeks.
- **The build needs a `DATABASE_URL`, but not a real one.** `next build`
  evaluates every route module to collect its exported config, which imports
  `src/lib/prisma.ts`, which parses `new URL(process.env.DATABASE_URL!)` at
  module scope. Without a value the build dies on the first API route with
  `TypeError: Invalid URL`. Vercel exposed the real variable to its builds so
  this was invisible there. The `Dockerfile` supplies a placeholder scoped to
  the build command only, so it never persists into the image.
- **The build needs devDependencies.** `typescript`, `tailwindcss` and
  `babel-plugin-react-compiler` are in `devDependencies` and `next build`
  needs them, which is why `NODE_ENV=production` is set only *after* the
  build in `Dockerfile`.
- **`.env` is excluded via `.dockerignore`.** It holds live production
  credentials and must never be baked into an image.

## Related

- `Dockerfile`, `render.yaml`, `.dockerignore`
- `src/lib/prisma.ts` — pool tuning and why each number is what it is
- `src/lib/auth/db-down.ts` — why a DB outage used to read as a bad password
- `src/lib/pdf/render-pdf.ts` — browser resolution order; Render uses
  `CHROMIUM_EXECUTABLE_PATH`, set in the image
- `vercel.json` — the previous deployment, kept as rollback
