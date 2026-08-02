# src/app/api/quality/inspection-prep/[id]/items/[itemId]/heats/[heatId]/mtc/route.ts

> `/api/quality/inspection-prep/[id]/items/[itemId]/heats/[heatId]/mtc` — POST

See [../../../../../../../README.md](../../../../../../../README.md) for this module's shared behaviour, and
[the API pattern](../../../../../../../../README.md) for the conventions every route follows.

## What it does

Operates on `heatMTCDocument`.

- **POST** — Create

## How it works

- Gated by `checkAccess("inspectionPrep", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- **Not company-scoped.** Either catalogue data (deliberately global) or scoped via a parent record — verify which before changing.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Confirm the company-scoping story before reusing this as a template.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../../../../../../README.md)
