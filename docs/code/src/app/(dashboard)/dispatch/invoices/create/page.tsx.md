# src/app/(dashboard)/dispatch/invoices/create/page.tsx

> Client page at `/dispatch/invoices/create`.

See [../../README.md](../../README.md) for this module's shared behaviour.

## What it does

Renders the `/dispatch/invoices/create` screen. 697 lines.

## How it works

- `"use client"` — runs in the browser.
- Reads `useSearchParams`, so it **must sit inside a `<Suspense>` boundary** — Next.js 16 fails the build otherwise.
- Calls: `/api/dispatch/dispatch-notes`, `/api/dispatch/invoices`, `/api/dispatch/packing-lists/${dn.packingList.id}`, `/api/masters/tax`, `/api/masters/warehouses`.
- GST rates come from the shared `["tax-rates"]` entry via `useTaxRatesQuery`. The default rate is still derived from the first active GST row, but now only **once** — guarded by a ref, because the list can refetch and re-deriving would overwrite a rate the user had already changed on the form.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.
- `dispatchNotes` is wrapped in `useMemo`. Without it, `dispatchNotesData?.dispatchNotes ?? []` is a new array on every render while the query loads; the effect that clears the form when no dispatch note is picked depends on it and calls `setItems([])`, so the page re-renders forever and React aborts with error #185. This crashed the page on every open from 23 Aug to 5 Oct 2026.

## Sandbox preview (temporary, from 5 Oct 2026)

`page.tsx` is currently a gate: the sandbox login gets `page.sandbox.tsx`
— the behaviour this doc describes — and every other user gets
`page.legacy`, the version from before the 03/10/26 meeting fixes. See
`src/lib/sandbox/preview.ts.md`. Going live: replace this file with the
`.sandbox` copy and delete both copies; then delete this section.

## Related

- [Module overview](../../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
