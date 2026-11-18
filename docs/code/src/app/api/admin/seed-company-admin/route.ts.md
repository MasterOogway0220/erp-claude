# src/app/api/admin/seed-company-admin/route.ts

> `/api/admin/seed-company-admin` — POST

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `companyMaster`, `user`.

- **POST** — Create the first ADMIN login for a company. Body: `companyId`,
  `name`, `email`, `password`.
- **403** `"Super Admin only"` unless the caller's role is `SUPER_ADMIN`.
- **400** if a field is missing or the password is shorter than
  `MIN_PASSWORD_LENGTH` (12).

## How it works

- Gated by `checkAccess("admin", "write")`, which is authentication only
  (role enforcement is disabled app-wide), **plus an explicit SUPER_ADMIN
  check** in the route.
- **Not company-scoped, by design.** The target `companyId` comes from the
  request body. That is why the route is SUPER_ADMIN only: before the check,
  any logged-in ADMIN of one company could create an ADMIN account inside
  another company and log in to its data.

## Gotchas

- Do not reuse this as a template for ordinary routes: taking `companyId`
  from the body is only safe because the caller is the cross-company role.
- The password minimum is 12, shared with every other password-setting route
  via `MIN_PASSWORD_LENGTH`; it was 6 before.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../README.md)
