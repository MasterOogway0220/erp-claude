# src/middleware.ts

> Route-level auth. Runs before any page or API handler and redirects
> unauthenticated requests to `/login`.

## Why this exists

Without it, every page would need its own session check, and one forgotten
check is an unprotected screen. This gates whole route trees at the edge.

## What it does

Wraps `withAuth` from `next-auth/middleware`. Redirects unauthenticated users
to `/login`, and sends a `SUPER_ADMIN` with no active company to `/superadmin`.

## How it works

### `authorized: ({ token }) => !!token?.id`

Not `!!token`. A **blanked token** — what the `jwt` callback returns for a
deactivated user or an expired absolute session — still decodes to a truthy
object. Testing `!!token` would let those through to a page that then crashes
reading `session.user.id`. Requiring `id` is what makes the blanking mechanism
work as a logout.

### The super-admin redirect

A `SUPER_ADMIN` with no `activeCompanyId` cookie is bounced to `/superadmin` to
pick one. Without a company selected, `companyFilter` returns `{}` and every
query would run unscoped across all three companies.

### The matcher

Lists route trees explicitly — `/`, `(dashboard)`, `/masters`, `/quotations`,
`/sales`, `/purchase`, `/inventory` and so on. `/login`, `/api/auth/**` and
static assets are deliberately outside it.

## Gotchas and constraints

- **Authentication only, not authorisation.** It does not check roles. API
  routes call `checkAccess`, and role enforcement there is currently disabled.
- **The matcher is a list, so a new top-level route is unprotected until added
  to it.** This is the most likely way to ship an open page.
- Next.js warns that `middleware` is deprecated in favour of `proxy`. It still
  works; migrating is a separate job.

## Related

- `src/lib/auth.ts` — the `jwt` callback that blanks tokens.
- `src/lib/rbac.ts` — the per-route gate.
