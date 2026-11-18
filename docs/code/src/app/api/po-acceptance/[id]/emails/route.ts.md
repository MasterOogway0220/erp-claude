# src/app/api/po-acceptance/[id]/emails/route.ts

> `/api/po-acceptance/[id]/emails` — GET

See [../../README.md](../../README.md) for this module's shared behaviour, and
[the API pattern](../../../README.md) for the conventions every route follows.

## What it does

Operates on `pOAcceptanceEmailLog`.

- **GET** — Read

## How it works

- Gated by `checkAccess("poAcceptance", "read")`. **Authentication only** — role enforcement is disabled app-wide.
- **Company-scoped through the parent record.** The email log has no
  `companyId` of its own, so the query filters on
  `poAcceptance: companyFilter(companyId)`. Before this, any logged-in user
  could read another company's PO-acceptance email history (recipients,
  subjects) by guessing an id. An id from another company now returns an
  **empty list** (200), not a 404.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Errors return a generic `"Failed to fetch email logs"` (500); details go to the server log.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../README.md)
