# src/app/(dashboard)/masters/products/page.tsx

> Client page at `/masters/products`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/masters/products` screen. 929 lines.

## How it works

- `"use client"` — runs in the browser.
- Fetches with TanStack Query (`useQuery`); server state is not duplicated into local state.
- Writes with `useMutation`, invalidating the affected query keys on success.
- Reads `useSearchParams`, so it **must sit inside a `<Suspense>` boundary** — Next.js 16 fails the build otherwise.
- Calls: `/api/masters/additional-specs`, `/api/masters/additional-specs/seed`, `/api/masters/dimensional-standards`, `/api/masters/lengths`, `/api/masters/lengths/${id}`, `/api/masters/products`, `/api/masters/products/${id}`, `/api/masters/sizes`.
- The dimensional-standards and product-spec lists read through `useReferenceQuery`, holding their entries for ten minutes instead of 60 seconds. The paginated product and size lists keep their filter values in the key and are unaffected.

## Gotchas

- Large file (929 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
