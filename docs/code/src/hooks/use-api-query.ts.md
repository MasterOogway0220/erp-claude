# src/hooks/use-api-query.ts

> The one way this app reads from its own API: a thin React Query wrapper plus
> the fetch helper, the error type, the debounce and the invalidator that go
> with it.

## Why this exists

Every dashboard screen — roughly 80 of them, and 67 files import from this
hook today — used to hand-roll the same twelve lines: `useState` for rows,
`useState` for a loading flag, a `useEffect` calling an async `fetchX`, and a
`try/catch` that swallowed the error. That shape has **no cache**. Pressing
Back re-ran the query. Opening four screens that each need the customer master
ran four identical `SELECT`s.

That is a performance annoyance on most stacks and a stability problem on this
one. The database is **Hostinger shared MySQL with a hard 75-connection cap**
and a firewall that bans connection churn (see
`docs/code/src/lib/prisma.ts.md` for what the cap does when it is hit: every
DB-touching route 500s at once). A query that never runs is the cheapest fix
for connection pressure there is, so "render instantly from cache" and "stop
hammering the database" are the same decision here rather than a trade-off.

Delete this file and you do not just lose a convenience wrapper — 67 screens
lose their cache, their request de-duplication and their consistent error
handling, and the connection pressure that caused the pool outages comes back.

## What it does

| Export | Contract |
|---|---|
| `useApiQuery<T>(key, url, options?)` | `useQuery` result. `data` is `T \| undefined`. |
| `useReferenceQuery<T>(key, url, options?)` | Same, with `staleTime` forced to 10 minutes. |
| `REFERENCE_STALE_TIME` | `600_000`. |
| `fetchJson<T>(url)` | `GET`, throws `ApiError` on non-2xx, else parses JSON. |
| `ApiError` | `Error` subclass carrying `status: number`. |
| `retryUnauthorizedOnce(failureCount, error)` | Pass as `options.retry` to retry a 401. |
| `useDebouncedValue<T>(value, delayMs = 300)` | Value, delayed. |
| `useInvalidate()` | `(...keys) => void`, drops cached results under each key prefix. |

`ApiQueryOptions` is `{ staleTime?, enabled?, retry? }` — deliberately three
fields, not the whole `UseQueryOptions` surface, so call sites stay uniform.

All of it is `"use client"`; none of it works in a server component.

## How it works

`useApiQuery` is a five-line pass-through to `useQuery`. The interesting parts
are around it.

### The key is the cache, not the URL

React Query caches by `queryKey`. The `url` is only closed over by the
query function. Two consequences a caller must internalise:

- **A value the URL depends on but the key omits serves the wrong rows.** Key
  `["inventory-stock"]` with a URL carrying `?page=2` will happily return
  page 1 from cache. This is the single way to get this hook wrong.
- **Keys are global.** Two unrelated screens using `["products", search]`
  against *different* endpoints share one cache entry, and whichever fetched
  first wins for the stale window. `useUnits` exploits this on purpose —
  it reuses the Unit Master screen's `["units-master"]` entry rather than
  fetching the same endpoint under a key of its own.

`useInvalidate` matches by **prefix** (`exact: false` is React Query's
default), so `invalidate(["products"])` clears `["products", search, page]`
for every search and page. That is what you want after a create or delete;
after an edit of one row it is merely cheap.

### Why `fetchJson` throws

React Query decides "error state and retry" purely on whether the promise
rejects. Returning the error body as data would render `{ error: "..." }` into
a table as if it were rows. The routes in this app answer
`{ error: "Missing mandatory documents" }` and that text is usually more
useful than the status, so it is appended to the message when present — inside
a `try/catch`, because a gateway timeout or an HTML error page must not turn a
504 into a JSON parse crash that masks the real status. All four branches are
pinned in `use-api-query.test.ts`.

### Why 401 gets special treatment

The dashboard is the first screen after login and can mount before the session
cookie is readable, producing one 401 that resolves itself. Retrying *only*
that — rather than everything, the library default — means a genuine database
outage surfaces its error immediately instead of after several more rounds of
connection attempts against a server that is already banning us for churn.

### Debouncing the value, not the fetch

The screens that debounced before did it around the fetch. With React Query the
key decides whether a request happens at all, so the *value* is what must be
delayed: typing "ABC" then produces one cache entry instead of three.

## Domain notes

Reads split into two families and the `staleTime` follows the split.
**Masters** (reference data: customers, buyers, units/UOM, material codes,
inspection agencies) change a few times a year and use `useReferenceQuery` —
there is no reason to re-read the size master every minute. **Transactional**
lists (quotations, GRNs — goods receipt notes, MTCs — mill test certificates,
dispatch notes) want a short window so a colleague's edit surfaces quickly.

## Gotchas and constraints

- **Never write an option key you do not have a value for.** This is the single
  most important thing about this file, because getting it wrong switches the
  cache off across the whole app while everything still *looks* fine.

  `QueryClient.defaultQueryOptions` merges with `{ ...defaults, ...options }`,
  and an own key holding `undefined` still wins a spread. The first version of
  `useApiQuery` always wrote `staleTime`, `enabled` and `retry`, so callers who
  passed none overwrote the provider's defaults with `undefined`. Verified
  against the installed `@tanstack/query-core` 5.90.20:

  ```
  defaultQueryOptions({ queryKey, queryFn, staleTime: undefined, retry: undefined })
    -> staleTime: undefined, retry: undefined      // provider's 60000 / 1 lost
  defaultQueryOptions({ queryKey, queryFn })
    -> staleTime: 60000, retry: 1
  ```

  Downstream, `Query.isStaleByTime(staleTime = 0)` is a *default parameter*, so
  `undefined` becomes `0`: every plain `useApiQuery` result was stale on
  arrival and `refetchOnMount: true` refetched it on every mount. The retryer
  reads `config.retry ?? (isServer ? 0 : 3)`, so those calls took **three**
  retries rather than the `retry: 1` that `query-provider.tsx` argues for at
  length precisely to avoid multiplying load during an outage.

  Nothing looked broken while this was live — cached data still rendered
  instantly, because `gcTime` is 30 minutes and `placeholderData` keeps the
  previous page. The only symptom was invisible: background queries against a
  75-connection cap, which is the exact cost the caching work existed to
  remove.

  **Fixed** by spreading each option only when it is defined:
  `...(options.staleTime !== undefined && { staleTime: options.staleTime })`.
  `use-api-query.defaults.test.ts` pins both halves — that an omitted key
  inherits the default, and that an explicitly-`undefined` key does not — so
  the trap cannot quietly return.

- **`failureCount` starts at 0.** The retryer calls `retry(failureCount, error)`
  with 0 the first time and increments only after the decision, so
  `failureCount < 2` means *two* retries and three attempts. Anything that
  touches the database wants `< 1`, which is one retry;
  `retryUnauthorizedOnce` was corrected to that and is covered by the same
  test file.

- **`useDebouncedValue` does not delay the first value.** `useState(value)`
  seeds it immediately, so the initial render fetches at once; only subsequent
  changes wait. That is the behaviour you want for a search box arriving with a
  value from the URL.

- `enabled: false` skips the request but the hook still returns
  `isLoading: true` in React Query v5 — branch on `isPending`/`data`, not on
  `isLoading`, when gating on an id that is still `undefined`.

- Cache lifetime is per browser tab and per `QueryProvider` instance. There is
  no cross-tab or server-side sharing; two tabs each pay their own queries.

## Related

- `src/components/providers/query-provider.tsx` — the client defaults
  (`staleTime` 60s, `gcTime` 30min, `placeholderData: keepPreviousData`,
  `retry: 1`) and the reasoning behind each.
- `src/hooks/use-masters.ts`, `src/hooks/use-units.ts` — the shared reference
  reads built on `useReferenceQuery`.
- `src/hooks/use-api-query.test.ts` — covers the four `fetchJson` branches.
- `src/lib/prisma.ts` — the other half of the connection-cap story, and where a
  pool exhaustion actually shows up.
