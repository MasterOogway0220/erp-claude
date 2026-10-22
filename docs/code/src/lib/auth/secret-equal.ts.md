# src/lib/auth/secret-equal.ts

> Constant-time comparison of a presented secret (cron bearer token, setup header) against the configured one.

## Why this exists

The cron routes, the health deep probe and the setup route each compared secrets with `!==`. That comparison stops at the first differing byte, so response timing can leak a secret one character at a time. A shared helper keeps the fix in one place, and makes the fail-closed rule (no configured secret means no access) the same everywhere.

## What it does

- `secretEquals(given, expected)` returns true only when both are set and equal. A missing `expected` (env var unset) always returns false.
- `bearerMatches(header, expected)` reads the token after `Bearer ` from an `Authorization` header and compares it with `secretEquals`.

## How it works

- Both values are converted to `Buffer`s. `timingSafeEqual` requires equal lengths, so unequal lengths return false before it is called.
- Node's `timingSafeEqual` comes from `node:crypto`; no dependency is added.

## Gotchas and constraints

- Length is not hidden: an attacker learns the secret's length. That is acceptable for the bearer tokens used here.
- The helper does not log or throw; callers return 401 or 503.

## Related

- `src/app/api/cron/rfq-reminders/route.ts`, `src/app/api/cron/sandbox-refresh/route.ts`, `src/app/api/health/route.ts`, `src/app/api/setup/route.ts`
- `secret-equal.test.ts`
