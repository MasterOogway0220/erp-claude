# src/app/api/geo/cities/route.ts

> Returns the cities of one state, for the international address picker on the customer forms.

## Why this exists

The customer create and edit forms let an international customer's address be picked as country, then state, then city, using the `country-state-city` package. Importing that package from a client page put its whole world city list (8 MB of JSON) into the browser bundle of both forms, which made them slow to open. Countries (95 KB) and states (550 KB) are still imported on the page through the package's per-file entry points; cities come from this route, one state at a time.

## What it does

- `GET /api/geo/cities?country=AE&state=DU` returns `[{ "name": "Dubai" }, …]`.
- 401 without a session (`checkAuth`), 400 when `country` is not a two-letter ISO code or `state` is not a short code.
- Sends `Cache-Control: private, max-age=86400`: the list never changes between package upgrades, so the browser keeps it for a day.

## How it works

- `City.getCitiesOfState(country, state)` from `country-state-city/lib/city`, mapped to names only (the page shows names and stores the name).
- Pages read it through `useReferenceQuery` with the country and state codes in the key, so a state picked twice is served from the React Query cache.

## Gotchas and constraints

- No database access and no company data, so authentication only, no company scoping.
- The city list is loaded into server memory on first call in each function instance.

## Related

- `src/app/(dashboard)/masters/customers/create/page.tsx`, `src/app/(dashboard)/masters/customers/[id]/edit/page.tsx` — the callers.
