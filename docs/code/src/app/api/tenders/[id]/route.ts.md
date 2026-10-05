# src/app/api/tenders/[id]/route.ts

> `/api/tenders/[id]` — GET, PATCH

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `tender`.

- **GET** — Read
- **PATCH** — Partial update / status change

## How it works

- Gated by `checkAccess("tender", "read")`, `checkAccess("tender", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped: GET and PATCH look the tender up with `companyFilter(companyId)`, so another company's tender is a 404. (Before 5 Oct 2026 both used a bare `findUnique` by id.)
- **PATCH** updates any header field sent, checks status transitions, and when
  `items` is an array replaces every BOQ line: delete all, then recreate from
  `tenderItemRows` (`src/lib/tenders/items.ts`, shared with create), in one
  callback-form transaction with the header update. The sandbox router rejects
  the array form of `$transaction` for every user. The tender number is never changed.
- **DELETE** (`checkAccess("tender", "delete")` — admin roles) is a soft delete: sets `deletedAt` via `softDeleteData()`, writes an audit row. Refused with 409 when any (not soft-deleted) quotation or sales order was raised from the tender, since those link back to it. GET's `quotations` likewise leaves out soft-deleted ones. GET, PATCH and a second DELETE treat a deleted tender as not found.
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Confirm the company-scoping story before reusing this as a template.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Sandbox preview (temporary, from 5 Oct 2026)

`route.ts` is currently a gate: the sandbox login gets `route.sandbox.ts`
— the behaviour this doc describes — and every other user gets
`route.legacy`, the version from before the 03/10/26 meeting fixes. See
`src/lib/sandbox/preview.ts.md`. Going live: replace this file with the
`.sandbox` copy and delete both copies; then delete this section.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../README.md)
