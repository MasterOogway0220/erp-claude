# src/app/(dashboard)/superadmin/ — super-admin screens

Company selection and cross-tenant administration. A `SUPER_ADMIN` with no active company is redirected here by the middleware, because without one every query would run unscoped across all three companies.

## Shared conventions

- Client components using TanStack Query; `DataTable` for lists,
  `PageHeader` for headers.
- Any `Select` needs a non-empty `SelectItem` value — the codebase uses a
  `"NONE"` sentinel mapped to `""`.
- `useSearchParams` requires a `<Suspense>` boundary.
- UI role checks are cosmetic; the API is the boundary.

## Related

- [API module](../../../api/superadmin/README.md)
- `src/components/shared/`
