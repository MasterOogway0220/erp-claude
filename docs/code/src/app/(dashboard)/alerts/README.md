# src/app/(dashboard)/alerts/ — alerts screen

Role-addressed workflow notifications, with links back to the source document. Overdue state is computed at render time from the due date; nothing sweeps them.

## Shared conventions

- Client components using TanStack Query; `DataTable` for lists,
  `PageHeader` for headers.
- Any `Select` needs a non-empty `SelectItem` value — the codebase uses a
  `"NONE"` sentinel mapped to `""`.
- `useSearchParams` requires a `<Suspense>` boundary.
- UI role checks are cosmetic; the API is the boundary.

## Related

- [API module](../../../api/alerts/README.md)
- `src/components/shared/`
