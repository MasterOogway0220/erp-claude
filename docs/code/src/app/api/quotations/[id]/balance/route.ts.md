# src/app/api/quotations/[id]/balance/route.ts

> `/api/quotations/[id]/balance` — GET

See [../../README.md](../../README.md) for this module's shared behaviour, and
[the API pattern](../../../README.md) for the conventions every route follows.

## What it does

Operates on `quotation`.

- **GET** — Read

## How it works

- Gated by `checkAccess("clientPO", "read")`. **Authentication only** — role enforcement is disabled app-wide.
- **Not company-scoped.** Either catalogue data (deliberately global) or scoped via a parent record — verify which before changing.
- Returns, per quotation line, the quantity quoted, the quantity already
  ordered across non-cancelled client POs, and the balance still orderable.
  The client PO create page builds its item list from this.
- **Regretted lines are filtered out.** A line marked `isRegret` was never
  quoted — it carries no rate and prints `REGRET` — so the customer cannot
  raise a PO against it and it must not appear as orderable balance.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Confirm the company-scoping story before reusing this as a template.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../README.md)
