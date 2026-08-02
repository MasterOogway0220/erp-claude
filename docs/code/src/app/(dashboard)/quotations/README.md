# src/app/(dashboard)/quotations/ — quotation screens

See [the API module](../../../api/quotations/README.md) for the domain, the
revision model and the status flow.

## The screens

| Path | Purpose |
|---|---|
| `page.tsx` | The list. Collapses revision chains; includes tenders. |
| `create/page.tsx` | Category chooser — Standard or Non-Standard |
| `create/standard/page.tsx` | The big one (~2,000 lines). Also the **edit** screen via `?editId=` |
| `create/nonstandard/page.tsx` | The free-text sibling, same dual role |
| `[id]/page.tsx` | Detail, actions, revision history |
| `[id]/compare/page.tsx` | Diff two revisions |

## Create and edit are the same page

`?editId=<id>` switches the create page into edit mode. That keeps one form
rather than two that drift — but it makes the page the most delicate in the
codebase, because it must populate from an existing document without letting
its own effects overwrite what it just loaded.

Three guards exist because each was a real bug:

- **`editLoadedRef`** — the populate effect runs **once per page load**, so a
  background refetch landing mid-edit cannot clobber typed input.
- **`staleTime: 0, gcTime: 0`** on the edit query — a cached pre-edit snapshot
  would repopulate the form and silently revert saved changes.
- **Effects that would reset fields check `editLoadedRef` first** — the
  currency, terms and buyer-reset effects all bail out during the initial load.

## Standard and non-standard are parallel implementations

Two ~2,000-line pages doing nearly the same thing. **A change to shared
quotation behaviour usually needs making in both**, and several past defects
came from fixing only one. Check the sibling before you finish.

## Gotchas

- **Send `null`, not `undefined`, for cleared optional fields.**
  `JSON.stringify` drops `undefined`, and the API cannot distinguish "not
  editing this" from "clear it" unless the client is explicit. This is what
  erased deal owners.
- **`useSearchParams` needs `<Suspense>`.**
- Item rows use `ProductMaterialSelect` and `SmartCombobox`; the product
  catalogue is cached at module level, so master edits need
  `invalidateProductCache()`.
- Prices may be blank at draft and are enforced at approval.

## Related

- `src/lib/quotations/`
- `src/components/shared/product-material-select.tsx`, `size-select.tsx`
