# src/components/quotations/standard-items-editor.tsx

> The standard quotation's line-item editor, shared with client PO
> registration.

## Why this exists

The standard quotation form edits each line with many fields:
- item type (Pipe / Fitting / Flange / Plate);
- material code, and product / material / additional spec from Product
  Master;
- size, from the pipe-size master or the fitting/flange size lists;
- length, ends, qty, unit, unit rate with **Regret** (a line we decline to
  quote), delivery;
- Dim. Std (the dimension standard, e.g. ASME B36.10), OD / WT (outside
  diameter / wall thickness) and unit / total weight;
- past quote / past PO, remarks and the line total.

The editor used to live inline in `quotations/create/standard/page.tsx`.
In Nov 2026, client PO registration had to let users type the items of a
**tender quotation that was logged without lines**, with "the same fields as
the quotation". The editor was moved here verbatim rather than copied, so the
two screens can't drift apart.

## What it does

`<StandardItemsEditor items setItems customerId currency editId? historyReady? />`

- The parent owns `items` (an array of `QuotationItem`, all string fields)
  and saves and totals it. Everything about editing one line lives here:
  - `updateItem`: product resets the size fields; picking a size fills
    OD/WT/weight; qty × rate gives the amount.
  - Copy From, Delete and Add Item.
  - Material-code record/replace against Material Code Master.
  - The past-quote lookup and its dropdown and picker dialog. See
    [`past-quote-match.ts`](../../lib/quotations/past-quote-match.ts.md).
- It reads its own master data: sizes, lengths, units, the customer's
  material codes and past quotations.
- `editId` keeps the quotation being edited from counting as its own past
  quote.
- `historyReady` is false while a saved quotation is still loading. The
  past-quote effect then waits, and treats the loaded lines as already looked
  up.
- It also exports `QuotationItem`, `ItemCategory`, `emptyItem` and
  `getPipeType`.

## Gotchas

- The grand total, discount and tax block is **not** here. It stays on the
  quotation page, because the PO screen totals differently.
- On the PO screen, `editId` is omitted and `historyReady` defaults to true.

## Related

- [Standard quotation page](../../app/(dashboard)/quotations/create/standard/page.tsx.md)
- [Client PO create page](../../app/(dashboard)/client-purchase-orders/create/page.tsx.md)
