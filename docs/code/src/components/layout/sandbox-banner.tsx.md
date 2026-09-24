# src/components/layout/sandbox-banner.tsx

> The amber "SANDBOX MODE" bar shown only to the sandbox login, with the
> "Reset Sandbox" button.

## Why this exists

The sandbox login sees realistic data and can do everything an admin can. The
banner makes it impossible to forget that none of it is real, says how old the
copy is, and offers a clean start. See
[the sandbox module](../../lib/sandbox/README.md).

## What it does

`<SandboxBanner />` renders nothing unless `session.user.isSandbox`. Otherwise:
the notice, "Data copied <time>; refreshed nightly" (from `GET /api/sandbox`),
and a Reset button that confirms, `POST`s `/api/sandbox`, and reloads.

## How it works

Client component; reads the session via `useSession()` (the dashboard layout
provides `SessionProvider`). Errors from the reset are shown inline.

## Gotchas and constraints

- Uses the browser `confirm()` dialog.
- Rendered above `TopBar` in `src/app/(dashboard)/layout.tsx`.

## Related

- `src/app/api/sandbox/route.ts`, `src/app/(dashboard)/layout.tsx`.
