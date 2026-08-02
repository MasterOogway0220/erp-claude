# src/components/shared/page-loading.tsx

> A full-page loading spinner.

## Why this exists

Consistent loading state, and to stop each page inventing its own.

## What it does

Ten lines: a centred spinner.

## Gotchas and constraints

- **Return it early, before the main render.** Pages that render the form while
  data loads produce a blank-field flash and, worse, let effects run against
  empty state. The quotation edit page returns this until `editData` exists for
  exactly that reason.

## Related

- `src/components/ui/skeleton.tsx` — for inline placeholders instead.
