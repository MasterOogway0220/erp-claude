# src/app/(dashboard)/masters/ — reference data screens

41 files, the largest group of pages.

See [the API module](../../../api/masters/README.md) for the scoping rules —
in particular which masters are company-scoped and which are deliberately
global.

## The screens

Customers/vendors, products, sizes, employees, warehouses, buyers, material
codes, departments, industry segments, testing types, terms and conditions,
offer terms, company.

Most follow one shape: a `DataTable` list, a create/edit dialog or page, and
soft delete.

## Products is the exception

`masters/products/page.tsx` is a tabbed screen — Pipes, Sizes, Lengths, Units,
Additional Specs — because those are all facets of the catalogue.

Two things to know about it:

- **The catalogue is loaded from Excel**, not typed here. A reload
  (`scripts/seed-new-masters.ts`) wipes and replaces everything except rows a
  user hand-entered, which are identified by carrying a size, specification,
  grade or length. Edits made here that only set product/material/category are
  therefore **not durable across a master reload**.
- **After any product or additional-spec change, call
  `invalidateProductCache()`.** The quotation dropdowns read a module-level
  cache that survives client-side navigation; without the call the edit is
  invisible until a full reload. The Additional Specs panel previously missed
  this, and separately its Add button was unreachable because it validated a
  product field the form never rendered.

## Gotchas

- **Deleting is soft.** Rows stay so historical documents keep rendering; some
  screens check for references first.
- Dispatch addresses live under the customer, and the default one is
  preselected wherever an address is chosen.
- Employee `moduleAccess` is a JSON array in a text column.

## Related

- `scripts/seed-new-masters.ts`
- `src/components/shared/product-material-select.tsx`
- `src/lib/soft-delete.ts`
