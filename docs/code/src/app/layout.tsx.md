# src/app/layout.tsx

> The root layout — fonts, global styles, and the providers every page needs.

## Why this exists

Next.js App Router requires one root layout. It renders `<html>` and `<body>`
and is where anything global must live.

## What it does

Sets metadata and fonts, imports `globals.css`, and wraps children in the
session and query providers plus the toast host.

## How it works

The provider order matters. `SessionProvider` must be outside anything calling
`useSession` — which includes `useCurrentUser`, used across the dashboard.
`QueryProvider` must be outside any `useQuery`.

`<Toaster />` (sonner) mounts once here; components call `toast()` from
anywhere.

## Gotchas and constraints

- **The `(auth)` and `(dashboard)` route groups both nest inside this**, so
  anything added here appears on the login screen too.
- Fonts are loaded via `next/font`, which self-hosts them — no external
  request, which matters for the PDF renderer and for reliability.

## Related

- `src/components/providers/query-provider.tsx`
- `src/app/(dashboard)/layout.tsx` — the application chrome.
- `src/app/(auth)/layout.tsx` — deliberately no chrome.
