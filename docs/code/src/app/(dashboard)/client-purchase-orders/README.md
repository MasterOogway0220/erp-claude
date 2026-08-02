# src/app/(dashboard)/client-purchase-orders/ — client PO screens

Registering a client's purchase order against the quotation it came from.

The create page supports **partial ordering** — it loads the quotation's open balance and lets the user order some or all of it, leaving the remainder available for later. It also carries the commercial calculation (six charge types with tax flags, GST split from client vs supplier state) and the dispatch address, chosen here and inherited downstream.

## Shared conventions

- Client components using TanStack Query; `DataTable` for lists,
  `PageHeader` for headers.
- Any `Select` needs a non-empty `SelectItem` value — the codebase uses a
  `"NONE"` sentinel mapped to `""`.
- `useSearchParams` requires a `<Suspense>` boundary.
- UI role checks are cosmetic; the API is the boundary.

## Related

- [API module](../../../api/client-purchase-orders/README.md)
- `src/components/shared/`
