# Order Processing Wizard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. **Read the design spec first:** `docs/superpowers/specs/2026-05-24-order-processing-wizard-design.md`.

**Goal:** Reconstruct the 9-page hub-and-spoke Order Processing module into ONE strict linear wizard entered from the Orders listing page. **Delete no functionality** — move existing page logic into wizard steps; turn old routes into redirects; preserve routes/APIs/`SalesOrder` model/`moduleKey: "sales"`.

**Architecture:** Orders list (`/sales`) is the entry, with a "Create Order Process" button + folded dashboard stats. The order workspace (`sales/[id]`) becomes a stepper shell hosting step components extracted from the existing pages: Review → Process → Allotment(+Reserve) → Ready. Strict linear forward progress; Back allowed (read-only view of completed steps). Each step keeps calling its existing APIs.

**Tech stack:** Next.js 16 (App Router, client components) · Prisma 7 · TypeScript · existing shadcn UI.

**Phasing rationale:** lowest-risk first (list/stats), then the shell, then extract the smaller steps, then the 1248-line Process page LAST (riskiest). Commit per phase; everything stays green.

---

## Pre-flight (do before Phase 1)
- [ ] Read the spec + each current page to understand its data-fetch + submit logic:
  `sales/page.tsx`, `sales/dashboard/page.tsx`, `sales/[id]/page.tsx`, `sales/[id]/{review,edit,process,allotment,reserve-stock}/page.tsx`.
- [ ] Confirm the 3 spec open questions with the user if not already answered. Defaults if silent: OQ1 = editing Process after Allotment warns + requires redoing Allotment; OQ3 = old routes become redirects (no deletion); OQ4 = Process extraction is its own phase (Phase 5).

## Decision defaults (from spec; change only if user overrides)
- Strict linear wizard; status-aware landing; Back = read-only review of completed steps.
- Nothing deleted: retired pages become thin redirect stubs into the wizard.
- Folder for step components: `src/components/order-wizard/` (`ReviewStep.tsx`, `ProcessStep.tsx`, `AllotmentStep.tsx`, plus `OrderWizard.tsx` shell). Steps are plain client components taking `{ orderId, order, onComplete }`-style props.

---

## Phase 1 — Orders list as the single entry + fold dashboard
**Files:** `src/app/(dashboard)/sales/page.tsx` (modify), `src/app/(dashboard)/sales/dashboard/page.tsx` (→ redirect), `src/components/layout/sidebar.tsx` (drop the "Dashboard" child under Order Processing).

- [ ] Add a prominent **"Create Order Process"** button on the list that routes to the wizard create entry (`/sales/create` for now; Phase 2 wires it into the wizard).
- [ ] Move the dashboard's stat cards (from `sales/dashboard/page.tsx`) into the list page header — reuse the same data source/query; don't recompute differently.
- [ ] Replace `sales/dashboard/page.tsx` body with a redirect to `/sales` (keep the route, no 404 for old links). Remove the "Dashboard" child from the Order Processing sidebar group.
- [ ] Verify: `npx tsc --noEmit` (0), `npm run build` clean. Commit: `feat(ui): Order Processing list as single entry + fold dashboard stats`.

## Phase 2 — Wizard shell
**Files:** Create `src/components/order-wizard/OrderWizard.tsx`; modify `sales/[id]/page.tsx` to render it.

- [ ] Build `OrderWizard` — a stepper container: a step indicator (Review → Process → Allotment → Ready), Next/Back footer, and a `currentStep` state initialized from the order's status (processingStatus/allotmentStatus/poAcceptanceStatus). Enforce linear forward (Next disabled until the active step reports "complete"); Back shows completed steps read-only.
- [ ] For this phase, render placeholder step bodies ("step coming in Phase 3/4/5") so the shell + navigation are testable in isolation.
- [ ] `sales/[id]/page.tsx` fetches the order (reuse its current fetch) and renders `<OrderWizard order={...} />`.
- [ ] Verify tsc + build. Commit: `feat(ui): Order workspace wizard shell (linear stepper)`.

## Phase 3 — Review step
**Files:** Create `src/components/order-wizard/ReviewStep.tsx`; wire into the shell.

- [ ] Extract the body + logic of `sales/[id]/review/page.tsx` (customer-PO review) into `ReviewStep`, plus the inline edit fields from `sales/[id]/edit/page.tsx`. Keep the same endpoints. "Complete" = review confirmed.
- [ ] `sales/[id]/review/page.tsx` and `.../edit/page.tsx` → thin redirects to `sales/[id]` (wizard opens on the Review step). No logic deleted (it now lives in the step).
- [ ] Verify tsc + build. Commit: `feat(ui): wizard Review step (from review/edit pages)`.

## Phase 4 — Allotment step (incl. stock reserve)
**Files:** Create `src/components/order-wizard/AllotmentStep.tsx`; wire into the shell.

- [ ] Extract `sales/[id]/allotment/page.tsx` (analyze + stock/procure split → auto WarehouseIntimation + PR + alerts) into `AllotmentStep`. Embed the `sales/[id]/reserve-stock/page.tsx` manual-reservation UI as a panel/dialog within it (per spec: reserve = sub-action of allotment). Keep all endpoints (`/allotment/analyze`, `/allotment`, `/reserve`).
- [ ] Old `/allotment` + `/reserve-stock` routes → redirects to the wizard's Allotment step.
- [ ] Verify tsc + build. Commit: `feat(ui): wizard Allotment step (allotment + reserve panel)`.

## Phase 5 — Process step (LARGEST, isolate)
**Files:** Create `src/components/order-wizard/ProcessStep.tsx` from `sales/[id]/process/page.tsx` (1248 lines, has its own per-item sub-stepper + the QAP/specs/outsourced-process form + the Generate Lab Letter button).

- [ ] Extract carefully — this page already contains a per-item stepper; preserve it intact as the step body. Keep the `/processing` endpoint calls and the lab-letter button. "Complete" = all items processed (status PROCESSED).
- [ ] Old `/process` route → redirect to the wizard's Process step.
- [ ] Verify tsc + build. Commit: `feat(ui): wizard Process step (from process page)`.

## Phase 6 — Create entry + cleanup
**Files:** `sales/create/page.tsx`, redirect stubs, sidebar.

- [ ] Wire the "Create Order Process" button → wizard create entry (step 0). Decide: standalone create page reused as step 0, or a thin create that then enters the wizard. Reuse `sales/create/page.tsx` logic.
- [ ] Confirm all retired pages are redirects (no dead links, no deleted logic). Confirm the Order Processing sidebar children point at the right places (Orders → `/sales`; remove Dashboard child).
- [ ] Verify tsc + build. Commit: `feat(ui): wire Create Order Process entry + redirect retired routes`.

## Phase 7 — Verify + push
- [ ] `npx tsc --noEmit` (0) · `npm test` (all pass) · `npm run build` (clean).
- [ ] Manual smoke (seed an order or use a CPO "Start Order Processing"): list → Create Order Process → wizard Review → Process → Allotment → Ready; Back shows completed steps read-only; old `/sales/[id]/process` deep-link redirects in; dashboard stats show on the list.
- [ ] `git push origin master`; confirm 0 unpushed.

---

## Guardrails
- **No deletion of logic** — every retired page becomes a redirect; its logic lives in a step component.
- **Do not touch:** routes that APIs/links depend on beyond adding redirects, `/api/sales-orders/*`, `SalesOrder`/`SalesOrderItem` models, `moduleKey: "sales"`, document-number prefixes.
- **Reuse, don't rewrite** the existing page logic when extracting into steps.
- Each phase ends green (tsc + build) and is independently committable.

## Open questions (carry from spec)
- OQ1 editing Process after Allotment (default: warn + redo Allotment) · OQ3 redirects vs remove (default: redirects) · OQ4 Process extraction risk (handled: Phase 5 isolated).

---

*Plan ready for a fresh session to execute via subagent-driven-development.*
