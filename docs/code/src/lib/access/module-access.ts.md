# src/lib/access/module-access.ts

> Parses a user's module grants and decides which sidebar items they see.
> **Most of its gating is currently disabled by owner decision — read on.**

## Why this exists

Two consumers need the same answers and cannot share a normal module: the
NextAuth `jwt` callback (server, deriving grants into the session) and the
sidebar (client component, deciding what to render). So this file is kept free
of React and of `server-only` imports, and both sides import it.

It also isolates one genuinely fiddly parse: `EmployeeMaster.moduleAccess` is a
JSON array stored as a string in a `LongText` column.

## What it does

| Export | Purpose |
|---|---|
| `TEST_USER_EMAIL` | `testuser@erp.com` — the one login that bypasses production lockdown. |
| `parseModuleAccess(raw)` | JSON string → `string[]`. Never throws. |
| `isNavItemVisible(item, ctx)` | Should this nav item render? |

## How it works

### `parseModuleAccess`

Grants are stored as `'["quotation","sales"]'` — a JSON-encoded array in a text
column, not a relation. The trap this function exists for:
`Array.isArray("[...]")` is **false**, so code that skipped the parse silently
treated every user as having no grants, and the `.includes()` calls downstream
returned false for everything.

Returns `[]` on null, empty, malformed JSON, or valid JSON that is not an
array. Never throws — this runs inside a NextAuth callback, where an exception
does not produce an error page, it produces a failed session.

### `isNavItemVisible` — and what it no longer does

The doc comment describes three rules: production lockdown, then module grants
as authoritative, then a role fallback. **Only the first is live.**

On 2026-07-16 the owner asked for role and grant enforcement to be removed
across the whole application — every authenticated user gets every module. The
function keeps the shape and the unused variables (`void isAdminOrAbove;`
`void hasGrants;`) so the intent and the restore path stay visible in the file
rather than only in git history.

What still applies:

```ts
if (isProductionMode && item.productionHidden && !isTestUser && !isGranted) return false;
```

`productionHidden` marks modules not yet ready for the client's live users.
They stay visible to `testuser@erp.com` and to anyone explicitly granted the
module — a grant is treated as authorisation, so granting someone a module
un-hides it for them specifically.

**This is the mechanism to reach for when a module goes live.** Making
Inventory visible was exactly this: delete `productionHidden: true` from its
sidebar entry.

### The same-string uppercase detail

Callers elsewhere (`getFlangeSizeOptions`, and similar) uppercase once and test
against that single string. Not relevant here, but the pattern recurs — free
text typed by users reaches these predicates.

## Domain notes

**Module keys** are coarse areas — `quotation`, `sales`, `purchase`,
`inventory`, `quality`, `dispatch`, `finance`, `masters`, `reports`. Several
RBAC modules map onto one key (`purchaseRequisition` and `purchaseOrder` both
map to `purchase`); `MODULE_TO_ACCESS_KEY` in `rbac.ts` holds that mapping.

## Gotchas and constraints

- **The role and grant gates are off.** Do not read the doc comment as a
  description of current behaviour. Restoring them means reinstating rules 2
  and 3 — and note that `rbac.ts` has the same removal on the API side, so
  restoring one without the other gives a UI that hides things the API still
  serves.
- `isProductionMode` comes from `NEXT_PUBLIC_PRODUCTION_MODE`, one of only four
  variables actually set in production.
- The test-user bypass is a hardcoded email address. Fine for one account,
  wrong if a second is ever needed.

## Related

- `src/lib/access/module-access.test.ts` — still covers the disabled rules, so
  restoring them has a safety net.
- `src/lib/rbac.ts` — the API-side equivalent, with the same removal.
- `src/lib/auth.ts` — calls `parseModuleAccess` in the `jwt` callback.
- `src/components/layout/sidebar.tsx` — the nav definition.
