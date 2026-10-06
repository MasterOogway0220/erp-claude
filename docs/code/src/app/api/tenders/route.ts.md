# src/app/api/tenders/route.ts

> `/api/tenders` — GET, POST

See [README.md](README.md) for this module's shared behaviour, and
[the API pattern](../README.md) for the conventions every route follows.

## What it does

Operates on `tender`.

- **GET** — Read
- **POST** — Create

## How it works

- Gated by `checkAccess("tender", "read")`, `checkAccess("tender", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`. The list excludes soft-deleted tenders (`deletedAt`).
- Allocates a document number with `generateDocumentNumber()` (per company, per financial year).
- POST builds the BOQ lines with `tenderItemRows` (`src/lib/tenders/items.ts`), the same mapping PATCH uses when a tender is edited.
- POST stores the tender's Terms & Conditions (`TenderTerm`) from `terms` via `tenderTermRows` (`src/lib/quotations/terms.ts`): numbered, trimmed, blank rows dropped, `isCustom` kept. A missing `terms` stores none.
- Writes an audit row. Audit failures are swallowed and never block the operation.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Sandbox preview (temporary, from 5 Oct 2026)

`route.ts` is currently a gate: the sandbox login gets `route.sandbox.ts`
— the behaviour this doc describes — and every other user gets
`route.legacy`, the version from before the 03/10/26 meeting fixes. See
`src/lib/sandbox/preview.ts.md`. Going live: replace this file with the
`.sandbox` copy and delete both copies; then delete this section.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/document-numbering.ts`
- [Module overview](README.md)
