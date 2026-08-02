# src/app/(dashboard)/page.tsx

> The home dashboard — counts, recent activity and quick links.

## Why this exists

The landing page after login. Answers "what needs my attention" without
opening each module.

## What it does

Summary cards and recent-document lists, fetched from the reporting endpoints.

## How it works

Client component using TanStack Query against the dashboard and report APIs.
Cards link into the module they summarise.

## Gotchas and constraints

- **Aggregates several endpoints**, so it is one of the heavier pages to load
  and one of the more likely to surface a slow query.
- Counts are company-scoped through the APIs; a `SUPER_ADMIN` with no active
  company sees everything.
- Not role-tailored — everyone sees the same dashboard, consistent with role
  enforcement being disabled.

## Related

- `src/app/api/reports/**`
- `src/components/layout/sidebar.tsx`
