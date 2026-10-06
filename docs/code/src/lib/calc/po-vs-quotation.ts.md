# src/lib/calc/po-vs-quotation.ts

> Compares a sales order's lines with the quotation lines they came from, for the order Review step.

## Why this exists

The order wizard's Review step shows the client's PO against the quotation so
differences in quantity, rate or amount are seen before the order is
processed. It used to pair lines by serial number. A client PO can split one
quoted line into several of its own lines (two delivery lots, say) and can
leave quoted lines out (a part order), so S.No pairing compared the wrong
lines and flagged differences that were not there.

## What it does

`poVsQuotation(po, quoted)` → one `ComparisonRow` per row of the table:
quotation qty / rate / amount, PO qty / rate / amount, the PO − quotation
difference of each, and `hasVariance` (any difference over 0.01).

- Order lines that carry `quotationItemId` are grouped by it: one row per
  quoted line that was ordered, quantities and amounts summed, `itemNo` listing
  the order S.Nos ("1, 2").
- An order line without one, among lines that have it, was added by hand: its
  own row with nothing quoted (all quotation values 0).
- Quoted lines nobody ordered are not listed.
- If no order line carries a link (orders made before 6 Oct 2026, or on the
  legacy Create Order screen), lines are paired by S.No exactly as the screen
  always did.

## How it works

A split line's parts can be at different negotiated rates; the PO rate of the
row is their weighted average (amount ÷ qty), which is what the client pays
per unit. A single line keeps its own rate. A part at a rate other than the
quoted one still flags the row, even when the parts average back to it.

Each stored amount is rounded to the paisa, so a split line's parts can sum a
paisa or two off the quoted amount (121 m @ ₹50.01 = 6051.21, but 100.5 m and
20.5 m store 5026.01 + 1025.21). The amount check allows half a paisa per
amount compared — 0.01 for a single line, as before.

## Gotchas and constraints

Pure: callers convert the API's decimal strings to numbers first.

## Related

- `src/components/order-wizard/ReviewStep.tsx` (sandbox copy) — the only caller.
- `src/lib/calc/cpo-balance.ts` — the same "one quoted line, several PO lines"
  idea at client PO registration.
- Test: `src/lib/calc/po-vs-quotation.test.ts`.
