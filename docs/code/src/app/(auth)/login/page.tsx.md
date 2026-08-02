# src/app/(auth)/login/page.tsx

> The staff login screen — password, and a second step for the emailed code
> when two-factor is on.

## Why this exists

The way into the application for the eight staff accounts.

## What it does

Two-panel layout: branding on the left, the form on the right. One or two
steps depending on whether 2FA is enabled.

## How it works

### Dormant by default

```ts
const TWO_FACTOR_UI = process.env.NEXT_PUBLIC_OTP_ENABLED === "true";
```

With it unset, `handleSubmit` calls `finishSignIn("")` immediately — a single
round trip, exactly as before 2FA existed. This matters: an earlier version
always made a pre-flight call to `/api/auth/otp/request`, which slowed every
login and added a new way for it to fail.

**Set this together with the server-side `OTP_ENABLED`.** Server-only means the
API demands a code the UI never collects; client-only means the UI asks for one
the API ignores.

### The two-step flow

1. `requestLoginOtp(email, password)` — shared with the super-admin portal.
2. On failure, **stop**. Never fall through to `signIn()`; that would skip the
   second factor whenever the endpoint is down.
3. `otpRequired: false` (2FA off, or an exempt admin role) → sign in directly.
4. Otherwise show the code field.

`finishSignIn` takes the code as an **argument** rather than reading state, so
the submit cannot race a `setState`.

### The code input

`inputMode="numeric"` with `pattern`, deliberately **not** `type="number"` —
that strips leading zeros, and `004821` is a valid code. `autoComplete="one-time-code"`
lets iOS offer the code from the notification. Non-digits are stripped and
input is capped at six.

The error text after a rejected code is generic, because NextAuth collapses
`authorize()` failures and the specific reason (expired, too many attempts) is
not available client-side.

## Gotchas and constraints

- **Failure must not fall through.** The early returns are the security
  property.
- The password is sent twice when 2FA is on — once to the OTP endpoint, once to
  `signIn`.
- "Use a different account" resets to step one; the issued code stays valid
  until its TTL.

## Related

- `src/lib/auth/otp-client.ts` — the shared step 1.
- `src/lib/auth.ts` — `authorize`.
- `src/app/(auth)/superadmin/login/page.tsx` — the sibling.
