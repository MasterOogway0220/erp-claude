# Plan: pending frontend and API findings

Tier: L. Stop after this plan only if a decision is needed; defaults below are taken and stated in the report.
Not committed or pushed: the user did not ask for a commit this round.

## Held (not in this plan)
- OTP and password rate limiting: store not chosen yet.
- Payment reference uniqueness and document-number constraints: need a migration and a duplicate check on live data.
- Invoice numbering inside a transaction: depends on the numbering change above.

## Frontend (CLAUDE.md FRONTEND-RULES)
1. Rule 7: replace Geist with IBM Plex Sans and IBM Plex Mono (default pick; change in layout.tsx and globals.css only).
2. Rule 21: remove colored left border strips on KPI and list cards (dashboard, sales, po-tracking, warehouse intimation panel). Colour stays on the number text.
3. Rules 1, 15, 16, 19: solid colour on the login pages, no SVG pattern overlays, no feature-icon trio on the public login.
4. Rule 3: modal bodies use `bg-card`, not `bg-white`.
5. Rule 8: em dashes in user-facing strings (JSX text, toast and label strings) become a period, comma or colon, by hand per line. Comments and code are not changed.
6. Not done, needs your decision: Lucide icons (rule 12, 165 files). Keep and record an exception, or switch icon set. Shadows, hover motion and backdrop blur (rules 17, 18, 24) are low severity and not touched.

## API
7. Pagination: list GET endpoints for GRN, dispatch invoices, stock issues, purchase orders and dispatch notes get `take` with `pageSize` (default 500, max 500). Callers that pass no pageSize get the first 500, same as the table needs today.
8. Flaky MTC PDF test: raise its timeout (test-only).
9. Not done: xlsx (no fixed release; import is auth-gated and capped at 5 MB), next-auth and sharp majors, CSP (needs a nonce setup first).

## Verify
- `npx tsc --noEmit -p .`, `npx vitest run`, `npm run build`, all reported with real output.
- `git diff --stat` shown in the report.
