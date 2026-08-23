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

Lists every top-level folder under `src/app/(dashboard)` explicitly, plus `/`.
`/login`, `/api/auth/**` and static assets are deliberately outside it.

**It used to carry a `"/(dashboard)(.*)"` entry that protected nothing.**
`(dashboard)` is a Next.js *route group*: it organises files without appearing
in any URL, so no request path can ever contain `/(dashboard)` and that pattern
could not match. It read as "every dashboard route is covered", and six were
not — `/alerts`, `/client-purchase-orders`, `/po-acceptance`, `/po-tracking`,
`/tenders` and `/warehouse` all answered a signed-out visitor with 200 instead
of redirecting.

Nothing leaked: those are client components whose data comes from API routes
that return 401 independently. The exposure was the *next* server component
added under one of those paths, which would have queried the database with no
session check and nothing to flag it.

Found by curling every dashboard route unauthenticated against a local copy of
the database. That check is worth repeating whenever a route tree is added —
it needs no login and takes seconds:

```sh
for p in alerts client-purchase-orders quotations ... ; do
  curl -s -o /dev/null -w "%{http_code} /$p\n" --max-redirs 0 localhost:3000/$p
done
# 307 = protected. 200 = open.
```

## Gotchas and constraints

- **Authentication only, not authorisation.** It does not check roles. API
  routes call `checkAccess`, and role enforcement there is currently disabled.
- **The matcher is a list, so a new top-level route is unprotected until added
  to it.** This is the most likely way to ship an open page — and it is not
  hypothetical: six routes were open this way, while a dead route-group pattern
  made the list look exhaustive. Add the folder to the matcher in the same
  commit that creates it, and never trust a pattern containing a route group.
- Next.js warns that `middleware` is deprecated in favour of `proxy`. It still
  works; migrating is a separate job.

## Related

- `src/lib/auth.ts` — the `jwt` callback that blanks tokens.
- `src/lib/rbac.ts` — the per-route gate.
