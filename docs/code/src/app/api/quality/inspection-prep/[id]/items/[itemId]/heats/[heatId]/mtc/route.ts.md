# src/app/api/quality/inspection-prep/[id]/items/[itemId]/heats/[heatId]/mtc/route.ts

> `/api/quality/inspection-prep/[id]/items/[itemId]/heats/[heatId]/mtc` — POST

See [../../../../../../../README.md](../../../../../../../README.md) for this module's shared behaviour, and
[the API pattern](../../../../../../../../README.md) for the conventions every route follows.

## What it does

Operates on `heatMTCDocument`.

- **POST** — Attach an MTC document (`mtcNo`, `mtcDate`, `fileUrl`) to one
  heat. **201** with the record; **404** `"Heat not found"` if the heat's prep
  is not in the caller's company; **500** `"Failed to add MTC document"` on any
  other error.

## How it works

- Gated by `checkAccess("inspectionPrep", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- Also checks `QA_ROLES`, which currently lists every role, so it is
  effectively a login check too.
- **Company-scoped through the parent chain.** A heat entry has no
  `companyId`; the route checks
  `heatEntry → inspectionPrepItem → inspectionPrep: companyFilter(companyId)`
  and 404s otherwise. Before this, any logged-in user could attach
  certificates to another company's heats.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Only `heatId` is read from the URL. The `[id]` and `[itemId]` segments are
  not checked against the heat, so a mismatched path still works as long as
  the heat is in the caller's company.
- The 500 message is generic; it used to return `error.message` (Prisma internals). Details go to the server log.

## Domain notes

A **heat** is one batch of steel from a single melt at the mill, identified by
its heat number stamped on the pipe. An **MTC** (Mill Test Certificate) is the
mill's certificate of that heat's chemistry and mechanical tests. Customers and
third-party inspectors check every supplied piece's heat number against its
MTC, so each heat in an inspection prep needs its MTC attached.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../../../../../../README.md)
