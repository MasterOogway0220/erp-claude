# DECISIONS

Why, not what. Newest at the bottom. Dates before 2026-11-18 were reconstructed
from commit history and docs at kickoff.

- 2026-10 — Database is MariaDB (`provider = "mysql"`, `@prisma/adapter-mariadb`), not PostgreSQL. The README still says PostgreSQL and is wrong.
- 2026-10 — Migrations are hand-written and applied with `prisma migrate deploy`. `prisma migrate dev` cannot work: the host denies `CREATE DATABASE`, so there is no shadow DB. Procedure: `docs/code/prisma/migrations.md`.
- 2026-10-05 — New work was shipped behind a sandbox-only gate (`.sandbox` / `.legacy` copies), so the owner could test it live without affecting other users. 2026-10 (36be338): all 41 gates switched on for everyone, legacy copies and gate helpers deleted. The sandbox data and mail isolation (`src/lib/sandbox/`) stays.
- 2026-10 — Every migration the sandbox needs is applied together with its `sbx_` twin, followed by a parity check.
- 2026-10 — Typeface is IBM Plex Sans and IBM Plex Mono, replacing Geist (frontend rule 7).
- 2026-10-22 — Lucide stays the icon set, a deliberate waiver of frontend rule 12 (165 files; internal tool). No second icon library.
- 2026-10 — Array-form `prisma.$transaction([...])` is banned. The sandbox router rejects it, and a test enforces this (`src/lib/sandbox/no-array-transactions.test.ts`). Use the callback form.
- 2026-11-18 — Kickoff per the playbook. The graphify outputs (`graph.json`, `graph.html`) stay committed, as before (the repo already commits graph refreshes), instead of the playbook's default of gitignoring them.
