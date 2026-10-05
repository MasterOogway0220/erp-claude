# 03/10/26 meeting fixes — design

Base design: `docs/meeting-notes/2026-10-03-bug-report.md` (the "report").
Each item's fix and prompt there is the design unless this file overrides it.
This file records the owner's decisions, what live testing on 2026-10-05
changed, and the build order.

## Live verification (sandbox user Akash, erp.n-pipe.com + localhost:3010)

| Item | Result |
|---|---|
| NEW-A | `/client-purchase-orders/create` crashes on every load (React #185, "Maximum update depth exceeded"). |
| NEW-B | `/dispatch/invoices/create` crashes the same way. |
| 15 | Reproduced: TPI 1000 / Testing 500 / P&F 200 with tax on; screen grand total 48,69,801, stored 48,69,495, three flags stored false (CPO/2026-27/00012, sandbox). |
| 7 | Real cause differs from the report: `src/lib/sandbox/router.ts:58` rejects array-form `prisma.$transaction([...])` for every user (the exported `prisma` is the router). The processing POST is the only array-form caller. Broken for all users since the sandbox deploy (2026-09-24). |
| 16 | Confirmed: CPO CDD 2026-12-15, acceptance form CDD blank. |
| 17, 19 | Confirmed: route returns `text/html`, no `Content-Disposition`, no `<img>`. |
| 11 | Confirmed, but the variant is a trailing space (`"C.S. SEAMLESS PIPE "`), not case. Trim + upper-case key covers both. |
| 12 | No duplicate `OfferTermTemplate` rows (30 rows). Skipped. |

## Decisions

- NEW-A, NEW-B: fix both first.
- 19: option (b), real react-pdf document. Items 17 (logo), 18 and the PDF half of 9 go into it.
- 18: reading A — print our person (the letter's `createdBy`) in the signature block.
- 10: reading (i) — duplicate the row, with a server sum guard per `quotationItemId`.
- Skipped: 8, 12, Purchase Order / Reports headings (awaiting owner detail).
- No pushes. Commit locally, one commit per item, the user pushes.

## Overrides to the report

**NEW-A / NEW-B.** Root cause: commit `d18910d` replaced list state with
`data?.x ?? []`, which is a new array on every render while the query loads.
A `useEffect` that depends on it and sets state then re-renders forever; Radix
ref callbacks make it fatal. Fix: `useMemo(() => data?.x ?? [], [data])` in
both pages. A repo-wide grep found no other effect that sets state on such a
value (`purchase/orders/create` and `sales/create` are guarded by
`length > 0`).

**Item 7.** Replace the array transaction in
`api/sales-orders/[id]/processing/route.ts` with the callback form
(`$transaction(async (tx) => ...)`, `timeout: 20000`). Keep report step 1
(surface `detail` in the toast). Report steps 2–3 (Int rounding, `@db.Text`)
are done only if a re-test after the transaction fix shows them failing
(POST `vdiWitnessPercent: 12.5`, POST a 300-character `additionalSpec`).

## Schema changes and the live DB

`.env` points at the live database, so local dev reads live data. No
migration is applied from this work. Items that change the schema (15
defaults, 14, 13, 2, and 7 step 3 if needed) get a hand-written migration
file and a test that does not need the new column in the DB; their UI is
verified locally only if a local database is available (Docker
`erp-sandbox-db`, currently not running). Otherwise this is reported as not
verified end-to-end.

## Build order

1. NEW-A, NEW-B
2. 15, 7, 16, 6
3. 19 + 17 + 18A + 9
4. 5, 3
5. 4
6. 14, 13
7. 2, 1
8. 11 (code only; no live data merge without approval), 10

## Done means, per item

- A failing test first where logic is testable (vitest, `src/**/*.test.ts`).
- `npx vitest run` and `npx tsc --noEmit` pass.
- Behaviour re-checked on localhost:3010 as the sandbox user where the DB allows.
- `docs/code/` companion updated in the same commit.
- graphify rebuild after code changes.
