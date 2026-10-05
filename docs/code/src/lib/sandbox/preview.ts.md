# src/lib/sandbox/preview.ts

> Per-request switch for API routes during a sandbox preview: the sandbox login gets the new handler, everyone else the unchanged one.

## Why this exists

On 5 Oct 2026 the owner asked for the 03/10/26 meeting fixes to go to
production but be visible **only to the sandbox account** until they had been
tested, then switched on for everyone. erp.n-pipe.com is one deployment for
all users, so the switch has to happen per request.

## What it does

`sandboxGate(next, legacy)` returns a route handler. On each request it asks
`currentSandbox()` (`./context.ts`) whether this is the sandbox login and calls
`next` if so, else `legacy`. If the chosen side is `undefined` (the method
exists only in the other version, e.g. tender `DELETE`), it answers 405.

Used by every gated `route.ts`:

```ts
import * as next from "./route.sandbox";
import * as legacy from "./route.legacy";
export const GET = sandboxGate(next.GET, legacy.GET);
```

## How it works

`currentSandbox()` reads a header that only the middleware can set (it strips
any client-sent copy on every `/api` request), so a normal user cannot opt in.
Segment config (`maxDuration`, `dynamic`) stays as literals in the gate file,
because Next.js reads it statically from the routed file.

## Gotchas and constraints

- **Temporary.** Going live means, for each gated route: replace `route.ts`
  with `route.sandbox.ts`, delete `route.sandbox.ts` and `route.legacy.ts`.
  Then delete this file, `src/components/sandbox/preview-gate.tsx`, and their
  test and docs.
- The database is shared. Migrations apply to everyone; the legacy code works
  with the new columns (they are additive), and sandbox writes go to `sbx_*`
  tables as always.

## Related

- `src/components/sandbox/preview-gate.tsx` — the same switch for pages and components.
- `src/lib/sandbox/context.ts`, `src/middleware.ts` — where "is this the sandbox login" comes from.
- Test: `src/lib/sandbox/preview.test.ts`.
