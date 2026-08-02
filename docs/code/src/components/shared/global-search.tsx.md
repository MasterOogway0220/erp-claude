# src/components/shared/global-search.tsx

> Topbar search across documents — quotations, orders, POs, customers.

## Why this exists

Staff work from document numbers. Being handed `NPS/26/15213` on a phone call
and having to guess which module it belongs to is the friction this removes.

## What it does

A search box in the topbar that queries across document types and links
straight to the record.

## How it works

Debounced queries to `/api/search`, results grouped by type with the document
number and a label, each linking to its detail page.

The type→route mapping lives in the component (and a similar map in
`topbar.tsx`), so a new searchable document type needs its route added there
as well as to the API.

## Gotchas and constraints

- **Company-scoped through the API.**
- Matches document numbers and names, not line-item contents — searching for a
  product will not find the quotations containing it.
- The route map is duplicated between this and the topbar; keep them in step.

## Related

- `src/app/api/search/route.ts`
- `src/components/layout/topbar.tsx`
