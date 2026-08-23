# src/lib/auth.ts

> NextAuth configuration — credentials login, optional email 2FA, and the JWT
> callbacks that carry role, company and grants into every request.

## Why this exists

The single definition of who is logged in. Everything else — `rbac.ts`,
middleware, the sidebar — reads what this file puts in the token.

## What it does

Exports `authOptions`. Credentials provider (email, password, optional `otp`),
JWT session strategy, 30-day sliding `maxAge`, sign-in page `/login`. Augments the
NextAuth types so `session.user` carries `id`, `role`, `companyId` and
`moduleAccess`.

## How it works

### `authorize`

1. Email and password required.
2. Look the user up, including `employee.moduleAccess`.
3. Reject if absent or `isActive` is false.
4. `bcrypt.compare`.
5. **Second factor**, if `otpRequiredFor(user.role)` — verified *here*, not
   only in the login page, so a direct POST to
   `/api/auth/callback/credentials` cannot skip it.
6. Stamp `lastLogin`, write a `LOGIN` audit row, return the user.

Every failure throws the same `"Invalid credentials"` for unknown user,
inactive user and wrong password — no account enumeration.

`verifyOtp` is called with `user.email` (the database value), not
`credentials.email`. MySQL's collation is case-insensitive, so a user typing
`UCJain@…` matches, and issuing against one casing while verifying another
would never match.

### The `jwt` callback

Three distinct jobs, in order, and the order matters.

**On sign-in** (`user` present): copy id, role, companyId, grants; stamp
`verifiedAt`; stamp **`loginAt` once**. `loginAt` is never refreshed — it is
the anchor for the absolute session cap.

**The absolute 24-hour cap:**

```ts
if (otpEnabled() && sessionExpired(token.loginAt, Date.now())) return {} as typeof token;
```

NextAuth's own `maxAge` is a **sliding window** — the token is re-issued on
every session poll, so an active user never expires. It was 24 hours, which
still logged out anyone idle for a day; it is now 30 days, which covers a
weekend, a holiday or a rep out on site, so in day-to-day use a session ends
when the user signs out. The bound is deliberate: it is the only thing standing
behind the re-verify on a machine shared between shifts.

This OTP check is therefore the single remaining expiry in the system, and it
applies to two-factor logins only. With `OTP_ENABLED` unset — the default —
this branch never runs. Turning 2FA on deliberately buys back a daily
re-authentication for the roles that need one. Returning `{}` blanks the token,
which reads as signed out to `getServerSession` and to the client poller, and
middleware then redirects to `/login`. Same mechanism as the deactivated-user
path below it.

**Periodic re-verification:** every 5 minutes, re-read the user to catch
deactivation, role changes and grant changes mid-session. Throttled because it
was previously a database query on *every* request.

With sessions running 30 idle days this is **the only thing that ends a
session promptly**. These are JWTs: there is no server-side session table, so a
token cannot be revoked — deactivating someone in Employee Master takes effect
when this check next runs and sees `isActive: false`. Lengthening
`REVERIFY_INTERVAL_MS` directly lengthens how long a deactivated account keeps
working, and removing the `isActive` check would leave only the 30-day expiry.
A laptop lost with a live session keeps it until the account is deactivated and
one re-verify lands, and failing that until the expiry.

The `catch` around that query is important: a transient database failure —
Hostinger's connection caps make these real — must not kill the session.
Throwing there makes NextAuth report no session, and on `/api/auth/session`
that **deletes the cookie**, logging the user out over a blip. Instead the
error is logged and `verifiedAt` is nudged to back off about a minute.

### The `session` callback

```ts
if (!token?.id) return {} as unknown as typeof session;
```

A blanked token must produce an empty session object, not `{ user: undefined }`
— the latter is truthy, passes `if (!session)` guards, and crashes at
`session.user.id`. Returning `{}` reads as "no session" everywhere and, unlike
a null body, does not produce `CLIENT_FETCH_ERROR` noise in the browser.

## Domain notes

Roles: `SUPER_ADMIN` (global, can switch company), `ADMIN` (company-level),
then `SALES`, `PURCHASE`, `QC`, `STORES`, `ACCOUNTS`, `MANAGEMENT`. Note there
is **no Director or Purchase Manager** role, which is why the purchase
document's approval hierarchy cannot be mapped directly.

## Gotchas and constraints

- **2FA is off** unless `OTP_ENABLED=true`, and admins are exempt. Enabling it
  without working SMTP locks out every non-exempt user.
- **The absolute cap is gated on `otpEnabled()`.** With 2FA off, sessions
  still slide.
- **`preparedById` and authorship** are not set here, but the same
  "write-once" thinking applies — see `deal-owner.ts`.
- Password comparison is bcrypt; `bcryptjs`, not the native build.

## Related

- `src/lib/auth/otp-policy.ts`, `otp.ts` — the second factor.
- `src/lib/access/module-access.ts` — `parseModuleAccess`.
- `src/lib/rbac.ts` — consumes the session.
- `src/middleware.ts` — requires `token.id`.
- `src/app/(auth)/login/page.tsx`, `superadmin/login/page.tsx`.
