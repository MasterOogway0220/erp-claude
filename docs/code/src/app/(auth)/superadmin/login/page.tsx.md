# src/app/(auth)/superadmin/login/page.tsx

> The super-admin portal login. Same two-step flow as the staff page, plus a
> role check after sign-in.

## Why this exists

`SUPER_ADMIN` can switch between the three companies via the `activeCompanyId`
cookie, which no other role can. The separate portal is the entry point for
that.

**It also had to gain the 2FA step for a specific reason.** This page used to
call `signIn()` with no `otp` field. The moment `OTP_ENABLED` was switched on,
`authorize()` would have rejected every super-admin sign-in with "Login code is
required" — locking out the one account able to turn 2FA back off. Admins are
exempt from the code today, but the page must still handle the step in case
that exemption is ever narrowed.

## What it does

Dark-themed login, then verifies the signed-in user is actually
`SUPER_ADMIN`.

## How it works

Identical two-step logic to the staff page via `requestLoginOtp`, gated on the
same `TWO_FACTOR_UI` flag.

After a successful `signIn`, it fetches `/api/auth/session` and checks the
role. A non-super-admin is signed out and shown "Access denied". Note this is
**cosmetic** — it stops someone landing on the superadmin UI, but the actual
protection is in the middleware and the API.

## Gotchas and constraints

- **Keep this in step with the staff page.** The shared `requestLoginOtp`
  covers the risky part, but the surrounding flow is duplicated. That
  duplication is why the 2FA step was missed here initially.
- The sign-out path calls `signIn("credentials", { redirect: false })` with no
  arguments to clear state, then posts to `/api/auth/signout`. Roundabout, but
  it works.
- The session fetch is wrapped in a `try` that proceeds on failure, so a
  transient error does not block a legitimate super-admin.

## Related

- `src/app/(auth)/login/page.tsx`
- `src/lib/auth/otp-client.ts`
- `src/lib/rbac.ts` — `getActiveCompanyId` and the company-switch cookie.
- `src/middleware.ts` — redirects a super-admin with no active company.
