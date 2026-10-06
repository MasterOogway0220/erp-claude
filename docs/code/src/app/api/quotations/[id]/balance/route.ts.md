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
- A soft-deleted quotation (`deletedAt` set) is treated as not found.
- The `quotation` block includes `terms` (`termName`, `termValue`, `isIncluded`, in `termNo` order): the client PO create screen copies them as the order's editable terms and reads Payment / Delivery from them.
- The `quotation` block also carries `buyer`: `{ name, email, phone }` for the
  quotation's buyer (a `BuyerMaster` row — the customer's purchasing contact
  the offer was addressed to), or `null` when none was picked. `phone` is the
  buyer's mobile, else telephone, the same choice the quotation PDF prints as
  "Contact no.". Added on 6 Oct 2026 for the client PO create screen.
- `quotation.customer` includes `customerType` (DOMESTIC / INTERNATIONAL).
  The client PO create screen uses it to decide whether GST applies, the same
  key the client PO POST uses (6 Oct 2026).
- Each item also carries `slNo` — the client's own serial for the line as the
  quotation printed it ("3", "1a"; `sNo` stays our positional number) — and
  `itemDescription`, a non-standard line's own text, whose `product` is often
  just "Non-Standard Item". Both are null when not set.

## Gotchas

- `params` is a `Promise` (Next.js 16) and must be awaited.
- Confirm the company-scoping story before reusing this as a template.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Sandbox preview (temporary, from 5 Oct 2026)

`route.ts` is currently a gate: the sandbox login gets `route.sandbox.ts`
— the behaviour this doc describes — and every other user gets
`route.legacy`, the version from before the 03/10/26 meeting fixes. See
`src/lib/sandbox/preview.ts.md`. Going live: replace this file with the
`.sandbox` copy and delete both copies; then delete this section.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [Module overview](../../README.md)
