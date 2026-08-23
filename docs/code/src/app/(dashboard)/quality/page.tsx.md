# src/app/(dashboard)/quality/page.tsx

> Client page at `/quality`.

See [README.md](README.md) for this module's shared behaviour.

## What it does

Renders the `/quality` screen. 737 lines.

## How it works

- `"use client"` — runs in the browser.
- Reads `useSearchParams`, so it **must sit inside a `<Suspense>` boundary** — Next.js 16 fails the build otherwise.
- Calls: `/api/quality/inspections`, `/api/quality/lab-letters`, `/api/quality/lab-reports`, `/api/quality/mtc/${mtcId}`, `/api/quality/ncr`, `/api/quality/qc-release`.
- Requests `/api/quality/inspections?view=list`. This table shows the heat number, inspector and overall result — never an individual measured parameter — so it opts into the summary shape.

## Gotchas

- Large file (737 lines). Read the section you are changing rather than pattern-matching from a sibling.
- Any `Select` needs a non-empty `SelectItem` value; the codebase uses a `"NONE"` sentinel mapped to `""`.
- Role gating in the UI is cosmetic — the API is the boundary, and its role checks are currently disabled.

## Related

- [Module overview](README.md)
- `src/components/shared/` — `DataTable`, `PageHeader`, `SmartCombobox`
