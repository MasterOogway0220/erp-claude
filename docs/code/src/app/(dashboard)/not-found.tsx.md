# src/app/(dashboard)/not-found.tsx

> Server page at `/not-found.tsx`.

## What it does

Renders the `/not-found.tsx` screen. 21 lines.

## How it works

Presentational; see the source.

## Gotchas

- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
