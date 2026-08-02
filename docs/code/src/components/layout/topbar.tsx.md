# src/components/layout/topbar.tsx

> The top bar — sidebar toggle, global search, alerts, user menu, company
> switcher.

## What it does

Renders the mobile hamburger, `GlobalSearch`, an alert indicator, and the user
dropdown with sign-out. For `SUPER_ADMIN`, a company switcher.

## How it works

The sidebar toggle writes to `src/stores/sidebar-store.ts` — the reason that
store exists, since the button and the sidebar are siblings.

The company switcher sets the `activeCompanyId` cookie, which `getActiveCompanyId`
in `rbac.ts` reads. Switching changes what every subsequent query returns, so
it is deliberately confined to `SUPER_ADMIN`.

Contains a document-type→route map for search results, duplicating one in
`global-search.tsx`.

## Gotchas and constraints

- **Keep the two route maps in step.**
- The company switch takes effect on the next request; already-rendered data is
  stale until refetched.
- The alert indicator polls; it is not pushed.

## Related

- `src/components/shared/global-search.tsx`
- `src/lib/rbac.ts` — `getActiveCompanyId`.
- `src/stores/sidebar-store.ts`
