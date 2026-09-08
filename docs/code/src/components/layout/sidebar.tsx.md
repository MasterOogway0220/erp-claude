# src/components/layout/sidebar.tsx

> The main navigation — the definitive list of what this ERP does.

## Why this exists

Both the navigation UI and the **navigation definition**. `navSections` is the
single source of truth for which modules exist, what they are called, which
roles they nominally belong to, and which are hidden in production.

Reading `navSections` is the fastest way to understand the application's scope.

## What it does

Renders grouped, collapsible navigation. A `NavItem` is either a single link
(`href`) or a group (`children`).

## How it works

### Visibility

There isn't any. `navSections` is rendered exactly as written, to every
signed-in user.

It used to be filtered by `isNavItemVisible` from
`src/lib/access/module-access.ts`. Role and grant gating was removed by owner
decision on 2026-07-16; the remaining production lockdown — `productionHidden:
true` on an item, which hid it from live users while showing it to
`testuser@erp.com`, keyed off `NEXT_PUBLIC_PRODUCTION_MODE` — was removed when
all modules were opened up on production. Five groups came out of hiding at
that point: **Alerts, Purchase, Quality, Dispatch & Finance, Reports**.

With no rules left, the filter could only return everything, so it and the
helper were deleted. `roles: [...]`, `moduleKey` and `moduleKeys` remain on
items as inert annotations — they document intent and give a restore path, and
enforce nothing.

### Single links vs groups

An item with `href` renders as one link; one with `children` renders a
collapsible group that auto-opens when the current path matches a child.

Inventory is deliberately a **single link**: its sub-pages are tabs on
`/inventory` and the create screens are reached from buttons there, so listing
them separately meant two routes to the same place.

## Gotchas and constraints

- **Adding a route here does not protect it.** `src/middleware.ts` has its own
  matcher; a new top-level route must be added there too or it is reachable
  unauthenticated.
- **The `roles` arrays are inert.** Do not read them as access control.
- **Hiding a nav entry never was access control either.** While the production
  lockdown existed, every one of those modules stayed reachable by typing its
  URL, and its API answered normally. Gating a module means guarding its API
  route (`src/lib/rbac.ts`).
- Icons are lucide-react with per-item colour classes; the brand palette is red
  `#e31e24`, blue `#4e6cad`, black.
- Open-group state is local; collapsed state is shared with the topbar via
  `src/stores/sidebar-store.ts`.

## Related

- `src/lib/access/module-access.ts` — now only `parseModuleAccess`.
- `src/middleware.ts`
- `src/stores/sidebar-store.ts`
- `src/components/layout/topbar.tsx`, `breadcrumbs.tsx`
