# src/lib/auth/otp-client.ts

> Browser-side step 1 of login: submit the password, find out whether a code is
> needed. Shared by both login portals so their failure handling cannot drift.

## Why this exists

Login is two steps when 2FA is on: verify the password and mail a code, then
sign in with password + code. Step 1 is a plain `fetch`, small enough that
copying it into both portals looks harmless.

It is not, because **the failure path is a security boundary**. If a caller
treats a failed step 1 as "carry on" and calls `signIn()` anyway, it skips the
second factor entirely whenever the endpoint is down. That is a
fail-open authentication bug produced by four lines of ordinary-looking error
handling.

One implementation, one place to get it right. The same reasoning produced
`advance-cpo.ts` and `deal-owner.ts`: rules with more than one caller belong in
one file.

## What it does

`requestLoginOtp(email, password)` → a discriminated union:

```ts
{ ok: true;  otpRequired: boolean; sent: boolean }
{ ok: false; error: string }
```

`otpRequired: false` means sign in directly — 2FA is off, or the role is
exempt. `sent: false` alongside `otpRequired: true` means a code exists already
and the cooldown blocked a fresh one.

## How it works

The union is the point. There is no way to read a result without deciding
which branch you are in, so a caller cannot accidentally treat a failure as a
success — which is exactly the mistake being designed out.

Three failure sources, all folded into `ok: false` with text fit to show a
user:

- **Network throw** — "Could not reach the server."
- **401** — "Invalid email or password." Deliberately identical whether the
  address is unknown, the account inactive, or the password wrong. The server
  returns the same 401 for all three; preserving that here keeps the endpoint
  from being an account-enumeration oracle.
- **Any other non-OK** — the server's message, or a generic fallback.

`res.json().catch(() => null)` guards against a non-JSON error body (a proxy
returning HTML), which would otherwise throw *inside* the error handler.

## Domain notes

None.

## Gotchas and constraints

- **The password crosses the wire twice** — once here, once in `signIn`. That
  is the cost of not implementing step 1 inside NextAuth's `authorize`, which
  was rejected because NextAuth v4 collapses `authorize` errors and the page
  could not reliably tell "needs a code" from "wrong password".
- **Callers must not fall through on `ok: false`.** Both portals return early.
  Preserve that.
- **The pages also gate on `NEXT_PUBLIC_OTP_ENABLED`** and skip this call
  entirely when 2FA is off, so normal login stays a single round trip.

## Related

- `src/app/api/auth/otp/request/route.ts` — the endpoint.
- `src/app/(auth)/login/page.tsx`,
  `src/app/(auth)/superadmin/login/page.tsx` — both callers. The super-admin
  portal was added late: without it, enabling 2FA would have locked out the one
  account able to turn it off.
- `src/lib/auth/otp-policy.ts` — `otpRequiredFor`, which the endpoint applies.
