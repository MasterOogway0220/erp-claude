# src/app/api/reports/client-status/[salesOrderId]/pdf/route.ts

> `/api/reports/client-status/[salesOrderId]/pdf` — GET

See [../../../README.md](../../../README.md) for this module's shared behaviour, and
[the API pattern](../../../../README.md) for the conventions every route follows.

## What it does

Operates on `companyMaster`.

- **GET** — Read

## How it works

- Gated by `checkAccess("salesOrder", "read")`. **Authentication only** — role enforcement is disabled app-wide.
- **Not company-scoped.** Either catalogue data (deliberately global) or scoped via a parent record — verify which before changing.
- Renders a PDF via headless Chromium. Cold starts routinely fail; the client retries once. `maxDuration` and `memory` are raised in `vercel.json`.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Confirm the company-scoping story before reusing this as a template.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/pdf/render-pdf.ts`
- [Module overview](../../../README.md)
