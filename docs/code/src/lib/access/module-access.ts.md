# src/lib/access/module-access.ts

> Parses a user's module grants out of the string column they are stored in.
> **It no longer decides anything about visibility — read on.**

## Why this exists

`EmployeeMaster.moduleAccess` is a JSON array stored as a string in a
`LongText` column, and it has to be parsed identically on both sides of the
app: the NextAuth `jwt` callback (server, deriving grants into the session) and
anything client-side that reads them. So this file is kept free of React and of
`server-only` imports, and both sides import it.

It used to hold the nav-visibility decision as well. That is gone (below), and
the parse is now the only reason the file exists.

## What it does

| Export | Purpose |
|---|---|
| `parseModuleAccess(raw)` | JSON string → `string[]`. Never throws. |

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

### What was removed, and why nothing replaced it

This file used to export `isNavItemVisible(item, ctx)`, `TEST_USER_EMAIL` and
the `NavItemMeta` / `VisibilityContext` types. It applied three rules:

1. **Production lockdown** — items flagged `productionHidden` in the sidebar
   were hidden from live users, because they were modules not yet handed to the
   client. `testuser@erp.com` and anyone explicitly granted the module saw them
   anyway. Driven by `NEXT_PUBLIC_PRODUCTION_MODE`.
2. **Module grants** — a non-admin with any grants saw exactly their grants.
3. **Role gate** — otherwise, fall back to the item's role list.

Rules 2 and 3 were removed on 2026-07-16 (owner: every authenticated user gets
every module). Rule 1 was removed when all modules were opened up on
production. With no rules left the function could only `return true`, so it was
deleted along with the sidebar's call to it, rather than kept as ceremony that
reads like a live access check.

**Consequence worth knowing:** `moduleAccess` grants are still collected in the
employees master UI, still stored, and still derived into the session — but
nothing reads them to make a decision any more. They are data without an
effect. Deciding to gate a module again means writing a real check, and the
place for it is the API route (`src/lib/rbac.ts`), not the sidebar.

## Domain notes

**Module keys** are coarse areas — `quotation`, `sales`, `purchase`,
`inventory`, `quality`, `dispatch`, `finance`, `masters`, `reports`. Several
RBAC modules map onto one key (`purchaseRequisition` and `purchaseOrder` both
map to `purchase`); `MODULE_TO_ACCESS_KEY` in `rbac.ts` holds that mapping.

## Gotchas and constraints

- **There is no module gating anywhere in the app right now** — not in the
  sidebar, and not in `rbac.ts`, which carries the same removal on the API
  side. Anything that looks like a gate is a leftover annotation.
- The sidebar's `roles` / `moduleKey` / `moduleKeys` fields still exist on nav
  items. They are inert; they document intent and give a restore path.
- Hiding a sidebar entry was never access control: the routes and their APIs
  were reachable by URL the whole time.

## Related

- `src/lib/access/module-access.test.ts` — now covers `parseModuleAccess` only.
- `src/lib/rbac.ts` — the API-side equivalent, with the same removal.
- `src/lib/auth.ts` — calls `parseModuleAccess` in the `jwt` callback.
- `src/components/layout/sidebar.tsx` — the nav definition, now unfiltered.
