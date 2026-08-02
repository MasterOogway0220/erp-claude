# src/app/(auth)/layout.tsx

> A pass-through layout for the login pages.

## Why this exists

`(auth)` is a Next.js **route group** — the parentheses mean it does not appear
in the URL, so `/login` stays `/login`. Grouping the auth pages separates them
from `(dashboard)`, which wraps its children in the sidebar and topbar.

A login page must not render inside the application shell — there is no session
yet, and the sidebar would have nothing to show. This layout exists to provide
*no* chrome.

## What it does

Renders `children` in a fragment. Seven lines.

## Gotchas and constraints

- It looks deletable. It is not: without a layout here, the pages would inherit
  the nearest ancestor's, which is the root layout — acceptable today, but the
  explicit empty layout is what stops dashboard chrome ever leaking in.
- Global providers live in the root layout and still apply.

## Related

- `src/app/(auth)/login/page.tsx`, `superadmin/login/page.tsx`
- `src/app/(dashboard)/layout.tsx` — the chrome this deliberately avoids.
