# src/app/error.tsx

> The global error boundary — what renders when a page throws.

## Why this exists

Next.js App Router requires an `error.tsx` to catch render-time exceptions.
Without one, an unhandled throw takes down the whole route with the framework's
default page.

## What it does

Shows an error message with a retry action.

## How it works

Must be a **client component** (`"use client"`) — Next.js requires it, because
the boundary has to run in the browser to offer `reset()`.

Receives `error` and `reset`. `reset()` re-renders the segment, which is worth
offering because a good share of failures here are transient: a database
connection dropped by the host's 20-second `wait_timeout`, or a cold-start
timeout.

## Gotchas and constraints

- **Does not catch errors in the root layout** — a throw there needs
  `global-error.tsx`, which this project does not have.
- **Does not catch API route errors.** Those are caught by each route's own
  `try/catch` and returned as JSON, which the caller surfaces as a toast.
- Error messages shown to the user should not leak internals; production
  Next.js already digests server errors.

## Related

- `src/app/not-found.tsx` — the 404 counterpart.
- `src/app/layout.tsx`
