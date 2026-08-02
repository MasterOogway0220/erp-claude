# src/app/(dashboard)/sales/ — sales order screens

The order under execution: detail, processing (the order wizard), allotment, reservation and review.

`[id]/process` hosts the three-step wizard from `src/components/order-wizard/`, which is where quality requirements and stock allotment are captured.

## Shared conventions

- Client components using TanStack Query; `DataTable` for lists,
  `PageHeader` for headers.
- Any `Select` needs a non-empty `SelectItem` value — the codebase uses a
  `"NONE"` sentinel mapped to `""`.
- `useSearchParams` requires a `<Suspense>` boundary.
- UI role checks are cosmetic; the API is the boundary.

## Related

- [API module](../../../api/sales/README.md)
- `src/components/shared/`
