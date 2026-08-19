# src/lib/quotations/pricing.ts

> The price gate: a quotation may be saved unpriced, but may not be submitted
> for approval that way.

## Why this exists

Sales staff build quotations incrementally. Sizes and quantities get captured
from the client's enquiry first; rates arrive later, sometimes after a supplier
comes back. Forcing a rate on every line before the draft could be saved meant
people typed `1` as a placeholder, and placeholders reach clients.

So drafts may be unpriced — and the check moves to the boundary that matters:
nothing enters the approval flow without every line settled.

Both halves of that gate (the client form and the API) must agree, and the
error must name the offending lines. Finding out that "some item" is unpriced
on a fifty-line quotation is not an error message, it is a scavenger hunt.

## The three states of a line

The gate used to ask one question — "is the rate greater than zero?" — which
collapsed three genuinely different situations into one. It no longer does:

| State | Stored as | Gate |
|---|---|---|
| Nobody has priced this line yet | `unitRate` `NULL` | **blocked** |
| Deliberately quoted at zero (free, or included in another line's price) | `unitRate` `0` | allowed |
| We decline to quote this line at all | `isRegret` `1`, `unitRate` `NULL` | allowed |

**Regret** is the piping trade's word for declining a line of an enquiry: the
client asked for twelve items, we can supply nine, and the quotation still
lists all twelve so the client can match it to their enquiry — the three we
cannot supply print `REGRET` where the price would be. Before the flag existed
users faked it with quantity 1 / rate 1 / a `REGRET` remark, which put a real
₹1.00 on a document sent to a client (see NPS/26/15213).

## What it does

| Export | Behaviour |
|---|---|
| `parseRate(value)` | `""`/`null`/`undefined` → `null` (nothing entered); garbage → `NaN`; anything numeric → its number, `0` included. |
| `normalizeItemPricing(item)` | Validates and rewrites one item's money fields **in place**, ready to store. Returns an error suffix or `null`. |
| `findUnpricedItems(items)` | Line numbers that are neither priced nor regretted. |
| `unpricedItemsError(items, instruction)` | A finished sentence, or `null` if every line is settled. |

## How it works

### `parseRate`

Rates arrive as `""` from an untouched input, `null` from the database, a
`string` from a form, a `number` from JSON, or a Prisma `Decimal` from a query.
`Number(String(value))` handles the numeric cases.

The return type is `number | null`, and the `null` is the whole point: it is
the only thing that separates "no price decided" from "priced at zero". Callers
that write `parseRate(x) || 0` throw that distinction away — the API write
paths pass the `null` straight through to the column.

### `normalizeItemPricing`

The write-side counterpart to the gate, called per item by both `POST
/api/quotations` and `PUT /api/quotations/[id]`. It lives here rather than in
the routes because it enforces the one invariant the whole regret feature rests
on — **a regretted line stores no rate and no amount, whatever the client
sent** — and that invariant is worth a test. It had been copy-pasted into both
routes, where nothing covered it (every test file in this repo is pure-lib).

In order: quantity must parse and be positive; the rate, if present, must be a
finite number `>= 0`; a regretted line then has its rate set to `null` and its
amount to `"0"` and returns early; otherwise the parsed rate is written back
and the amount is recomputed as qty × rate *only* when the client's amount is
missing or invalid, so a priced line cannot slip through totalling zero.

Quantity is validated even on a regretted line, before the early return — the
enquiry quantity is what identifies which line is being declined.

It mutates the item rather than returning a new one because both callers go on
to build a Prisma `create` from the same object, and the quotation subtotal is
summed from these normalised amounts afterwards. Returning an error *suffix*
(not a whole sentence) lets each caller prefix its own `Item N:`.

### `isSettled`

A line passes if `isRegret` is set, or if the rate is a finite number `>= 0`.
Written as a positive test (`rate !== null && Number.isFinite(rate) && rate >= 0`)
rather than a negated one, because `NaN` fails every comparison: a `rate <= 0`
style test would silently let unparseable text through, and a `!(rate > 0)`
test would now reject a legitimate `0`.

### Line numbering

`item.sNo ?? idx + 1` — the item's own serial if it has one, otherwise its
1-based position. Unsaved rows have no `sNo`, and telling the user "item 0" is
useless. The mapping happens **before** the filter, so dropping settled lines
does not renumber the ones that remain.

### The message

`unpricedItemsError` returns a complete sentence with correct grammar for one
versus several: *"Item 3 has no unit rate."* / *"Items 2, 5 and 7 have no unit
rate."* The `instruction` argument is appended so the same helper serves
different contexts — the form says one thing, the API another — without the
caller reassembling the list.

Returning `null` when everything is settled lets callers write
`const err = unpricedItemsError(...); if (err) …`.

## Domain notes

**Unit rate** is the per-UOM price (per metre for pipe, per piece for fittings
and flanges). A quotation line without one cannot be totalled, so an unpriced
quotation has no grand total and no amount in words — which is why the gate
sits before approval rather than before send.

A regretted line contributes `0` to the total, which is what keeps the grand
total honest without special-casing the sum anywhere.

## Gotchas and constraints

- A negative rate still fails, and always should — it is a typo, not a price.
- Only unit rate is checked. Quantity is validated separately, and is still
  required (and positive) on a regretted line: the client's enquiry quantity is
  what identifies the line being regretted.
- Callers must select `isRegret` alongside `unitRate` when they read items for
  the gate, or every regretted line reads as unpriced.

## Related

- `src/lib/quotations/pricing.test.ts` — pins the `NaN`, `0` and regret cases.
- `src/app/api/quotations/[id]/route.ts` — the API side of the gate.
- `prisma/migrations/20260819103000_quotation_item_regret_and_nullable_rate/`
