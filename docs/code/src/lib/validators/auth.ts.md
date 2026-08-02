# src/lib/validators/auth.ts

> Login form schema and the password policy.

## Why this exists

Password rules have to be applied in more than one place — setting a password,
changing one, an admin resetting another user's — and they must agree. A policy
enforced on one screen and not another is not a policy.

## What it does

| Export | Purpose |
|---|---|
| `loginSchema` | Zod schema for the login form. |
| `LoginInput` | Its inferred type. |
| `validatePassword(pw)` | `{ isValid, errors[] }` against the policy. |

Policy: at least 8 characters, and at least one uppercase, one lowercase, one
digit and one special character.

## How it works

`validatePassword` accumulates **all** failures rather than returning on the
first. The user sees everything wrong with their password at once instead of
fixing one rule per attempt — four round trips reduced to one.

Each rule is a plain regex test, so the messages map one-to-one to the checks
and stay in step.

Login itself uses Zod (`loginSchema`), but the password policy is hand-rolled
because it must return a list, and Zod's error shape would need unpacking for
no gain.

## Domain notes

The policy is from the project's PRD section 9.2. It is a documented
requirement, not a preference — relaxing it is a spec change.

## Gotchas and constraints

- **Applied at set/change time only.** Existing passwords are not re-checked at
  login; strengthening the policy does not lock anyone out.
- **`loginSchema` is not what protects the login endpoint.** `authorize` in
  `auth.ts` does its own checks; this is form-level validation.
- No maximum length, no dictionary or breach check, no history. bcrypt's own
  72-byte input limit applies silently above that.
- The special-character class is whatever the regex in the file defines —
  check it before telling a user which symbols count.

## Related

- `src/lib/auth.ts` — the real authentication path.
- `src/app/(auth)/login/page.tsx`
- `src/app/api/admin/**` — password reset.
- `scripts/reset-password.js` — the out-of-band reset, which bypasses this.
