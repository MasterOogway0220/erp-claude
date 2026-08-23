# src/app/api/mtc/certificates/[id]/pdf/route.tsx

> `/api/mtc/certificates/[id]/pdf` — GET

See [../../../README.md](../../../README.md) for this module's shared behaviour, and
[the API pattern](../../../../README.md) for the conventions every route follows.

## What it does

Operates on `mTCCertificate`, `companyMaster`.

- **GET** — Read

## How it works

- Gated by `checkAccess("mtc", "read")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Renders the PDF in-process with `@react-pdf/renderer`. There is no browser
  binary involved: Puppeteer and `@sparticuz/chromium` were removed once the
  last route was migrated, which took roughly 50MB out of the lambda bundle
  and removed the cold-start failures the Chromium launch used to cause.
  `maxDuration` and `memory` are still raised in `vercel.json` for the
  heaviest documents.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/pdf/render-pdf.ts`
- [Module overview](../../../README.md)
