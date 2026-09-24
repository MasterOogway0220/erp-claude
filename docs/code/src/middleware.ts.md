# src/middleware.ts

> Route-level auth. Runs before any page or API handler and redirects
> unauthenticated requests to `/login`.

## Why this exists

Without it, every page would need its own session check, and one forgotten
check is an unprotected screen. This gates whole route trees at the edge.

## What it does

Wraps `withAuth` from `next-auth/middleware`. Redirects unauthenticated users
to `/login`, and sends a `SUPER_ADMIN` with no active company to `/superadmin`.

On `/api/*` it does no auth (routes answer 401 themselves) and only sets the
**sandbox marker**: any client-sent `x-erp-sandbox` header is deleted, and for
a verified sandbox token (`isSandbox`, read with `getToken`) it is set to the
user id. That header is what routes a request's queries onto the `sbx_*`
copies. See [the sandbox module](./lib/sandbox/README.md).

## How it works

### Two handlers: `/api/*` first, then `withAuth` for pages

The default export checks the path. `/api/*` is handled directly — decode the
token, strip/set the sandbox header, pass through. Everything else goes to the
`withAuth`-wrapped page handler.

The split exists because **`withAuth` returns without calling its handler for
anything under `/api/auth`** (next-auth's own base path). `/api/auth` is not
only NextAuth: `change-password` lives there and writes `User` + `AuditLog`.
With the marker set inside `withAuth`, a sandbox password change went to the
real tables — caught in review and pinned by `e2e/sandbox.e2e.ts`.

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

Lists every top-level folder under `src/app/(dashboard)` explicitly, plus `/`,
plus `/api/:path*` (for the sandbox marker only). `/login` and static assets
are deliberately outside it.

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
- **Do not move the sandbox marking back inside `withAuth`** — see above.
- **The `/api/:path*` matcher entry is a security boundary for the sandbox.**
  Remove it and a client could send `x-erp-sandbox` itself (and the sandbox
  login's requests would run on real tables — `checkAccess` refuses those with
  a 500 as a backstop).
- Next.js warns that `middleware` is deprecated in favour of `proxy`. It still
  works; migrating is a separate job.

## Related

- `src/lib/auth.ts` — the `jwt` callback that blanks tokens.
- `src/lib/rbac.ts` — the per-route gate.
- `src/lib/sandbox/headers.ts` — `markSandboxHeaders`.
