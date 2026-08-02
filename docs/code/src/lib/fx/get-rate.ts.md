# src/lib/fx/get-rate.ts

> USD/INR exchange rate from a free public API, cached for the day, degrading
> to the last known rate rather than failing.

## Why this exists

Export quotations are priced in USD while the books are in INR, so a rate is
needed at quotation time. Rates move slowly enough that a daily figure is fine
commercially, and a paid FX feed would be disproportionate.

The important requirement is not accuracy, it is **availability**: a
salesperson must never be blocked from producing a quotation because a
third-party API is down. Every design choice here follows from that.

## What it does

`getRate(from, to)` → `{ rate, source }` where source is `"live"`, `"cache"` or
`"fallback"`, or `null` if there is no rate at all.

Plus two test-only helpers, `_clearCacheForTests` and `_setTodayForTests`.

## How it works

### Cache keyed by day

The key is `` `${from}-${to}-${YYYY-MM-DD}` ``, so the first request each day
goes live and the rest are served from memory. Putting the date *in the key*
rather than storing a TTL means expiry is implicit — a new day is simply a
different key, with no clock arithmetic to get wrong.

`from === to` short-circuits to `1`.

### Three-tier degradation

1. **Today's cached rate** → `"cache"`.
2. **Live fetch** from `api.frankfurter.app` (free, no key, ECB data) →
   `"live"`.
3. **On any failure**, `findLatestCacheForPair` scans for the most recent entry
   for that pair regardless of date → `"fallback"`.

Tier 3 is the point of the file. A yesterday rate is close enough to quote
against; no rate at all stops work. The `source` field is returned so the UI
can say which it is — a user should know they are seeing a stale figure.

`null` only when the API fails *and* nothing was ever cached, i.e. a cold
instance during an outage.

### Test seams

`_setTodayForTests` overrides the date used in the key, so cache expiry can be
tested without waiting a day or mocking `Date`. Both helpers are underscored
and documented as test-only — they are exported because there is no other way
to reach module-level state.

## Domain notes

Export quotations are quoted in USD and converted for internal reporting. The
rate is stored on the quotation (`exchangeRate`) at creation, so the document
does not change value when the market does — this helper supplies the number
once; it is not consulted again.

## Gotchas and constraints

- **The cache is per serverless instance and dies with it.** On Vercel each
  cold lambda starts empty, so "cached for the day" is best-effort. The
  fallback tier is correspondingly less useful on a cold instance during an
  outage — that is the case that returns `null`.
- **No timeout on the `fetch`.** A hanging API blocks until the platform
  timeout rather than falling through to the cache. Worth adding if it ever
  bites.
- **Unbounded cache map.** One entry per pair per day; with two currencies it
  is negligible, and the instance is short-lived anyway.
- Depends on a third party with no SLA. Acceptable given the fallback.

## Related

- `src/lib/fx/get-rate.test.ts` — uses both test seams.
- `src/app/(dashboard)/quotations/create/standard/page.tsx` — currency
  conversion on the form.
