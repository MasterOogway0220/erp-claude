# src/app/api/client-purchase-orders/[id]/route.ts

> `/api/client-purchase-orders/[id]` — GET, PATCH

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `clientPurchaseOrder`, `clientPOItem`, `rateRevision`.

- **GET** — Read
- **PATCH** — Partial update / status change

## How it works

- Gated by `checkAccess("clientPO", "read")`, `checkAccess("clientPO", "write")`. **Authentication only** — role enforcement is disabled app-wide.
- **Not company-scoped.** Either catalogue data (deliberately global) or scoped via a parent record — verify which before changing.

## Notes

GET includes `billingAddress` (the bill-to party chosen at registration, which
may differ from the ship-to address) and spreads each item, so `qtyRemark`
reaches the detail screen along with the rate-revision history.
- GET includes `dispatchAddress` (it used to return only the billing address, so the detail screen could not show where the order ships) and the order's `terms` in `termNo` order.

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
- [Module overview](../README.md)
