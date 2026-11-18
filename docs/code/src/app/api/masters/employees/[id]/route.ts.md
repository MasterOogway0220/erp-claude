# src/app/api/masters/employees/[id]/route.ts

> `/api/masters/employees/[id]` — GET, PATCH, DELETE

See [../../README.md](../../README.md) for this module's shared behaviour, and
[the API pattern](../../../README.md) for the conventions every route follows.

## What it does

Operates on `employeeMaster`, `user`.

- **GET** — Read
- **PATCH** — Partial update / status change. Also updates the linked login
  (name, email, role, password, active flag).
  - **404** `"Employee not found"` if the id is not in the caller's company.
  - **403** if the body touches the login and `userWriteError` refuses.
  - **400** if a `password` is sent and is shorter than `MIN_PASSWORD_LENGTH`
    (12).
- **DELETE** — Delete

## How it works

- Gated by `checkAccess("masters", "delete")`, `checkAccess("masters", "read")`, `checkAccess("masters", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- PATCH looks the employee up first, with its linked user's **current** role,
  before writing anything. If the body sets `role`, `email`, `password` or a
  boolean `isActive`, it runs `userWriteError(session role, linked user's
  role, body.role)`. This stops an ADMIN resetting the password of (or
  deactivating) an employee whose login is the SUPER_ADMIN, which would hand
  them the cross-company account.
- A short password used to be **silently ignored** (the update succeeded, the
  old password stayed, nobody was told). It is now a 400.
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- `name` alone is not treated as touching the login, so it is not checked by
  `userWriteError`, yet it is copied onto the linked user's name.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../README.md)
