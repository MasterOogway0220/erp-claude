# src/components/layout/breadcrumbs.tsx

> Path-derived breadcrumbs under the topbar.

## Why this exists

The document chain runs deep — a quotation leads to a client PO, an acceptance,
a sales order, a warehouse intimation, an inspection offer. Breadcrumbs show
where you are in that.

## How it works

Derives the trail from `usePathname()`, mapping segments to human labels.

The segment map is the interesting part: `/quotations/[id]` should read
"Quotations / NPS/26/15213", not "Quotations / cmsa566r20". Where a document
number is not available, the raw id segment is elided or shown generically.

## Gotchas and constraints

- **Path-derived, not chain-derived.** It shows the URL hierarchy, not the
  document lineage — arriving at a sales order from its client PO shows
  "Sales / …", not the PO it came from.
- New route trees need a label added, or the raw segment shows.

## Related

- `src/app/(dashboard)/layout.tsx`
- `src/components/layout/sidebar.tsx`
