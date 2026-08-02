# src/app/api/ — route handlers

208 files. They follow one pattern closely enough that it is documented once
here; each module's own README covers what is specific to it, and per-file docs
cover only what is specific to that route.

## The universal pattern

```ts
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { authorized, session, response, companyId } = await checkAccess("quotation", "read");
    if (!authorized) return response!;

    const rows = await prisma.quotation.findMany({
      where: { ...companyFilter(companyId) },
    });
    return NextResponse.json({ quotations: rows });
  } catch (error) {
    console.error("...", error);
    return NextResponse.json({ error: "..." }, { status: 500 });
  }
}
```

Five things, in order: **await `params`**, **`checkAccess`**, **company
filter**, **try/catch**, **`NextResponse.json`**.

## Rules that apply to every route

### `params` is a Promise

Next.js 16. `{ params }: { params: Promise<{ id: string }> }` and
`const { id } = await params`. Forgetting the `await` gives an object that
looks right and stringifies to `[object Promise]`.

### `useSearchParams` needs a Suspense boundary

Not a route concern, but the client-side counterpart: any page reading
`useSearchParams` must be wrapped in `<Suspense>` or the build fails.

### JSX means `.tsx`

A route file containing JSX must be named `.tsx`, not `.ts`. That is why the
PDF and email routes are `route.tsx`.

### Company scoping is per query

`companyFilter(companyId)` spread into `where`. **Nothing enforces this** —
three companies share the database and a missing filter silently returns
another tenant's rows.

The exception is **catalogue data** — products, sizes, additional specs — which
is deliberately global, because the physical steel is the same whoever sells it
and the test user belongs to a different company from the live data. Those
routes carry a comment saying so; do not "fix" them by adding a filter.

### `checkAccess` is authentication, not authorisation

Role enforcement was disabled across the app on 2026-07-16. A route reading
`checkAccess("quotation", "approve")` currently checks only that someone is
logged in. See `src/lib/rbac.ts`.

### Soft delete is opt-in

Spread `notDeleted` into `where` for models with `deletedAt`. Nothing applies
it globally.

## Recurring shapes

| Concern | Convention |
|---|---|
| List | `GET /api/<module>` → `{ <plural>: [...] }`, optional `pagination` |
| Detail | `GET /api/<module>/[id]` → the object, or 404 |
| Create | `POST` → 201 with the created row; number from `generateDocumentNumber` |
| Full update | `PUT` → replaces items in a transaction (delete-then-recreate) |
| Partial / status | `PATCH` with an `action` field, validated against a transition map |
| PDF | `GET .../pdf` → `Buffer`, `Content-Disposition` |
| Email | `POST .../email` → uses `mailer()` |

### The delete-and-recreate PUT

Document updates delete child items and recreate them inside a transaction.
Simple, and it has one sharp edge: **any field the form does not send is lost.**
The quotation PUT spreads the original row first for exactly this reason, and
that is the same class of bug as `dealOwnerPatch` — an omitted key must not
mean "erase this".

### Status transitions

Guarded by a `Record<string, string[]>` map, e.g.
`VALID_PO_STATUS_TRANSITIONS`. Where a transition has side effects, the rule
belongs in `src/lib/` so every route performing it stays consistent — see
`po-acceptance/advance-cpo.ts`, which exists because that rule had been
implemented on one of three paths.

## Gotchas

- **Errors return `error.message`** in most routes, so a thrown message reaches
  the UI toast. Write throw messages for users, not developers.
- **`maxDuration` and `memory`** are raised in `vercel.json` for PDF and email
  routes; Chromium needs both.
- **`export const dynamic = "force-dynamic"`** appears on routes that must not
  be statically optimised.
- Audit rows are written by two different helpers, so the log is not complete
  coverage — see `src/lib/audit/audit-logger.ts`.

## Related

- `src/lib/rbac.ts` — `checkAccess`, `companyFilter`.
- `src/lib/prisma.ts`
- `src/lib/document-numbering.ts`
- `src/lib/audit.ts`
