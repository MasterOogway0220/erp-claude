# src/app/api/quotations/[id]/pdf/route.tsx

> `/api/quotations/[id]/pdfx` — GET

See [../../README.md](../../README.md) for this module's shared behaviour, and
[the API pattern](../../../README.md) for the conventions every route follows.

## What it does

Operates on `quotation`, `companyMaster`.

- **GET** — Read

## How it works

- Gated by `checkAccess("quotation", "read")`. **Authentication only** — role enforcement is disabled app-wide.
- **Not company-scoped.** Either catalogue data (deliberately global) or scoped via a parent record — verify which before changing.

## Gotchas

- The include must select both `preparedBy` and `dealOwner` — the non-standard
  header's "Prepared by" block prints the Inquiry Owner (`dealOwner`) with
  `preparedBy` only as fallback; drop `dealOwner` from the query and the PDF
  silently shows the wrong contact.
- The filename uses `displayInquiryNo` (digit filter) but the printed header
  shows the inquiry no. raw — the two differing is intentional.
- `params` is a `Promise` (Next.js 16) and must be awaited.
- Named `.tsx` because it contains JSX — a route file with JSX must not be `.ts`.
- Confirm the company-scoping story before reusing this as a template.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../README.md)
