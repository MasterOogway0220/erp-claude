# src/lib/quotations/deal-owner.ts

> Decides whether a quotation edit should change the deal owner, leave it
> alone, or clear it.

## Why this exists

This eleven-line file exists because of a data-loss bug that had already
happened twice in this codebase, on two different fields.

A quotation has a **deal owner** (labelled "Inquiry Owner" on the form) — the
salesperson who owns the opportunity. Users reported assigning an owner at
creation and finding the field empty when they later opened the quotation to
edit it.

The mechanism was a mismatch between two halves of the same feature:

- The edit form sent `dealOwnerId: formData.dealOwnerId || undefined`.
- `JSON.stringify` **drops keys whose value is `undefined`**, so when the field
  was empty the key never left the browser.
- The API wrote `dealOwnerId: dealOwnerId || null` unconditionally.

So a payload that simply did not mention the owner was treated as an
instruction to erase it. Any save from a form that had not loaded the value
wiped it, and the detail page hid the damage by falling back to the preparer's
name under the "Deal Owner" label — meaning the loss only became visible when
somebody next opened the edit screen.

The same defect had already hit `preparedById`, blanking it on six quotations
before it was made write-once (commit `3ed7b0d`). That fix guarded
`preparedById` and `sourceTenderId` and left `dealOwnerId` exposed. This file
closes the third case and gives the rule a name and a test, so the next
optional foreign key on this model has somewhere obvious to copy from.

## What it does

```ts
dealOwnerPatch(undefined)  // {}                      — leave the owner alone
dealOwnerPatch("cm...")    // { dealOwnerId: "cm..." } — assign
dealOwnerPatch(null)       // { dealOwnerId: null }    — unassign
dealOwnerPatch("")         // { dealOwnerId: null }    — unassign
```

Spread into a Prisma `update`'s `data`. An empty object contributes no key, so
the column is not written at all.

## How it works

The whole point is the distinction between **absent** and **null**:

- `undefined` — the caller is not editing this field. Return `{}`.
- `null` or `""` — the caller is deliberately unassigning. Return
  `{ dealOwnerId: null }`.

Everything else is an assignment.

Note that the fix only works as a **pair**. Making the API ignore a missing key
would have broken unassignment, because the form was sending `undefined` for
"Unassigned" too. Both quotation create pages were changed at the same time to
send `null` instead:

```ts
dealOwnerId: formData.dealOwnerId || null,   // was: || undefined
```

If you change one side, change the other. That coupling is the thing to
remember about this file.

## Domain notes

**Deal owner vs prepared by.** `preparedById` records who *created* the
quotation and is write-once — authorship does not transfer when a colleague
edits the document. `dealOwnerId` is the salesperson who *owns the deal* and is
freely reassignable; that is what the field is for. Conflating them is what
produced the original bug, and the detail page's old fallback (showing the
preparer under the "Deal Owner" heading when no owner was set) is why nobody
noticed the data going missing.

## Gotchas and constraints

- **`0` and `false` are not real inputs here** — the field is a cuid string —
  so the `|| null` shorthand is safe. It would not be on a numeric field.
- **The API is the only guard.** A client that sends `dealOwnerId: ""` clears
  the owner, by design.
- **This does not repair historical damage.** Five quotations
  (NPS/26/15199, 15205 all revisions, 15209, 15210, 15213) had a null owner at
  the time of the fix. Nothing backfills them, because the correct value is not
  recoverable from the data.

## Related

- `src/lib/quotations/deal-owner.test.ts` — the three cases.
- `src/app/api/quotations/[id]/route.ts` — the only consumer, in the PUT.
- `src/app/(dashboard)/quotations/create/standard/page.tsx`,
  `src/app/(dashboard)/quotations/create/nonstandard/page.tsx` — must send
  `null`, not `undefined`.
- `src/app/(dashboard)/quotations/[id]/page.tsx` — where the misleading
  fallback to `preparedBy?.name` was removed.
- Commit `3ed7b0d` — the same defect on `preparedById`.
