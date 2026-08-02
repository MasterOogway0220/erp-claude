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
- Renders a PDF via headless Chromium. Cold starts routinely fail; the client retries once. `maxDuration` and `memory` are raised in `vercel.json`.

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
