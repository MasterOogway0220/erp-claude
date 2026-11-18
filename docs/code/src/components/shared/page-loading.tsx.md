# src/components/shared/page-loading.tsx

> The full-page placeholder shown while a screen fetches its data.

## Why this exists

Consistent loading state, and to stop each page inventing its own. About 70 pages return it while loading, so it is the loading experience for most of the app.

## What it does

Renders a skeleton shaped like the common screen: a title and description with an action button, a filter bar, and a bordered table of nine rows. It used to be a lone centred spinner with "Loading...", which left the screen blank and made the layout jump when content arrived (frontend rule 25: skeletons, not lone spinners).

## How it works

- Built from `Skeleton` blocks. `role="status"`, `aria-live="polite"` and a visually hidden "Loading" so screen readers announce the state.
- Pulse animation stops for users with reduced motion (handled in `Skeleton`).

## Gotchas and constraints

- **Return it early, before the main render.** Pages that render the form while
  data loads produce a blank-field flash and, worse, let effects run against
  empty state. The quotation edit page returns this until `editData` exists for
  exactly that reason.
- Also used as a `<Suspense>` fallback on about 20 pages. The shape is generic; a detail page shows the same list-shaped placeholder, which is acceptable for the second or so it is visible.

## Related

- `src/components/ui/skeleton.tsx` — the building block, also for inline placeholders.
