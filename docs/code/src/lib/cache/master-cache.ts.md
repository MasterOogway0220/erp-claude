# src/lib/cache/master-cache.ts

> Server-side caching for the master lists, scoped so one company can never be
> served another's rows.

## Why this exists

The database is Hostinger shared MySQL: a hard cap of 75 concurrent connections
per user, `wait_timeout` of 20 seconds, and a firewall that bans this
application's egress IPs when it sees connection churn. When that ban lands,
logins fail with "invalid credentials" and saves fail — see
[`src/lib/auth/db-down.ts`](../auth/db-down.ts.md) for why the login message
used to lie about which failure it was.

Every query avoided is a real reduction in that pressure, and the master lists
are the largest avoidable share of it. They are read on nearly every screen —
the customer master alone was being fetched from fourteen different pages — and
they change a few times a week.

The browser cache in [`use-api-query.ts`](../../hooks/use-api-query.ts.md)
already removed the repeat reads *within* one person's session. It cannot do
anything about the repeats *across* people, because it lives in each browser:
ten staff opening the customer list is ten database queries no matter how well
that cache works. This one is held by the deployment, so those ten become one
for as long as the entry lives.

That difference is the whole point. This is a multiplier across users; the
browser cache is a saving per user. Deleting this file puts the master reads
back on the database once per user per page load.

## What it does

```ts
const departments = await cachedMasterRead({
  tag: "departments",
  companyId,                  // required — scopes the entry
  key: [includeInactive],     // every other value the read varies by
  read: () => prisma.departmentMaster.findMany({ where, orderBy }),
});
```

| Export | Purpose |
|---|---|
| `cachedMasterRead({ tag, companyId, key?, ttlSeconds?, skipCache?, read })` | Runs `read` through the shared cache, or returns the cached result. `skipCache` reads straight through. |
| `invalidateMasters(...tags)` | Purges those lists. Call in the same request as a write that changed them. |
| `MASTER_TAGS` / `MasterTag` | The tag vocabulary — one per master list. |
| `MASTER_TTL_SECONDS` | 300. The backstop window. |

Applied to all twelve master lists: customers, vendors, warehouses, buyers,
employees, item codes, departments, inspection agencies, units, payment terms,
delivery terms and tax rates. Every write handler that touches one calls
`invalidateMasters` — checked by counting write handlers against invalidation
calls per master, not by assuming.

The six that accept a free-text `search` pass `skipCache: Boolean(search)`, so
a search reads straight through and only the no-search case — which is what the
shared hooks actually request — is cached.

## How it works

Wraps Next's `unstable_cache`. The cache key is `[tag, companyScope, ...key]`
and the entry is tagged with `tag`, so a write can drop exactly its own list.

**`companyId` is a required parameter rather than something to remember to put
in `key`.** That is the entire design decision in this file. A key that omits
it does not produce stale data — it produces company A being served company B's
customer list, from a caching change, with nothing failing and nothing logged.
Making it impossible to forget is worth more than the flexibility of a free-form
key. `master-cache.test.ts` asserts the separation directly: two companies, an
unscoped read, differing `key` values and differing tags must all produce
different keys.

A `null` companyId means "this query is not company-scoped" and gets its own
slot (`__unscoped__`) rather than sharing a real company's. Two lists use it
deliberately — UOM and GST rates carry no `companyFilter`, so every company
genuinely shares one entry.

**Auth is unaffected.** `cachedMasterRead` is called *after* `checkAccess`, so
every request is still authorised individually. Only the database result is
cached, never the decision to allow it.

**Invalidation is by tag**, which clears that list for every company and every
key variant at once. Deliberately blunt: it is one list per tag, writes are
rare, and correctness is worth more than precision here. Next 16 requires a
cache-life profile alongside the tag; it is given the same window the entries
were written with, so the purge and the backstop cannot drift apart.

## Domain notes

"Master" here means the reference data the piping business is configured with —
customers, vendors, warehouses, TPI (third-party inspection) agencies, UOM,
item codes, payment and delivery terms, GST rates. It is the data every
transactional screen reads and almost nobody edits.

## Gotchas and constraints

- **`read` must be a pure function of `companyId` and `key`.** If it closes over
  anything else that varies — a search term, a filter, a date — that value must
  go in `key`, or the caller must not use this at all. This is the one way to
  introduce a real bug here.
- **Search parameters are deliberately not cached.** A free-text search creates
  a cache entry per distinct string, which is unbounded. The routes that accept
  `search` are either uncached or should cache only the no-search case; the
  shared hooks in [`use-masters.ts`](../../hooks/use-masters.ts.md) fetch
  without parameters, which is where the traffic actually is.
- **Do not use this for transactional data.** Quotations, sales orders, stock,
  dispatches and invoices must show a user their own write immediately. A stale
  order list is a support call, and the tag-per-list model does not fit records
  that change constantly.
- **A missing `invalidateMasters` is silent.** The write succeeds, the browser
  cache is cleared by the page, the refetch hits this cache, and the user sees
  their edit missing for up to five minutes. When adding a write handler to a
  cached master, add the invalidation with it.
- **Adding a tag to `MASTER_TAGS` does not cache anything.** The route has to
  call `cachedMasterRead`, and its writes have to call `invalidateMasters`.

## Related

- [`src/hooks/use-api-query.ts`](../../hooks/use-api-query.ts.md) — the browser
  half of the same effort.
- [`src/hooks/use-masters.ts`](../../hooks/use-masters.ts.md) — the shared
  reads these routes serve.
- [`src/lib/prisma.ts`](../prisma.ts.md) — the pool limits and the outage this
  is all defending against.
- [`src/lib/auth/db-down.ts`](../auth/db-down.ts.md) — what the user sees when
  the defence is not enough.
