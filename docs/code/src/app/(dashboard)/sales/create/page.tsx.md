# src/app/(dashboard)/sales/create/page.tsx

> Client page at `/sales/create`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/sales/create` screen. 578 lines.

## How it works

- `"use client"` — runs in the browser.
- Reads `useSearchParams`, so it **must sit inside a `<Suspense>` boundary** — Next.js 16 fails the build otherwise.
- Calls: `/api/masters/customers`, `/api/quotations`, `/api/sales-orders`, `/api/tenders/${tenderId}`.

- Selecting a quotation auto-populates the line items from it. **Lines marked
  `isRegret` are filtered out**: a regretted line is one the company declined
  to quote, so it has no price and cannot be sold. Without the filter it would
  arrive with rate `0` and be rejected later by the sales-order API's
  "unit rate must be positive" check, with no explanation of why.
- Selecting a quotation also fetches `/api/quotations/[id]` for its offer
  terms and pre-fills **Payment Terms** from its "Payment" row and **Delivery
  Schedule** from its "Delivery" row (`termValue`, `src/lib/quotations/terms.ts`).
  A newly picked quotation's values replace the previous one's; a response
  that arrives after the user has picked another quotation is ignored. Quotations record these terms as offer-term
  rows; the structured payment/delivery-terms fields are never filled.
- Opened with `?tenderId=`, the tender's BOQ lines (product, material,
  additional spec, size, qty) become the order lines; rates are entered here.
  Before 5 Oct 2026 only the customer and project were copied.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Sandbox preview (temporary, from 5 Oct 2026)

`page.tsx` is currently a gate: the sandbox login gets `page.sandbox.tsx`
— the behaviour this doc describes — and every other user gets
`page.legacy`, the version from before the 03/10/26 meeting fixes. See
`src/lib/sandbox/preview.ts.md`. Going live: replace this file with the
`.sandbox` copy and delete both copies; then delete this section.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
