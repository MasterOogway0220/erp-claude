# PROGRESS
**Goal:** none active. Kickoff done 2026-11-18; next goal is the user's pick from "Next".
**Status:** 🟢 Idle, baseline recorded   **Last updated:** 2026-11-18

## Baseline (2026-11-18, HEAD 4d48a0c)
| Check | Result |
|---|---|
| `npx tsc --noEmit -p .` | ✅ exit 0 |
| `npx vitest run` | ✅ 60 files, 388 passed, 10 skipped (DB tests) |
| `npm run build` | ✅ 202 pages. First run stopped on Next's advisory gate (`SecurityFatalError`); the retry passed, as the gate says it will |
| `npx eslint .` | ❌ pre-existing: 1,002 errors (982 `no-explicit-any`, 9 `no-require-imports`, 8 `no-unescaped-entities`, 2 `prefer-const`, 1 `set-state-in-effect`) and 331 warnings |
| `npm audit --omit=dev` | ⚠️ next 16.2.0–16.4.4 moderate (two `'use cache'` advisories; the app only uses `unstable_cache` in `src/lib/cache/master-cache.ts`), zod <4.6.6 high (memory on oversized collections) |

Lint is not a gate until the debt is paid down. Rule for now: a touched file must not add lint errors.

## Done
- [x] Kickoff: PLAN.md, PROGRESS.md, DECISIONS.md, GLOSSARY.md; graphify rebuilt from HEAD; baseline above.

## Next (open backlog, from commit notes 1898acb, b2682c1, f7a0036)
1. Dependency bump: next ≥16.4.5 and zod ≥4.6.6 (security, clears the build gate). Low risk; verify tsc, tests, build.
2. OTP and password rate limiting: the store is not chosen yet (DB table vs Upstash/Vercel KV). Needs a decision.
3. Unique constraints for payment references and document numbers: migration plus a duplicate check on live data first.
4. Invoice numbering inside the transaction (depends on #3).
5. CSP header: needs a nonce setup.
6. next-auth major upgrade (v4 to v5 / Auth.js): advisory open, breaking change.
7. README says PostgreSQL; the app runs on MariaDB. Fix the setup section.
8. From the 03/10 meeting, still without detail: Purchase Order, Reports / Inspection report headings; item 12 (T&C shown twice) needs a screenshot.

## Blocked / needs user
- `.tastemaker/style-lock.md`: tastemaker not run yet (playbook step 5b). Recommended light mode (tokens only, record the existing IBM Plex and shadcn tokens) so it does not invite a redesign.
- `/setup-matt-pocock-skills`: not installed on this machine, skipped.
- Item 2 above needs a rate-limit store choice.

## Known issues (non-blocking)
- Lint debt, see baseline.
