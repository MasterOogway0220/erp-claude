# src/components/shared/page-header.tsx

> Title, description, optional badge, and a slot for page actions.

## Why this exists

Every screen has the same header. One component means consistent spacing and
type, and a single place to change it.

## What it does

`<PageHeader title description? badge? badgeVariant?>{actions}</PageHeader>`.

## How it works

`children` render right-aligned as the action area — buttons, dialog triggers.
**`children` is optional**, so a header with no actions is
`<PageHeader title="..." />` self-closed. The inventory page relies on that:
its create buttons live per-tab, so a header action would have applied to only
one of four tabs.

## Gotchas and constraints

- Presentational only.
- Long titles are not truncated.

## Related

- Used by nearly every page under `(dashboard)`.
- `src/components/inventory/warehouse-intimation-panel.tsx` — suppresses it
  when embedded as a tab.
