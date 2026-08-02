# src/lib/quotations/pricing.ts

> The price gate: a quotation may be saved unpriced, but may not be submitted
> for approval that way.

## Why this exists

Sales staff build quotations incrementally. Sizes and quantities get captured
from the client's enquiry first; rates arrive later, sometimes after a supplier
comes back. Forcing a rate on every line before the draft could be saved meant
people typed `1` as a placeholder, and placeholders reach clients.

So drafts may be unpriced — and the check moves to the boundary that matters:
nothing enters the approval flow without a real price on every line.

Both halves of that gate (the client form and the API) must agree, and the
error must name the offending lines. Finding out that "some item" is unpriced
on a fifty-line quotation is not an error message, it is a scavenger hunt.

## What it does

| Export | Behaviour |
|---|---|
| `parseRate(value)` | Coerces anything to a number. `""`/`null`/`undefined` → `0`; garbage → `NaN`. |
| `findUnpricedItems(items)` | Line numbers with no positive rate. |
| `unpricedItemsError(items, instruction)` | A finished sentence, or `null` if all priced. |

## How it works

### `parseRate`

Rates arrive as `""` from an untouched input, `null` from the database, a
`string` from a form, a `number` from JSON, or a Prisma `Decimal` from a query.
`Number(String(value))` handles all of them; the `Number.isFinite` guard turns
unparseable text into `NaN` rather than a silent `0`.

The distinction matters: `0` means "explicitly free", `NaN` means "not a
number". Both fail the gate, but only because the test is written as it is —
see below.

### The `!(rate > 0)` test

Deliberately negated rather than `rate <= 0`. `NaN <= 0` is **false**, so
`rate <= 0` would let unparseable text through the gate. `!(NaN > 0)` is
**true**. This is the kind of expression someone "tidies up" into a bug, hence
the note.

### Line numbering

`item.sNo ?? idx + 1` — the item's own serial if it has one, otherwise its
1-based position. Unsaved rows have no `sNo`, and telling the user "item 0" is
useless.

### The message

`unpricedItemsError` returns a complete sentence with correct grammar for one
versus several: *"Item 3 has no unit rate."* / *"Items 2, 5 and 7 have no unit
rate."* The `instruction` argument is appended so the same helper serves
different contexts — the form says one thing, the API another — without the
caller reassembling the list.

Returning `null` when everything is priced lets callers write
`const err = unpricedItemsError(...); if (err) …`.

## Domain notes

**Unit rate** is the per-UOM price (per metre for pipe, per piece for fittings
and flanges). A quotation line without one cannot be totalled, so an unpriced
quotation has no grand total and no amount in words — which is why the gate
sits before approval rather than before send.

## Gotchas and constraints

- A rate of exactly `0` fails the gate. There is no "free of charge" line; if
  one is ever needed it wants an explicit flag, not a zero.
- Only unit rate is checked. Quantity is validated separately.

## Related

- `src/lib/quotations/pricing.test.ts` — pins the `NaN` case.
- `src/app/api/quotations/[id]/route.ts` — the API side of the gate.
