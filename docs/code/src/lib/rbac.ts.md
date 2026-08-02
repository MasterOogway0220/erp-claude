# src/lib/rbac.ts

> The API-side access gate: authenticate the request, resolve the active
> company, and return a company filter for queries.
> **Role enforcement is currently disabled by owner decision — read on.**

## Why this exists

Every API route needs the same three things before it can do anything: is
there a valid session, which company is this user acting for, and may they
perform this action. Doing that per route is 208 chances to forget one.

The **company filter** is the part that still matters most. There are three
companies in this database and a query missing its filter silently returns
another company's data.

## What it does

| Export | Purpose |
|---|---|
| `checkAccess(module, action)` | Session check + company resolution. Returns `{ authorized, session, response?, companyId }`. |
| `checkAuth()` | Same, without the module/action arguments. |
| `companyFilter(companyId)` | `{ companyId }` or `{}`, to spread into a `where`. |
| `QA_ROLES`, `MANAGER_ROLES` | Role lists — currently every role. |
| `MODULE_ACCESS` | The role matrix. Retained as documentation and restore path. |

Standard usage:

```ts
const { authorized, response, companyId } = await checkAccess("quotation", "read");
if (!authorized) return response!;
const rows = await prisma.quotation.findMany({ where: { ...companyFilter(companyId) } });
```

## How it works

### What still runs

1. `getServerSession`. No `session.user.id` → 401.
2. `getActiveCompanyId(session)`.
3. Return authorised.

The 401 check is written as `!session?.user?.id` rather than `!session`
deliberately. A **blanked JWT** — which is what the `jwt` callback returns for
a deactivated user or an expired absolute session — decodes to a truthy object
with `user` undefined. Testing `!session` would pass it through and crash later
at `session.user.id`, producing a 500 instead of a clean 401.

### What no longer runs

```ts
// ponytail: RBAC enforcement disabled per owner request (2026-07-16) — every
// authenticated user gets every action.
void MODULE_TO_ACCESS_KEY;
```

The role matrix and the per-employee grant check were removed on request.
`MODULE_ACCESS` is kept because it is still the type source for the `module`
argument, and because it is the specification to restore from. `QA_ROLES` and
`MANAGER_ROLES` were widened to include every role for the same reason.

**The practical consequence:** the only access control left is authentication
plus company scoping. Any logged-in user can call any endpoint. This matters
when reading a route that looks gated — `checkAccess("quotation", "approve")`
reads like an approval gate and is currently just a login check.

`src/lib/access/module-access.ts` has the matching removal on the UI side.
Restoring one without the other gives a sidebar that hides what the API serves,
or the reverse.

### `getActiveCompanyId`

Normally the user's own `companyId`. **SUPER_ADMIN** may switch companies via
an `activeCompanyId` cookie, which is how the superadmin portal operates across
tenants. Everyone else is pinned.

### `companyFilter` returns `{}` for a null company

That is an intentional widening: SUPER_ADMIN with no company selected sees
everything. It is also the sharp edge — spreading `companyFilter(undefined)`
into a `where` silently removes the isolation rather than failing.

The related trap, seen elsewhere in the codebase: passing `undefined` to a
Prisma `where` field drops that condition entirely. `document-numbering.ts`
uses `companyId ?? null` explicitly for this reason.

## Domain notes

**Catalogue data is deliberately unscoped.** `ProductSpecMaster`,
`SizeMaster`, `AdditionalSpecOption` and similar are shared across all three
companies — the physical steel is the same regardless of which entity sells it,
and the test user belongs to a different company from the live data. Routes
serving catalogue masters intentionally omit `companyFilter`, and adding one
would empty the dropdowns for some users. The affected routes carry a comment
saying so.

## Gotchas and constraints

- **Do not read `MODULE_ACCESS` as current behaviour.**
- `AuthResult.session` is typed `any`.
- `checkAccess` is async and hits `getServerSession` on every call; routes
  making several calls should destructure once.
- Company isolation is per query, not enforced at the database.

## Related

- `src/lib/auth.ts` — session and the JWT callbacks.
- `src/lib/access/module-access.ts` — the UI-side twin, same removal.
- `src/middleware.ts` — route-level auth before a handler runs.
