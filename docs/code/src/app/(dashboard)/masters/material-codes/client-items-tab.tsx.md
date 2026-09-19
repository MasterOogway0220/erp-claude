# src/app/(dashboard)/masters/material-codes/client-items-tab.tsx

> The "Customer Item IDs" tab of the Material Code master page.

## Why this exists

The client asked for the customer's item IDs on non-standard quotations to be
reusable "with the same logic as material code", and for their master to live
on the same page. This tab is that master. Rows mostly appear on their own
(every saved non-standard quotation adds its IDs — see
`src/lib/quotations/client-items.ts`); the tab exists to curate them: fix a
description so the next pick fills the item text properly, set the unit, or
add an ID before the quotation is written.

## What it does

`<ClientItemsTab />` — a card with a `DataTable` (Customer, Item ID,
Description, Unit, edit/delete), an add/edit dialog (customer select, item ID,
description textarea, unit select from Unit Master) and a delete confirm.
Reads `["client-items"]` via `useReferenceQuery` and invalidates it after
every write, so the non-standard form's suggestions (same key prefix) refresh.

## How it works

- Customers come from `useCustomers()` (shared `["customers"]` cache); units
  from `useUnits()`.
- `DataTable` searches one flat key, and the customer name is on a relation —
  rows are mapped with a `customerName` copy so the table can sort on it;
  search is on the item ID.
- The customer select is disabled while editing: the unique key is
  `(customerId, itemNo)`, and moving an ID between customers is not a thing.

## Domain notes

A **non-standard quotation** is one whose lines the product masters cannot
describe (special clad pipe, a plate to drawing); the line is free text and the
customer refers to it by *their* item number. That number is what this master
holds.

## Gotchas and constraints

- Deleting a row never touches a quotation — lines store the ID as text.
- 2,000-row cap on the list API; well above the current volume.

## Related

- `src/app/(dashboard)/masters/material-codes/page.tsx` — the host page (tabs).
- `src/app/api/masters/client-items/route.ts`, `[id]/route.ts`.
- `src/app/(dashboard)/quotations/create/nonstandard/page.tsx` — where the IDs are picked.
