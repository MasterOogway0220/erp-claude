# src/hooks/use-current-user.ts

> Typed access to the logged-in user in a client component.

## Why this exists

`useSession()` returns `session.user` loosely typed. Every component that needs
the user's role would otherwise cast it inline, and a cast repeated forty times
is forty chances to get it wrong.

## What it does

`useCurrentUser()` → `{ user, isLoading, isAuthenticated }`, where `user` is
typed with `id`, `email`, `name`, `role`, `companyId` and `moduleAccess`, or
`undefined`.

## How it works

A thin wrapper over `useSession()`, mapping `status` to two booleans and
casting `session.user` to the shape `src/lib/auth.ts` actually puts there.

`isLoading` matters: on first render the session is still resolving and `user`
is `undefined`. A component that renders a role-gated control without checking
it will flash the wrong UI.

## Gotchas and constraints

- **The type is a cast, not a guarantee.** It must stay in step with the
  NextAuth module augmentation in `src/lib/auth.ts`; nothing enforces that.
- **Client components only** — `useSession` needs the session provider. Server
  code uses `getServerSession` via `rbac.ts`.
- **Not an authorisation check.** Anything gated on `user.role` here is
  cosmetic; the API must enforce it. Note that API-side role enforcement is
  currently disabled — see `rbac.ts`.

## Related

- `src/lib/auth.ts` — the session shape.
- `src/lib/rbac.ts` — the server-side equivalent.
