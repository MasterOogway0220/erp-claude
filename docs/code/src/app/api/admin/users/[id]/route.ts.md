# src/app/api/admin/users/[id]/route.ts

> `/api/admin/users/[id]` — GET, PATCH (PUT is an alias of PATCH)

See [../../README.md](../../README.md) for this module's shared behaviour, and
[the API pattern](../../../README.md) for the conventions every route follows.

## What it does

Operates on `user`.

- **GET** — Read
- **PATCH** / **PUT** — Partial update / status change. The admin page calls
  PUT; it is the same function.
  - **404** if the user is not in the caller's company.
  - **403** if `userWriteError` refuses (see below).
  - **400** if a `password` is sent and is shorter than `MIN_PASSWORD_LENGTH`
    (12), or if the caller tries to deactivate their own account.

## How it works

- Gated by `checkAccess("admin", "read")`, `checkAccess("admin", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- The target lookup also loads the user's **current** role, and
  `userWriteError(session role, current role, body role)` runs before any
  write. A non-SUPER_ADMIN cannot grant `SUPER_ADMIN`, and cannot change
  anything at all on an existing SUPER_ADMIN account. The defect this closes:
  the old check only blocked *assigning* SUPER_ADMIN, so an ADMIN could reset
  the super admin's password, log in as it and switch into every company.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../README.md)
