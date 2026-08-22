# src/app/api/quality/lab-letters/[id]/pdf/route.tsx

> `/api/quality/lab-letters/[id]/pdfx` — GET

See [../../../README.md](../../../README.md) for this module's shared behaviour, and
[the API pattern](../../../../README.md) for the conventions every route follows.

## What it does

Operates on `labLetter`.

- **GET** — Read

## How it works

- Gated by `checkAccess("labLetter", "read")`. **Authentication only** — role enforcement is disabled app-wide.
- Company-scoped with `companyFilter(companyId)`.
- Renders a PDF via headless Chromium. Cold starts routinely fail; the client retries once. `maxDuration` and `memory` are raised in `vercel.json`.

## testNames is a JSON string, not an array

`LabLetter.testNames` is `String?` (`@db.LongText`) holding JSON. An
`Array.isArray` check on it is always false, which showed as a letter with no
tests at all; it is read through `parseStringArray`.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Named `.tsx` because it contains JSX — a route file with JSX must not be `.ts`.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/pdf/render-pdf.ts`
- [Module overview](../../../README.md)
