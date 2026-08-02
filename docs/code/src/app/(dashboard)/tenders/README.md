# src/app/(dashboard)/tenders/ — tender screens

Tender records, which share the quotation number series and appear in the quotation listing.

A tender can be converted to a quotation, carrying its items across.

## Shared conventions

- Client components using TanStack Query; `DataTable` for lists,
  `PageHeader` for headers.
- Any `Select` needs a non-empty `SelectItem` value — the codebase uses a
  `"NONE"` sentinel mapped to `""`.
- `useSearchParams` requires a `<Suspense>` boundary.
- UI role checks are cosmetic; the API is the boundary.

## Related

- [API module](../../../api/tenders/README.md)
- `src/components/shared/`
