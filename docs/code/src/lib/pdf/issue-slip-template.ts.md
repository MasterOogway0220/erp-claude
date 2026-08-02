# src/lib/pdf/issue-slip-template.ts

> The stock issue slip — internal proof that material left the warehouse.

See [README.md](./README.md) for the shared pattern.

## Why this exists

When stock is issued, the movement needs a signed paper record: what left, how
much, against which order, and who authorised it. It is the internal
counterpart to a GRN and closes the inventory audit loop.

## What it does

Compact HTML listing issued items with quantities and the reference they were
issued against.

## How it works

The simplest template here (~154 lines). Header with issue number and date,
item table, signature lines.

## Domain notes

**Stock lifecycle:** `UNDER_INSPECTION` → `ACCEPTED` / `REJECTED` / `HOLD` →
`RESERVED` → `DISPATCHED`. An issue moves accepted or reserved stock out.

Issuing against a sales order is the normal case; internal issues also happen.

## Gotchas and constraints

- Internal document — no letterhead formality, no commercial terms.
- Signature lines are printed blanks; nothing captures them digitally.

## Related

- `prisma/schema.prisma` → `StockIssue`, `StockIssueItem`.
- `src/app/api/inventory/stock-issue/[id]/pdf/route.ts`
