# Order Processing — Single-Entry Wizard Reconstruction

**Date:** 2026-05-24
**Status:** Design captured (brainstorm checkpoint — needs user review, then a writing-plans pass)
**Goal:** Reconstruct the Order Processing module from 9 scattered hub-and-spoke pages into ONE guided **strict linear wizard** with a single entry point. **No functionality is deleted** — every existing capability becomes a wizard step. Routes, APIs, the `SalesOrder` model, and `moduleKey: "sales"` are preserved.

---

## Decisions locked in brainstorming
- **D1 — Shape:** Strict linear wizard (Next/Back through ordered steps; cannot skip ahead).
- **D2 — No deletion:** Keep every feature the PRD covers; reorganize presentation only. Existing page logic/components are reused as step bodies, not rewritten from scratch.
- **D3 — Dashboard:** `sales/dashboard` is redundant as a separate page; fold its useful stats into the Orders **list header** (don't lose the numbers). Drop it from the sidebar.
- **D4 — Preserve plumbing:** routes (`/sales`, `/sales/[id]`, `/api/sales-orders/*`), `moduleKey: "sales"`, `SalesOrder`/`SalesOrderItem` models, document-number prefixes — all unchanged.
- **D5 — Labels:** module is already "Order Processing", document already "Order" (prior renames).

## Current sprawl (what gets consolidated)
| Page | Lines | Becomes |
|---|---|---|
| `sales/` (Orders list) | 293 | **Entry point** — stays; gains dashboard stats in header |
| `sales/dashboard/` | 528 | folded into list header; page removed from nav (logic preserved) |
| `sales/create/` | 541 | Wizard "create" entry (or step 0) — orders mostly arrive from CPO "Start Order Processing" |
| `sales/[id]/` (detail hub) | 541 | becomes the **wizard shell** (hosts the steps) |
| `sales/[id]/edit/` | 392 | inline edit within the Review step |
| `sales/[id]/review/` | 484 | **Step 1 — Review** (customer PO review) |
| `sales/[id]/process/` | 1248 | **Step 2 — Process** (QAP / specs / outsourced processes) |
| `sales/[id]/allotment/` | 533 | **Step 3 — Allotment** (stock-vs-procure split) |
| `sales/[id]/reserve-stock/` | 601 | merged into Step 3 (manual reservation = sub-action of allotment) |

## Proposed architecture
- **Entry (confirmed):** the **Orders listing page** at `/sales` is the single starting point. It shows the orders table (+ folded dashboard stats in the header) and a prominent **"Create Order Process"** button that launches the wizard for a new order. Opening an existing row also enters the wizard (at its current step). "Start Order Processing" on a CPO routes here too.
- **Wizard shell:** `sales/[id]/page.tsx` becomes a stepper container that renders the current step and a Next/Back footer + a step indicator (Review → Process → Allotment → Ready). It reads the order's status to decide the current step on open, but enforces linear forward progress.
- **Steps = extracted components:** pull each existing page's body into a step component under `src/app/(dashboard)/sales/[id]/_steps/` (or `src/components/order-wizard/`): `ReviewStep`, `ProcessStep`, `AllotmentStep` (with the reserve-stock UI as a panel inside it). The existing pages' data-fetching/submit logic moves into these components mostly as-is. The standalone `/process`, `/allotment`, `/reserve-stock`, `/review`, `/edit` routes either redirect into the wizard at the right step or are retired from nav (kept as thin redirects to avoid breaking links — **no logic deleted**).
- **APIs untouched:** each step keeps calling its existing endpoints (`/processing`, `/allotment/analyze`, `/allotment`, `/reserve`, `from-cpo`, etc.).
- **Step gating:** Next is enabled only when the current step's required data is saved (e.g. Review confirmed → Process saved → Allotment allocated). Back is always allowed (read-only view of completed steps); editing a completed step may require re-confirming downstream steps (flag below).

## Step → existing-logic mapping (reuse, don't rewrite)
1. **Review** ← `review/page.tsx` (+ inline `edit/page.tsx` fields). Confirms customer PO acceptance status.
2. **Process** ← `process/page.tsx` (the 1248-line QAP/specs/outsourced-process form — by far the biggest; extract carefully, it already has its own item-stepper).
3. **Allotment** ← `allotment/page.tsx` (+ `reserve-stock/page.tsx` as a "manual reserve" panel). Stock-vs-procure split → auto WarehouseIntimation + PR + alerts (unchanged).
4. **Ready** — summary + links to the downstream warehouse/inspection flow (which lives in its own modules).

## Open questions (resolve before/within the plan)
- **OQ1 — Editing a completed step:** if a user goes Back and changes Process after Allotment was done, do we invalidate the allotment? Proposal: warn + require re-doing Allotment. Confirm.
- **OQ2 — RESOLVED:** entry is the listing page with a "Create Order Process" button that launches the wizard (create becomes the wizard's step 0 for manual orders; CPO "Start Order Processing" also routes in).
- **OQ3 — Old routes:** redirect `/sales/[id]/process` etc. into the wizard (preserve deep links), or remove them? Proposal: thin redirects (no deletion).
- **OQ4 — The 1248-line Process page** is the riskiest extraction; may warrant being its own sub-task/phase.

## Non-goals
- No change to APIs, the `SalesOrder` data model, access keys, or document numbering.
- No change to downstream modules (warehouse intimation, inspection, lab, dossier, status report).

## Next steps
1. **User reviews this spec.**
2. `writing-plans` → implementation plan (likely phased: list+dashboard-fold first, then wizard shell, then extract Review/Allotment, then the big Process step last).
3. Execute via subagent-driven-development with reviews; commit per step; nothing deleted (old routes become redirects).

---

*Brainstorm checkpoint — captured under context limits; full plan + build to follow in a fresh session.*
