# src/app/api/quality/inspections/route.ts

> `/api/quality/inspections` — GET, POST

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `inspection`, `inventoryStock`, `nCR`.

- **GET** — Read
- **POST** — Create

## How it works

- Gated by `checkAccess("inspection", "read")`, `checkAccess("inspection", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- **GET `?view=list`** returns a summary shape: `parameters` — one row per measured property (dimensions, chemistry, hydro test) — is dropped, and `grnItem` narrows to `{ id, heatNo }`, removing a nested join per row. On an unpaginated list that is the bulk of the payload, and neither list screen renders any of it. Opt-in.
- Company-scoped with `companyFilter(companyId)`.
- Allocates a document number with `generateDocumentNumber()` (per company, per financial year).
- Writes inside `$transaction`. Item updates follow the delete-and-recreate pattern, so **a field the caller omits is lost**.
- Writes an audit row. Audit failures are swallowed and never block the operation.
- Raises an `Alert` for a role. Also non-blocking.

## Gotchas

- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/document-numbering.ts`
- [Module overview](../README.md)
