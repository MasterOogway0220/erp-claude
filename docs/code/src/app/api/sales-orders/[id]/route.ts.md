# src/app/api/sales-orders/[id]/route.ts

> `/api/sales-orders/[id]` — GET, PATCH, PUT

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `salesOrder`.

- **GET** — Read
- **PATCH** — Partial update / status change
- **PUT** — Replace

## How it works

- Gated by `checkAccess("salesOrder", "read")`, `checkAccess("salesOrder", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Writes inside `$transaction`. Item updates follow the delete-and-recreate pattern, so **a field the caller omits is lost**.
- The PUT (the order wizard's Review step "Edit Order", `ReviewStep.tsx`) keeps
  each line's `uom`, `itemDescription`, `poSlNo` and `poItemCode` from the line
  it replaces, matched by the line `id` the form sends. The form carries none
  of them, so before 6 Oct 2026 an edit erased the units, a non-standard
  line's description, and the client's PO line number and item code. A line
  added during the edit has no id and starts without them.
- Status changes validated against a transition map; invalid moves are refused.
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Sandbox preview (temporary, from 6 Oct 2026)

`route.ts` is currently a gate: the sandbox login gets `route.sandbox.ts`
— the behaviour this doc describes — and every other user gets
`route.legacy`, the version from before 6 Oct 2026, whose PUT still erases
those four line fields. See `src/lib/sandbox/preview.ts.md`. Going live:
replace this file with the `.sandbox` copy and delete both copies; then delete
this section.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../README.md)
