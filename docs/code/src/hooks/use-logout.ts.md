# src/hooks/use-logout.ts

> Signs the user out and empties the client-side query cache in the same step.

## Why this exists

Sessions in this app last a year and end only at an explicit sign-out (see
[`src/lib/auth.ts`](../lib/auth.ts.md)). That makes the logout button the one
moment the application can be certain the person at the keyboard is finished —
and the one moment it must forget what it knows about them.

The concern is not theoretical. This is an ERP used from shared machines: a
stores or warehouse terminal, a PC on the shop floor. The React Query cache
holds customer lists, order values, purchase-order rates and margins. If a user
signs out and a colleague signs in on the same browser tab, none of the first
user's rows may still be sitting in memory.

Before this hook, all three logout buttons called `signOut({ callbackUrl })`
directly. That is *currently* safe, but only by accident: NextAuth's `signOut`
sets `window.location.href`, a full page navigation, which tears down the
in-memory `QueryClient` along with everything else. Nothing in the code said so,
and the obvious future tidy-up — passing `redirect: false` for a smoother
sign-out without a white flash — would have silently left the entire cache
populated across a user switch, with no error and no visible symptom.

Deleting this hook and calling `signOut` directly restores that trap.

## What it does

```ts
const logout = useLogout();
// ...
<button onClick={logout}>Sign out</button>
```

`useLogout()` returns a stable, argument-less callback. Calling it:

1. empties every entry in the React Query cache (`queryClient.clear()`), then
2. calls `signOut({ callbackUrl: "/login" })`, which ends the NextAuth session
   and navigates to the sign-in page.

Callers: `src/components/layout/sidebar.tsx` (collapsed and expanded sidebar)
and `src/components/layout/topbar.tsx` (user menu).

## How it works

The two steps are ordered deliberately. `clear()` runs **before** the sign-out
call, because `signOut` begins a page navigation and there is no guarantee any
code after it runs. Clearing first makes the outcome independent of how far the
navigation gets.

`clear()` removes cached data, not just marks it stale — unlike
`invalidateQueries`, which leaves the previous result in place to be shown while
a refetch runs. Showing a previous user's rows "briefly, while refetching" is
exactly the failure being avoided, so invalidation would be the wrong call here.

The callback is wrapped in `useCallback` keyed on the query client, so it is
stable across renders and safe to pass straight to `onClick`.

## Domain notes

None specific to piping. The relevant context is operational rather than
technical: terminals in stores and dispatch are shared between shifts, so "the
browser is one person's" is not a safe assumption anywhere in this application.

## Gotchas

- **A page reload already clears the cache.** The `QueryClient` is created
  inside `useState` in
  [`query-provider.tsx`](../components/providers/query-provider.tsx.md), so it
  is per-page-load and never persisted to storage. That is what makes a hard
  refresh a reliable way to escape stale data. This hook is about the sign-out
  path specifically, not about refresh.
- **Do not add a cache persister without revisiting this.** Introducing
  `PersistQueryClientProvider` or a storage persister would write the cache to
  `localStorage`, where it survives both a reload *and* — unless cleared — a
  user switch. `query-provider.test.ts` pins the memory-only property with a
  comment explaining why.
- **This does not clear anything else in browser storage.**
  `dispatch/bank-reconciliation` keeps its own `localStorage` entry, which is a
  local UI mapping rather than customer data and is deliberately left alone.

## Related

- [`src/lib/auth.ts`](../lib/auth.ts.md) — session lifetime, and the
  re-verification that is now the only other way a session ends.
- [`src/components/providers/query-provider.tsx`](../components/providers/query-provider.tsx.md)
  — the cache being cleared, and its defaults.
- [`src/hooks/use-api-query.ts`](./use-api-query.ts.md) — how screens read
  through that cache.
