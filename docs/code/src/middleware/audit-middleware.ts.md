# src/middleware/audit-middleware.ts

> Helpers for capturing request context into audit entries.

## Why this exists

An audit row is more useful with the IP address and user agent attached — "who
approved this and from where" is a question the ISO process expects an answer
to.

## What it does

Extracts request metadata for the audit logger.

## Gotchas and constraints

- **This is not Next.js middleware.** It lives in `src/middleware/`, a plain
  directory; the real edge middleware is `src/middleware.ts`. The similar names
  are confusing and the file cannot run as middleware — it is a helper module.
- IP comes from proxy headers (`x-forwarded-for`), which are only trustworthy
  behind a proxy that sets them. On Vercel they are.
- Not universally applied — many routes write audit rows without it.

## Related

- `src/lib/audit/audit-logger.ts` — the consumer.
- `src/middleware.ts` — the actual edge middleware.
