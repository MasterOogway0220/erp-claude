# src/components/providers/query-provider.tsx

> Mounts the TanStack Query client for the whole app.

## Why this exists

Every data-fetching component uses `useQuery`, which needs a `QueryClient` in
context. The client must be created **inside a component with `useState`**, not
at module scope — a module-level client is shared across requests on the
server, leaking one user's cached data into another's response.

## What it does

Creates the client once per mount and provides it.

## How it works

```tsx
const [client] = useState(() => new QueryClient({ ... }))
```

The lazy initialiser means the client is constructed once per browser session
rather than on every render.

Default options are set here — stale time, retry behaviour. Individual queries
override where they need to: the quotation edit query sets `staleTime: 0` and
`gcTime: 0` deliberately, because a cached pre-edit snapshot would repopulate
the form and silently revert the user's saved changes.

## Gotchas and constraints

- **Defaults here affect every query.** Raising the global stale time would
  reintroduce the stale-form class of bug in any screen that has not opted out.
- Client component (`"use client"`), mounted from the root layout.

## Related

- `src/app/layout.tsx`
- `src/app/(dashboard)/quotations/create/standard/page.tsx` — the explicit
  cache opt-out and why.
