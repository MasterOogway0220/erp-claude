# src/app/(dashboard)/warehouse/ — warehouse screens

Material preparation. The list moved into the inventory page's tab strip, but this route tree remains: the create and detail screens navigate back to it, and the alerts page and topbar search link here.

`[id]/prepare` is where stores records what was actually picked, heat by heat.

## Shared conventions

- Client components using TanStack Query; `DataTable` for lists,
  `PageHeader` for headers.
- Any `Select` needs a non-empty `SelectItem` value — the codebase uses a
  `"NONE"` sentinel mapped to `""`.
- `useSearchParams` requires a `<Suspense>` boundary.
- UI role checks are cosmetic; the API is the boundary.

## Related

- [API module](../../../api/warehouse/README.md)
- `src/components/shared/`
