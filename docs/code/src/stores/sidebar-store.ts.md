# src/stores/sidebar-store.ts

> Zustand store for sidebar open/closed state.

## Why this exists

The sidebar's collapsed state and its mobile drawer are read and written by
both the sidebar and the topbar (which owns the hamburger button). Passing that
through props would mean threading it through the dashboard layout.

A store is the smaller answer for one boolean shared by two siblings.

## What it does

Holds the sidebar's open state and a setter.

## Gotchas and constraints

- **The only Zustand store in the project.** Server state uses TanStack Query;
  form state is local `useState`. Do not read this as a general pattern —
  reach for it only for genuinely shared UI state.
- Not persisted, so the state resets on reload.

## Related

- `src/components/layout/sidebar.tsx`, `topbar.tsx`
