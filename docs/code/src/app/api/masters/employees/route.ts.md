# src/app/api/masters/employees/route.ts

> `/api/masters/employees` — GET, POST

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `employeeMaster`, `user`.

- **GET** — Read
- **POST** — Create an employee and the login account linked to it.
  - **400** if `email` is missing or `password` is shorter than
    `MIN_PASSWORD_LENGTH` (12).
  - **403** if `userWriteError` refuses the role: an unknown role string, or a
    non-SUPER_ADMIN creating a `SUPER_ADMIN`.

## How it works

- Gated by `checkAccess("masters", "read")`, `checkAccess("masters", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- The login's role is `body.role` if given, else derived from the department
  name (e.g. "purchase" → `PURCHASE`), else `SALES`. `userWriteError` checks
  that derived role, so the employee screen cannot be used as a side door to
  mint a SUPER_ADMIN that `/api/admin/users` would refuse.
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../README.md)
