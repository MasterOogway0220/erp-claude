# src/app/(dashboard)/masters/industry-segments/page.tsx

> Client page at `/masters/industry-segments`.

See [../README.md](../README.md) for this module's shared behaviour.

## What it does

Renders the `/masters/industry-segments` screen. 191 lines.

## How it works

- `"use client"` — runs in the browser.
- Fetches with TanStack Query (`useQuery`); server state is not duplicated into local state.
- Writes with `useMutation`, invalidating the affected query keys on success.
- Calls: `/api/masters/industry-segments`, `/api/masters/industry-segments/${id}`.
- Reads the segment master through `useReferenceQuery` (ten-minute window, shared `["industry-segments"]` entry). Note the endpoint returns `segments`, not `industrySegments`.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](../README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
