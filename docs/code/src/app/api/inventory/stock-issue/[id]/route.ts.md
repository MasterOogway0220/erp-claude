# src/app/api/inventory/stock-issue/[id]/route.ts

> `/api/inventory/stock-issue/[id]` — GET, PATCH

See [../../README.md](../../README.md) for this module's shared behaviour, and
[the API pattern](../../../README.md) for the conventions every route follows.

## What it does

Operates on `stockIssue`.

- **GET** — Read
- **PATCH** — Partial update / status change

## How it works

- Gated by `checkAccess("stockIssue", "read")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Writes inside `$transaction`. Item updates follow the delete-and-recreate pattern, so **a field the caller omits is lost**.
- Status changes validated against a transition map; invalid moves are refused.
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../README.md)

## Security change (2026-10-22, follow-up)

Authorize locks each stock row (`FOR UPDATE`) and requires it to still be ACCEPTED before dispatching it; otherwise 409 `Stock ... is no longer ACCEPTED`. Creating an issue does not reserve stock, so this check is the only guard against dispatching it twice.
