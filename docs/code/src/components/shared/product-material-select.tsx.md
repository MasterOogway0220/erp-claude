# src/components/shared/product-material-select.tsx

> The linked Product / Material / Additional Spec pickers, with autofill from
> the master.

## Why this exists

Choosing an item is three dependent decisions: the product, then a material
valid for it, then any additional specification. Doing that from raw dropdowns
means the user can pick combinations the company cannot supply.

## What it does

Three `SmartCombobox`es. Exports `ProductMaterialSelect`,
`getMasterExtraSizes(product)` and `invalidateProductCache()`.

## How it works

### One module-level cache, fetched once

The whole catalogue is fetched once per page load into a module-level variable
shared by every item row — a fifty-line quotation makes one request, not fifty.

```
/api/masters/products?limit=20000
```

**The limit is load-bearing.** The catalogue is 3,557 rows and must arrive in
one page; a short page silently makes products unquotable with no error. It was
5,000 until the B16.47 flanges and reducing fittings took most of that
headroom. The response's own `pagination.total` is now compared against what
arrived, and a shortfall is logged.

Because the dashboard layout persists across navigation, the cache outlives a
page change — hence `invalidateProductCache()`, which master screens must call
after any product or additional-spec mutation. Forgetting it means the edit
does not appear until a full reload.

### Filtering and autofill

Products filter by `category` (`PIPES` / `FITTINGS` / `FLANGES` / `PLATES`),
materials by the chosen product. `tryAutoFill` fills ends, dimensional
standard and size **only when unambiguous** — `unique()` returns a value only
if exactly one distinct option exists.

That is why flange dim no longer autofills: with B16.5 and both B16.47 series
present, a product/material pair matches four rows and the answer is genuinely
ambiguous. The size picker resolves it instead, via `flangeDimForSize`.

`explicitlyDimless` is the exception: if every match has no standard and all are
`PIPES`, it fills `"-"`. That is the client's own convention for IS-standard
ERW and API 5L grades, not missing data.

### Additional specs

Deliberately **not** filtered by product — the sub-master lists every spec and
all of them are offered. Falls back to specs found on product rows if the
sub-master is empty.

## Gotchas and constraints

- **Call `invalidateProductCache()` after master edits.**
- Two module caches (products, additional specs) with in-flight promise
  deduplication, so concurrent mounts share one request.
- A failed fetch resets the promise so the next mount retries, but returns `[]`
  meanwhile — empty dropdowns rather than an error.

## Related

- `src/components/shared/smart-combobox.tsx`
- `src/lib/fitting-flange-sizes.ts`
- `src/app/api/masters/products/route.ts`
- `src/app/(dashboard)/masters/products/page.tsx` — must invalidate.
