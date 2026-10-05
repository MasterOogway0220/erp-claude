# src/app/(dashboard)/tenders/create/page.tsx

> Client page at `/tenders/create`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/tenders/create` screen. 535 lines.

## How it works

- `"use client"` — runs in the browser.
- Calls: `/api/masters/customers`, `/api/quotations/preview-number`, `/api/tenders`, `/api/tenders/[id]`.
- Reads `useSearchParams`, so the page is wrapped in `<Suspense>` (Next.js 16 fails the build otherwise).
- **Also the edit screen.** `/tenders/create?editId=<id>` loads the tender from
  `GET /api/tenders/[id]`, fills every header field and the BOQ (bill of
  quantities — the line items the client is tendering for) grid, shows the
  existing tender number, and saves with `PATCH /api/tenders/[id]`, sending the
  whole grid so the server replaces all lines. Each line's `additionalSpec`
  has no input here but is loaded and sent back, so an edit does not wipe it.
  The tender number never changes on edit. Before 5 Oct 2026 a tender could not be edited at all after
  registration, so a wrong BOQ quantity could not be corrected.
- The customer dropdown reads the shared `useCustomers` hook. **This fixed a live bug:** the screen used to fetch `/api/masters/customers` and then test `Array.isArray(data)`, but that route answers `{ customers: [...] }` and never a bare array — so the check was always false, `setCustomers` was never called, and the dropdown was permanently empty with nothing reporting an error.

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
