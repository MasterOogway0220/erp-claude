# src/app/api/dispatch/dispatch-notes/[id]/dossier/email/route.tsx

> `/api/dispatch/dispatch-notes/[id]/dossier/emailx` — POST

See [../../../../README.md](../../../../README.md) for this module's shared behaviour, and
[the API pattern](../../../../../README.md) for the conventions every route follows.

## What it does

Operates on `dispatchNote`, `clientPurchaseOrder`, `pOAcceptance`.

- **POST** — Create

## How it works

- Gated by `checkAccess("dispatch", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- **Not company-scoped.** Either catalogue data (deliberately global) or scoped via a parent record — verify which before changing.
- Sends mail through `mailer()`. **SMTP is not configured in production**, so this currently fails with a message naming the missing variables.
- Renders the PDF in-process with `@react-pdf/renderer`. There is no browser
  binary involved: Puppeteer and `@sparticuz/chromium` were removed once the
  last route was migrated, which took roughly 50MB out of the lambda bundle
  and removed the cold-start failures the Chromium launch used to cause.
  `maxDuration` and `memory` are still raised in `vercel.json` for the
  heaviest documents.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Named `.tsx` because it contains JSX — a route file with JSX must not be `.ts`.
- Confirm the company-scoping story before reusing this as a template.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/mailer.ts`
- `src/lib/pdf/render-pdf.ts`
- [Module overview](../../../../README.md)
