# PLAN — nps-erp (erp-claude)

## Task Card (kickoff, 2026-11-18)
**Goal:** Put the repo on the playbook's state files so every later session starts from disk, not memory.
**Done-condition:** PLAN / PROGRESS / DECISIONS / GLOSSARY exist and are committed; graphify graph built from HEAD; baseline (tsc, lint, test, build) recorded with real output.
**Out of scope:** fixing any backlog item; style-lock (needs the user, see PROGRESS "Blocked").
**Risk:** LOW (docs and graph only).

## Ground truth
- **What it is:** ERP for a piping and tubular trading company. Modules: masters, quotation and tender, sales (CPO, PO acceptance, orders, order processing), purchase (PR, RFQ, comparative statement, PO), inventory (GRN, stock, stock issue), quality (QAP, inspection, MTC), dispatch and finance (packing list, dispatch note, invoice, e-invoice, payments), reports, admin. Multi-company, every read scoped by `companyFilter`.
- **Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind 4 + shadcn/ui (radix) · TanStack Query · zustand · react-hook-form + zod · NextAuth 4 (JWT, OTP) · Prisma 7 on **MariaDB** (`@prisma/adapter-mariadb`) · @react-pdf/renderer · nodemailer · exceljs · Vitest · deployed on Vercel (crons in `vercel.json`).
- **Conventions:** API routes under `src/app/api/**/route.ts` with `checkAccess` + `createAuditLog`; documents numbered via `generateDocumentNumber`; lists through `DataTable` + `PageHeader`; Lucide icons (waived); IBM Plex type. Every code file has a doc at `docs/code/<path>.md` updated in the same commit (CLAUDE.md). Migrations hand-written, applied with `migrate deploy`, plus `sbx_` twin.
- **Sandbox:** `User.isSandbox` login reads and writes `sbx_` tables (`src/lib/sandbox/`), used for live testing.
- **Map:** `graphify-out/GRAPH_REPORT.md` (rebuilt 2026-11-18 from 4d48a0c: 7,821 nodes, 578 communities). Query it before grepping.
- **Baseline (2026-11-18, HEAD 4d48a0c):** see PROGRESS.md.

## Design direction (UI)
Internal tool, so the /frontend rules apply in their reduced form (rules 1–6, 8–11, 18–25). IBM Plex Sans/Mono, shadcn primitives, Lucide by waiver. No `.tastemaker/style-lock.md` yet.

## Work items
No active feature goal. The open backlog is in PROGRESS.md under "Next". Each item becomes a work item here, with its own sprint contract, when the user picks it.

## Backlog (not now)
- Lint debt: 982 `no-explicit-any` errors plus 264 unused-vars warnings. Ratchet per touched file rather than one mass rewrite.
