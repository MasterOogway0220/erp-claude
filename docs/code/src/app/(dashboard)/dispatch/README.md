# src/app/(dashboard)/dispatch/ — dispatch and finance screens

Packing lists, dispatch notes, invoices, credit and debit notes, payments, bank reconciliation, and the dispatch dossier.

Tabs are addressed by query string (`/dispatch?tab=invoices`), which is how the sidebar links into them.

The dossier page compiles the client's proof pack — every stored attachment for the order in one PDF.

## Shared conventions

- Client components using TanStack Query; `DataTable` for lists,
  `PageHeader` for headers.
- Any `Select` needs a non-empty `SelectItem` value — the codebase uses a
  `"NONE"` sentinel mapped to `""`.
- `useSearchParams` requires a `<Suspense>` boundary.
- UI role checks are cosmetic; the API is the boundary.

## Related

- [API module](../../../api/dispatch/README.md)
- `src/components/shared/`
