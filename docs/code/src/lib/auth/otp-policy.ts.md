# src/lib/auth/otp-policy.ts

> The rules governing the emailed login code and the absolute session lifetime.
> No database, no mail server — just the decisions.

## Why this exists

Split from `otp.ts` for the same reason `storage/policy.ts` is split from
`storage/files.ts`: the rules must be testable without infrastructure. An
authentication policy that cannot be exercised in a unit test is one that gets
verified by logging in and hoping.

The specific rules here have consequences that are hard to walk back in
production — an over-eager expiry locks people out, a missing cooldown lets an
attacker flood an inbox — so each branch is pinned by a test.

## What it does

| Export | Meaning |
|---|---|
| `otpEnabled()` | Is 2FA switched on? Reads `process.env` per call. |
| `OTP_EXEMPT_ROLES` | `["ADMIN", "SUPER_ADMIN"]` — password only. |
| `otpRequiredFor(role)` | Does this role need a code? |
| `OTP_TTL_MS` | 10 minutes. |
| `OTP_MAX_ATTEMPTS` | 5 wrong guesses, then the code is dead. |
| `OTP_RESEND_COOLDOWN_MS` | 60 seconds between mails to one address. |
| `SESSION_ABSOLUTE_MS` | 24 hours from sign-in. |
| `otpUsable(row, now)` | Is a stored code still valid? Returns a typed reason. |
| `sessionExpired(loginAt, now)` | Has the absolute window closed? |
| `generateCode()` | Six digits, zero-padded, `crypto.randomInt`. |
| `OTP_ERRORS` | Reason code → user-facing sentence. |

## How it works

### Off by default, and read per call

`otpEnabled()` reads `process.env.OTP_ENABLED` **on every call** rather than
capturing it at module load. Two reasons. It makes the exemption testable
(a module-load constant cannot be changed by a test), and more importantly it
means flipping the variable in Vercel takes effect on the **next request**
rather than the next cold start. That matters because this variable is the
kill switch: if 2FA starts locking people out, you want it off now, not
whenever the lambda recycles.

Only the exact string `"true"` counts. `"1"`, `"TRUE"`, `"yes"` are all off —
a security feature should not be enabled by an ambiguous value.

### Why admins are exempt

`OTP_EXEMPT_ROLES` is a deliberate, discussed trade-off, not an oversight.

The code is delivered **by email and nothing else**. If SMTP breaks, everyone
subject to 2FA is locked out simultaneously. The accounts that would have to
diagnose and fix that must not themselves depend on mail to sign in. Exempting
the most privileged roles is backwards from a pure security standpoint — an
attacker with an admin password needs nothing else — and it was accepted
because these are the break-glass accounts, and because the eight staff logins
2FA was requested for (sales, management, accounts, stores) are all outside the
exempt list.

If this needs closing later, the answer is TOTP (authenticator app) for admins:
no mail dependency, so no lockout risk, so no reason to exempt.

`otpRequiredFor(null)` and `otpRequiredFor(undefined)` both return **true**. An
unknown role must not fall into the exempt list by accident.

### `otpUsable` returns a reason, not a boolean

A discriminated union, so the caller can map each failure to distinct text via
`OTP_ERRORS` — "that code expired" versus "too many wrong attempts" are
different user situations.

Expiry uses `<=`, so a code dies exactly on its deadline. The attempt check is
`>=`, so `OTP_MAX_ATTEMPTS` wrong guesses burns the code rather than allowing
one more.

### The 24-hour cap is absolute, not sliding

This is the subtle one. NextAuth's own `maxAge: 24 * 60 * 60` looks like it
gives a 24-hour session, but the JWT is **re-issued on every session poll**, so
the window slides forward with activity. A user who keeps a tab open is never
forced to re-authenticate — the config reads as 24 hours and behaves as
indefinite.

`sessionExpired` compares against `loginAt`, which is stamped **once** in the
`jwt` callback when the user object is present and never refreshed. That gives
a genuine hard stop 24 hours after sign-in.

`sessionExpired(undefined, …)` returns **true**: a token with no stamp predates
2FA, and defaulting it to valid would exempt every session in existence from
the cap, permanently.

### `generateCode`

`crypto.randomInt(0, 1_000_000)` — cryptographically secure and unbiased, then
zero-padded. `Math.random()` would be predictable enough to matter for an auth
code. Padding preserves leading zeros, which is why codes are handled as
strings throughout and the input field is not `type="number"`.

## Domain notes

None — this is security infrastructure.

## Gotchas and constraints

- **`otpEnabled()` alone does not show the UI.** The login pages gate on
  `NEXT_PUBLIC_OTP_ENABLED`, a separate client-visible variable. Both must be
  set together: server-only means the API demands a code the UI never collects;
  client-only means the UI asks for a code the API ignores.
- **Do not enable without verifying SMTP.** As of the last audit, production
  had no SMTP variables at all.
- Constants are compile-time. Changing the TTL does not affect codes already
  issued.

## Related

- `src/lib/auth/otp.ts` — the database and mail side.
- `src/lib/auth/otp.test.ts` — every branch here.
- `src/lib/auth.ts` — calls `otpRequiredFor` in `authorize` and
  `sessionExpired` in the `jwt` callback.
- `src/app/api/auth/otp/request/route.ts` — must agree with `authorize` on
  whether a code is required.
