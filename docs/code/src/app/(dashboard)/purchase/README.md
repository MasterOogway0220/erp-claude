# src/app/(dashboard)/purchase/ — procurement screens

Requisitions, RFQs, supplier quotations, comparative statements, purchase orders and vendor tracking.

The comparative statement screen is the important one: it ranks vendors on **total landed cost**, not rate, and requires written justification for choosing anyone but L1.

The PO detail page carries the vendor milestone buttons (Acknowledged, In Production, Ready for Dispatch), which appear only for stages the order has not yet passed.

## Shared conventions

- Client components using TanStack Query; `DataTable` for lists,
  `PageHeader` for headers.
- Any `Select` needs a non-empty `SelectItem` value — the codebase uses a
  `"NONE"` sentinel mapped to `""`.
- `useSearchParams` requires a `<Suspense>` boundary.
- UI role checks are cosmetic; the API is the boundary.

## Related

- [API module](../../../api/purchase/README.md)
- `src/components/shared/`
