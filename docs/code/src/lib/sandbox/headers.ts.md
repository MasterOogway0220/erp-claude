# src/lib/sandbox/headers.ts

> `markSandboxHeaders(incoming, token)`: the request headers middleware
> forwards — client-sent sandbox header removed, then set only from a verified
> sandbox token.

## Why this exists

The sandbox marker is a request header, so it must be impossible for a client
to set it. If a normal user could add `x-erp-sandbox`, they would be reading
(and writing) the sandbox copies — the reverse leak. See the
[module README](./README.md).

## What it does

- `SANDBOX_HEADER` — `"x-erp-sandbox"`.
- `markSandboxHeaders(incoming, token)` — copies the headers, deletes
  `x-erp-sandbox`, and sets it to `token.id` only when `token.isSandbox` and
  `token.id` are both present.

## How it works

Pure (no Next imports) so both middleware and tests use it directly.
Middleware calls it for every `/api/*` request, `/api/auth/*` included.

## Gotchas and constraints

- Protection depends on middleware running for the path. The matcher covers
  `/api/:path*`; `checkAccess`/`checkAuth` additionally refuse a sandbox
  session whose request was not marked.

## Related

- `src/middleware.ts`, `context.ts`, `headers.test.ts`, the forged-header case
  in `e2e/sandbox.e2e.ts`.
