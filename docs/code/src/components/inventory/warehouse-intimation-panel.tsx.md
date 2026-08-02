# src/components/inventory/warehouse-intimation-panel.tsx

> The MPR list, rendered both as a tab on the inventory page and as the
> standalone `/warehouse/intimation` route.

## Why this exists

Warehouse Intimation moved out of the sidebar and into the inventory page's tab
strip. But `/warehouse/intimation` had to survive: the create and detail
screens navigate back to it, the alerts page links to it, and topbar search
resolves to it.

Rather than duplicate the list, it was extracted here and both places render
it. Extraction over duplication, for the same reason as `advance-cpo.ts` and
`otp-client.ts` — two copies of a list drift.

## What it does

`<WarehouseIntimationPanel embedded? />` — status summary cards, filters, and
the MPR table.

## How it works

`embedded` suppresses the `PageHeader` (the inventory page supplies its own)
while keeping the **New MPR** button, which is now the only route to the create
screen.

Summary cards double as status filters.

## Domain notes

An **MPR** (Material Preparation Request) tells the warehouse to pick and
prepare material against a sales order. Per line it tracks required vs prepared
quantity and two independent checks — **inspection** and **testing** — whose
statuses come from `deriveWarehouseStatuses` in `src/lib/quality/qap.ts`:
inspection is an order-level QAP decision, testing is per item.

Statuses: `PENDING` → `IN_PROGRESS` → `MATERIAL_READY` → `DISPATCHED`.

## Gotchas and constraints

- **Rendered in two places** — check both when changing it.
- The `[id]` and `create` routes remain under `src/app/(dashboard)/warehouse/`;
  only the list moved.

## Related

- `src/app/(dashboard)/inventory/page.tsx` — the tab.
- `src/app/(dashboard)/warehouse/intimation/page.tsx` — the thin route wrapper.
- `src/lib/quality/qap.ts`
