## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current

## Code documentation (handover)

Every code file has a companion explainer under `docs/code/`, mirroring its
path — `src/lib/mailer.ts` is documented by `docs/code/src/lib/mailer.ts.md`.
These exist so somebody who has never seen this codebase can pick up a file and
understand why it is there, not just what it says. See
`docs/code/CONVENTIONS.md` for the required structure and depth, and
`docs/code/INDEX.md` for coverage.

**This is a standing rule, not a one-off task:**

- Changing a file → update its `.md` in the same commit. A doc that describes
  behaviour the code no longer has is worse than no doc, because it is trusted.
- Adding a file → write its `.md` in the same commit, and add it to
  `docs/code/INDEX.md`.
- Deleting a file → delete its `.md` and its index row.
- Renaming or moving a file → move the `.md` to match the new path.

If a change is genuinely cosmetic (formatting, a typo in a string) the doc may
be left alone. Anything that changes behaviour, inputs, outputs, failure modes
or the reason the file exists must be reflected in the doc.

Write for a competent developer who does not know this business. Explain the
piping/ERP domain terms the file depends on — NB, SCH, MTC, TPI, heat number,
L1/L2/L3, PSL — the first time they matter.
