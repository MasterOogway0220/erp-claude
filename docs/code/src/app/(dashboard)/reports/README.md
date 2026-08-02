# src/app/(dashboard)/reports/ — reporting screens

Sales, purchase, inventory ageing, vendor performance, quotation analysis, on-time delivery, NCR analysis and the client status report.

The client status report offers PDF, Excel and email — three separate endpoints, so a change to its content needs checking against all three.

## Shared conventions

- Client components using TanStack Query; `DataTable` for lists,
  `PageHeader` for headers.
- Any `Select` needs a non-empty `SelectItem` value — the codebase uses a
  `"NONE"` sentinel mapped to `""`.
- `useSearchParams` requires a `<Suspense>` boundary.
- UI role checks are cosmetic; the API is the boundary.

## Related

- [API module](../../../api/reports/README.md)
- `src/components/shared/`
