# src/app/(dashboard)/po-tracking/ — order tracking screens

The live status dashboard — seven stages with a completion percentage, per order.

Same stage model as the client status report.

## Shared conventions

- Client components using TanStack Query; `DataTable` for lists,
  `PageHeader` for headers.
- Any `Select` needs a non-empty `SelectItem` value — the codebase uses a
  `"NONE"` sentinel mapped to `""`.
- `useSearchParams` requires a `<Suspense>` boundary.
- UI role checks are cosmetic; the API is the boundary.

## Related

- [API module](../../../api/po-tracking/README.md)
- `src/components/shared/`
