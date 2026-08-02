# src/app/(dashboard)/layout.tsx

> The application shell — sidebar, topbar, breadcrumbs — wrapping every
> authenticated page.

## Why this exists

Everything behind the login shares one frame. Putting it in a route-group
layout means it renders once and persists across client-side navigation, so
moving between pages does not rebuild the sidebar.

## What it does

Renders the sidebar, topbar and breadcrumbs around `children`.

## How it works

`(dashboard)` is a **route group** — the parentheses keep it out of the URL, so
these pages live at `/quotations`, not `/dashboard/quotations`.

Sidebar visibility state lives in `src/stores/sidebar-store.ts` rather than
here, because the topbar's hamburger button also writes it.

## Gotchas and constraints

- **This layout does not check auth.** `src/middleware.ts` does that before the
  route renders. Do not assume a session exists purely because a component is
  under this layout — `useCurrentUser()` still returns `undefined` while
  loading.
- Persisting across navigation means module-level caches in child components
  (`product-material-select.tsx`) also persist. That is why those export an
  explicit invalidation function.

## Related

- `src/components/layout/sidebar.tsx`, `topbar.tsx`, `breadcrumbs.tsx`
- `src/middleware.ts`
