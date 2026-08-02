# src/app/(dashboard)/po-acceptance/ — PO acceptance screens

The acceptance wizard and detail page.

The detail page carries the upload for the client's countersigned copy. Issuing an acceptance advances the parent client PO, which is the gate the sales order depends on.

## Shared conventions

- Client components using TanStack Query; `DataTable` for lists,
  `PageHeader` for headers.
- Any `Select` needs a non-empty `SelectItem` value — the codebase uses a
  `"NONE"` sentinel mapped to `""`.
- `useSearchParams` requires a `<Suspense>` boundary.
- UI role checks are cosmetic; the API is the boundary.

## Related

- [API module](../../../api/po-acceptance/README.md)
- `src/components/shared/`
