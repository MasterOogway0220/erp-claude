# src/components/shared/data-table.tsx

> The generic sortable, searchable, paginated table used by every list screen.

## Why this exists

Twenty-plus list pages need the same table. One component means one place for
sorting, search and pagination behaviour.

## What it does

`<DataTable columns data searchKey? searchPlaceholder? />`, generic over the
row type.

## How it works

Generic constraint is `T extends Record<string, any>`, **relaxed from
`unknown`** — the stricter bound forced a cast at every call site because rows
arrive from Prisma with mixed value types.

`searchKey` names a single field to filter on. Column definitions supply
headers and cell renderers.

## Gotchas and constraints

- **Search is one field.** A page needing multi-field or server-side search
  filters before passing `data` in.
- **Client-side pagination** — the whole result set is in memory. Fine at
  current volumes; a list that grows into thousands needs server paging.
- No column resizing, pinning or virtualisation.

## Related

- `src/components/ui/table.tsx` — the primitives.
- `src/components/shared/export-button.tsx` — usually paired.
