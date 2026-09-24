# src/lib/sandbox/context.ts

> `currentSandbox()`: the sandbox user id for the current request, or null.

## Why this exists

Everything that behaves differently for the sandbox login — the Prisma router,
the mailer, the master cache, the `checkAccess` guard — asks this one function.
See the [module README](./README.md).

## What it does

Reads the `x-erp-sandbox` header via `next/headers`. Returns its value, or
`null` when absent or when there is no request at all (`headers()` throws in
scripts, the build, module evaluation — those are never sandbox).

## How it works

Trusting a header is safe only because `src/middleware.ts` runs on every
`/api/*` request and deletes any client-sent copy before setting it from the
verified JWT ([headers.ts](./headers.ts.md)).

## Gotchas and constraints

- Only meaningful under `/api/*` (the middleware matcher). There are no server
  components or server actions that query the DB; if one is added, it will
  always be treated as a normal request.

## Related

- `headers.ts`, `src/middleware.ts`, `src/lib/prisma.ts`, `src/lib/mailer.ts`,
  `src/lib/cache/master-cache.ts`, `src/lib/rbac.ts`.
