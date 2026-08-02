# src/app/(dashboard)/admin/ — administration screens

User and system administration. Role enforcement is disabled app-wide, so these are gated by authentication only.

## Shared conventions

- Client components using TanStack Query; `DataTable` for lists,
  `PageHeader` for headers.
- Any `Select` needs a non-empty `SelectItem` value — the codebase uses a
  `"NONE"` sentinel mapped to `""`.
- `useSearchParams` requires a `<Suspense>` boundary.
- UI role checks are cosmetic; the API is the boundary.

## Related

- [API module](../../../api/admin/README.md)
- `src/components/shared/`
