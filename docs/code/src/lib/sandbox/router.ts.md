# src/lib/sandbox/router.ts

> `routedClient(base, sandbox, pickSandbox)`: a Prisma client that decides per
> call whether the real client or the sandbox client runs it.

## Why this exists

208 files import `prisma` from `src/lib/prisma.ts`. Routing inside the client
is what lets the sandbox work with no route changes. See the
[module README](./README.md).

## What it does

Returns a `Proxy` typed as the client:

- **Model delegates** (`prisma.quotation.findMany(...)`) — each method call
  awaits `pickSandbox()` and runs on `sandbox()` if it returned a user id,
  otherwise on `base()`.
- **`$transaction(fn, options)`** — the whole callback runs on the chosen
  client, so `tx` is that client's transaction. The array form throws (below).
- **`$queryRaw`, `$queryRawUnsafe`, `$executeRaw`, `$executeRawUnsafe`** — same
  choice (tagged templates pass through).
- **Everything else** (`$connect`, `$disconnect`, `$on`, …) — the base client,
  bound.

`sandbox()` is only called for a sandbox request, so normal traffic never
constructs the sandbox client or its pool.

## How it works

The delegate list is derived from the schema's DMMF (`Quotation` →
`quotation`, `RFQVendor` → `rFQVendor`). Delegate proxies are cached per name.

## Gotchas and constraints

- **Routed model calls return plain Promises, not lazy `PrismaPromise`s.** The
  query starts when the method is called, not when awaited. Nothing in the app
  relies on laziness except the array form of `$transaction`.
- **The array form of `$transaction` throws.** Routed calls are
  already-running Promises, so an array could only ever be `Promise.all` —
  silently not atomic, for real users too. It fails loudly instead; use the
  callback form. Its one former use (three counts in
  `masters/customers/[id]/dispatch-addresses/[addressId]`) is now a plain
  `Promise.all`.
- The per-call `pickSandbox()` is a header read (`next/headers`), not a query.
- Delegate *properties* other than methods (e.g. `prisma.quotation.fields`)
  are not supported; nothing in the app uses them.

## Related

- `src/lib/prisma.ts` (wires it, also exports `realPrisma`), `context.ts`.
- `router.test.ts`.
