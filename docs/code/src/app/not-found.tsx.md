# src/app/not-found.tsx

> The 404 page.

## What it does

Renders when no route matches. Seventeen lines: a message and a link home.

## Gotchas and constraints

- Renders inside the root layout, so it has providers but no dashboard chrome —
  correct, since a 404 may be hit unauthenticated.
- Does not distinguish "no such page" from "no permission"; the middleware
  redirects unauthenticated users to `/login` before this is reached.

## Related

- `src/app/layout.tsx`
- `src/middleware.ts`
