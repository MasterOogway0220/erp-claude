# src/app/api/admin/users/route.ts

> `/api/admin/users` — GET, POST

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `user`.

- **GET** — Read
- **POST** — Create a login.
  - **400** if the password is shorter than `MIN_PASSWORD_LENGTH` (12).
  - **403** if `userWriteError` refuses: `"Invalid role"` for a role that is
    not a `UserRole` value, or an ADMIN trying to create a `SUPER_ADMIN`.

## How it works

- Gated by `checkAccess("admin", "read")`, `checkAccess("admin", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- POST runs `userWriteError(actorRole, null, role)` (null target: the user does
  not exist yet). This replaced an inline `ADMIN && role === "SUPER_ADMIN"`
  check, which let any other non-SUPER_ADMIN role through and passed unknown
  role strings to Prisma (a 500).

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../README.md)
