# src/app/api/tenders/[id]/documents/route.ts

> `/api/tenders/[id]/documents` — GET, POST

See [../../README.md](../../README.md) for this module's shared behaviour, and
[the API pattern](../../../README.md) for the conventions every route follows.

## What it does

Operates on `tenderDocument`, `tender`.

- **GET** — Read
- **POST** — Create

## How it works

- Gated by `checkAccess("tender", "read")`, `checkAccess("tender", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- **Not company-scoped.** Either catalogue data (deliberately global) or scoped via a parent record — verify which before changing.
- Stores uploads with `storeFile()` — into the database, not the filesystem.
- A soft-deleted tender (`deletedAt` set) is treated as not found.

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
- `src/lib/storage/files.ts`
- [Module overview](../../README.md)
