# src/app/error.tsx

> The global error boundary — what renders when a page throws.

## Why this exists

Next.js App Router requires an `error.tsx` to catch render-time exceptions.
Without one, an unhandled throw takes down the whole route with the framework's
default page.

## What it does

Shows that the screen failed, the details needed to diagnose it, and three
ways out: retry, copy the details, or go back to the dashboard.

The details block carries the page path, Next's error `digest` and the error
message — whichever of those exist.

## How it works

Must be a **client component** (`"use client"`) — Next.js requires it, because
the boundary has to run in the browser to offer `reset()`.

Receives `error` and `reset`. `reset()` re-renders the segment, which is worth
offering because a good share of failures here are transient: a database
connection dropped by the host's 20-second `wait_timeout`, or a cold-start
timeout.

**Why the details are on screen.** This page used to say only "Something went
wrong", with the cause logged to the browser console. That is fine for
reassurance and useless for repair: every failing screen produced the identical
message, so a user reporting a broken page could describe the symptom but carry
nothing about the cause — not even which screen it was. A report of "some pages
in order processing show something went wrong" was, in practice, undiagnosable.

What is shown is deliberately bounded. The **digest** is the value that ties the
report to a specific server-side error in the deployment logs, and is the single
most useful thing a user can send back. The **message** identifies the failure
class. A **stack trace is not shown** — noise to the reader, and it can expose
internals.

The copy button uses `navigator.clipboard`, which is unavailable on insecure
origins and can be denied. That rejection is swallowed on purpose: the details
are already on screen, so a failed copy is not worth reporting as a second
error inside the error page.

`window.location.pathname` is read directly rather than through the router,
because this component renders outside a normal page tree and must not itself
throw while reporting a throw.

## Gotchas and constraints

- **Does not catch errors in the root layout** — a throw there needs
  `global-error.tsx`, which this project does not have.
- **Does not catch API route errors.** Those are caught by each route's own
  `try/catch` and returned as JSON, which the caller surfaces as a toast.
- **Server errors are already digested in production.** Next.js replaces a
  server-side error's message with a generic one and gives it a `digest`, so
  what this page shows for those is the reference, not the underlying detail.
  Client-side render errors — the common case here — show their real message.
- The details block must never grow a stack trace or raw response body. It is
  read by warehouse and sales staff, and it is copied into emails.

## Related

- `src/app/not-found.tsx` — the 404 counterpart.
- `src/app/layout.tsx`
