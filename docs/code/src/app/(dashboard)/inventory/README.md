# src/app/(dashboard)/inventory/ — inventory screens

One page with four tabs — Stock View, GRN Register, Stock Issues, Warehouse Intimation — plus the create screens and stock detail.

The module is a **single sidebar entry**: sub-pages are tabs and create screens are reached from buttons on the relevant tab, so listing them separately meant two routes to the same place. There is deliberately no action button in the page header, since it would apply to only one of four tabs.

Warehouse Intimation is rendered here from a shared component that also backs the standalone `/warehouse/intimation` route.

## Shared conventions

- Client components using TanStack Query; `DataTable` for lists,
  `PageHeader` for headers.
- Any `Select` needs a non-empty `SelectItem` value — the codebase uses a
  `"NONE"` sentinel mapped to `""`.
- `useSearchParams` requires a `<Suspense>` boundary.
- UI role checks are cosmetic; the API is the boundary.

## Related

- [API module](../../../api/inventory/README.md)
- `src/components/shared/`
