# src/hooks/use-masters.ts

> One cached React Query hook per master list, so the ~22 screens that need a
> customer/vendor/warehouse dropdown share a single fetch instead of each
> issuing its own.

## Why this exists

A "master" here is a reference table — the list of customers, the list of
vendors, the list of warehouses. Nothing in the app creates a quotation, a
purchase order or a goods receipt without picking from two or three of them, so
these lists are the most-read data in the system and the least-changing.

Before this file, each screen carried its own `useState` + `useEffect` + `fetch`
of the same endpoint. The customer master alone was fetched from fourteen
different pages, none of them cached. That shape has no memory: opening four
screens in a row — or pressing Back — issued four identical `SELECT`s.

That is not merely wasteful here. The database is **Hostinger shared MySQL with
a hard 75-connection cap and a firewall that bans connection churn** (see
`docs/code/src/lib/prisma.ts.md` for what that ban looks like in production).
A query that never runs is the cheapest possible relief for connection
pressure, and it is also the fastest possible render. Speed and database load
pull the same way, which is why this was done as one change rather than
converting each page's fetch on its own schedule.

Delete this file and 22 screens stop compiling; convert them back to raw
`fetch` and you restore the pre-`c96e8d0` behaviour — every dropdown re-queried
on every visit.

Created in commit `c96e8d0`, *"perf(pdf,cache): drop Chromium from the bundle,
and cache what the screens read"*.

## What it does

Eight master lists, each with two exports:

| List | `...Query` hook | Plain hook | Key | Endpoint |
|---|---|---|---|---|
| Customers | `useCustomersQuery` | `useCustomers` | `["customers"]` | `/api/masters/customers` |
| Vendors | `useVendorsQuery` | `useVendors` | `["vendors"]` | `/api/masters/vendors` |
| Warehouses | `useWarehousesQuery` | `useWarehouses` | `["warehouses"]` | `/api/masters/warehouses` |
| TPI agencies | `useInspectionAgenciesQuery` | `useInspectionAgencies` | `["inspection-agencies"]` | `/api/masters/inspection-agencies` |
| Departments | `useDepartmentsQuery` | `useDepartments` | `["departments"]` | `/api/masters/departments` |
| Item codes | `useMaterialCodesQuery` | `useMaterialCodes` | `["material-codes"]` | `/api/masters/material-codes` |
| Buyers | `useBuyersQuery` | `useBuyers` | `["buyers"]` | `/api/masters/buyers` |
| Employees | `useEmployeesQuery` | `useEmployees` | `["employees"]` | `/api/masters/employees` |

The plain hook returns the array directly — **`[]` while loading** — so a call
site reads exactly like the `useState<T[]>([])` it replaced and conversion is a
one-line diff. The `...Query` variant returns the React Query result, and is
what you want when a screen must tell "still loading" from "genuinely empty".

Both accept a type parameter (`useCustomers<MyCustomer>()`) which is a **cast,
not a validation** — nothing checks the response against it.

`MasterCustomer` / `MasterOption` are deliberately loose (`id`, `name`, an
optional `code`, plus `[key: string]: unknown`) because every caller wants a
different subset of the row and none of them wants to redeclare the whole
model.

## How it works

Every hook is a one-line wrapper over `useReferenceQuery` from
`use-api-query.ts`, which is `useApiQuery` with `staleTime` forced to
`REFERENCE_STALE_TIME` — **10 minutes**, against the 60-second app default.
Ten minutes is the judgement that a master list changing under a user mid-form
matters less than not re-reading the customer master every minute; the master
*list screens* invalidate on write, so an edit is visible immediately anyway
(below).

### The cache keys are the whole point

The keys are constants, not derived from arguments, and that is deliberate:
a constant key is what makes every one of the 22 screens land on the same cache
entry. The first screen to need customers fetches them; every other screen for
the next ten minutes renders from memory and issues no query.

Several keys are shared on purpose with code outside this file, and the sharing
only works because both sides fetch the **same URL and read the same response
field**:

- `["customers"]` is also used by a hand-rolled `useQuery` in both quotation
  forms (`quotations/create/standard` and `.../nonstandard`, which fetch
  `/api/masters/customers` directly). One fetch serves both.
- `["material-codes"]`, `["warehouses"]` and `["departments"]` are the same
  entries their own master-list screens use.
- Invalidation is prefix-based, so the customers master screen's
  `invalidate(["customers"])` after a create/edit clears this cache too — even
  though that screen's *own* list is a different, longer key
  (`["customers", search, activeTab]`).

### Why the API filters, not the hook

None of these hooks pass query parameters. The endpoints accept them
(`?search=`, `?customerId=`, `?includeInactive=`) but a hook that took a filter
would need that filter in its key, and a per-caller key defeats the shared
cache. So the hooks fetch the unfiltered list and callers filter in memory —
which is the right trade at these row counts and the wrong one if a master ever
grows large.

### Growth rule

The header states it and it is worth keeping: add a list here **once a second
screen needs it**. A one-off read should call `useApiQuery` directly. Three of
the eight (`useBuyers`, `useEmployees`, `useMaterialCodes`) currently have zero
callers — they were added speculatively and are the ones most likely to be
wrong (see below), which is the argument for the rule.

## Domain notes

- **TPI (third-party inspection) agency** — an independent inspection body the
  *customer* appoints to witness testing before material is dispatched. Lloyd's,
  TÜV and similar. The customer, not NPS, chooses it, which is why it is a
  master list rather than a setting.
- **Item code / material code** — the internal catalogue number for one
  product + size + specification combination (a specific pipe in a specific
  bore and schedule and grade). It is how a quotation line is matched to
  inventory.
- **Buyer** — the contact person on the customer's side that a quotation is
  addressed to. One customer has many buyers.
- **Warehouse** — carries its rack/bay/shelf `locations` in the same response,
  because the cascading warehouse → location dropdowns on GRN and dispatch
  screens read them from this one payload rather than a second request.

## Gotchas and constraints

- **`useBuyers` and `useMaterialCodes` are typed as having `.name`, and their
  rows do not have it.** `BuyerMaster` has `buyerName`; `MaterialCodeMaster`
  has `code` and `description`. The `MasterOption` default declares
  `name: string`, TypeScript accepts it because the response is cast rather
  than parsed, and at runtime every dropdown label renders blank. Pass an
  explicit type parameter for those two, or fix the defaults. Nothing catches
  this at build time.
- **A filter added to a URL without being added to the key serves the wrong
  rows.** These keys are global and shared across the whole app, so getting it
  wrong here mis-feeds every dropdown at once, not one screen. If you need a
  filtered variant, give it a distinct key (`["buyers", customerId]`, as the
  quotation forms do) rather than parameterising an existing one.
- **`/api/masters/material-codes` returns at most 200 rows**, `orderBy:
  updatedAt desc`. `useMaterialCodes()` is therefore "the 200 most recently
  touched item codes", not the catalogue. The master-list screen shares that
  cap. Anything needing the full set must search server-side.
- **Active/inactive filtering is inconsistent across the endpoints, and the
  hooks cannot override it.** Customers, vendors, inspection agencies and
  departments are filtered to `isActive` server-side; warehouses and employees
  are not, so those two lists include deactivated rows.
- **The plain hooks return a new `[]` on every render while loading.** `data?.x
  ?? []` yields a stable reference once the data lands, but a fresh array
  before that. Putting the result straight into a `useEffect` dependency array
  re-runs the effect on every render until the fetch resolves.
- **`[]` is indistinguishable from "loading" in the plain hooks.** A screen that
  does `customers.find(c => c.id === form.customerId)` on first paint gets
  `undefined` and may blank a field it is about to be handed. Use the `...Query`
  variant and gate on `isLoading`.
- **Client-only.** The file is `"use client"`; these cannot be called from a
  server component.
- Rows are already scoped to the signed-in user's company by `companyFilter` in
  each route — the hooks do no access control of their own, and switching
  company must invalidate these keys or the previous company's rows stay
  cached for ten minutes.

## Related

- `src/hooks/use-api-query.ts` — `useReferenceQuery`, `REFERENCE_STALE_TIME`,
  `useInvalidate`, and the reasoning behind routing all reads through React
  Query.
- `src/components/providers/query-provider.tsx` — the `gcTime`, `retry: 1` and
  `refetchOnMount` defaults these inherit, all chosen against the same
  connection cap.
- `src/hooks/use-units.ts` — the same pattern for one list, kept separate
  because it derives `string[]` and carries a hardcoded fallback.
- `src/app/api/masters/*/route.ts` — the eight endpoints; their filters and
  row caps are the real contract.
- `src/lib/prisma.ts` — the 75-connection cap this file exists to relieve.
