# src/app/api/quality/mtc/route.ts

> `/api/quality/mtc` — GET, POST

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `mTCDocument`.

- **GET** — Read
- **POST** — Create

## How it works

- Gated by `checkAccess("mtc", "read")`, `checkAccess("mtc", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- **Not company-scoped.** Either catalogue data (deliberately global) or scoped via a parent record — verify which before changing.

## Gotchas

- Confirm the company-scoping story before reusing this as a template.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../README.md)

## Change (2026-11-18, row cap)

The list GET takes `pageSize` (default and cap 500) via `takeFrom` in `src/lib/pagination.ts`, newest first. Callers that pass no pageSize get the newest 500 rows. There is no offset yet, so a screen that filters in the browser cannot reach rows past the newest 500; server-side paging is the upgrade when a table nears that size.
