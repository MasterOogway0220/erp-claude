# src/lib/calc/cpo-balance.ts

> Checks that client PO lines split from one quoted line do not, together, order more than its balance.

## Why this exists

A client's PO can split one quoted line into several of its own lines (say,
two delivery lots with different PO serial numbers). The client PO create
screen supports that with a "Copy line" button, so several PO lines can point
at one quotation item. The existing per-line balance check passes each part on
its own, which would let 1,000 + 900 through against a balance of 1,702.

## What it does

`firstOverBalance(lines, balance)` — `lines` are `{ quotationItemId, qtyOrdered }`,
`balance` maps quotation item id → remaining balance. Returns the first
`{ quotationItemId, ordered, balance }` whose summed qty exceeds its balance,
or `null`.

## How it works

Sums qty per quotation item, then compares each sum to the balance with a
1e-6 tolerance: metre quantities carry decimals and float sums drift
(1.1 + 2.2 = 3.3000000000000003), which would refuse an exact split. An id with
no balance entry is skipped; "quotation item not found" is reported by the
caller's per-line check.

## Domain notes

**Balance** = quoted qty minus qty already ordered on non-cancelled client POs
for that quotation line.

## Gotchas and constraints

The screen and the API both call it; the API is the boundary.

## Related

- `src/app/api/client-purchase-orders/route.ts` — POST.
- `src/app/(dashboard)/client-purchase-orders/create/page.tsx` — pre-submit check.
- Test: `src/lib/calc/cpo-balance.test.ts`.
