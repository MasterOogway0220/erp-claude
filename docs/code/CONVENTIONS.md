# Code documentation conventions

Every code file under `src/`, `prisma/` and `scripts/` has a companion
explainer here, mirroring its path:

```
src/lib/mailer.ts                    ->  docs/code/src/lib/mailer.ts.md
src/app/api/quotations/route.ts      ->  docs/code/src/app/api/quotations/route.ts.md
prisma/schema.prisma                 ->  docs/code/prisma/schema.prisma.md
```

The mirror keeps `src/` clean and lets a newcomer read the documentation as a
tree of its own, which is the actual handover use case. `docs/code/INDEX.md`
tracks coverage.

## Who this is written for

A competent developer who has never seen this codebase **and does not know the
piping trade**. Assume they can read TypeScript. Do not assume they know what
an MTC is, why a flange has a "Sr. A" and a "Sr. B", or why a quotation has a
revision chain. Explain a domain term the first time it matters in that file.

## Required structure

Every file doc has these sections, in this order. Omit a section only when it
genuinely does not apply, and say so in one line rather than deleting it.

```markdown
# <path/to/file.ts>

> One sentence: what this file is for.

## Why this exists
The business or technical reason. What breaks, or what someone has to do by
hand, if this file is deleted. If it was created to fix a specific defect, say
which — that history is usually the most valuable thing in the doc.

## What it does
The externally visible behaviour. Exports, routes, props — the contract other
code depends on. A caller should be able to read only this section and use the
file correctly.

## How it works
The mechanism, in enough detail to change it safely. Walk the important paths.
Name the non-obvious decisions and why they went that way. This is the section
that takes real effort; it is also the one that pays for the whole exercise.

## Domain notes
Piping/ERP concepts the file depends on. Skip if there are none.

## Gotchas and constraints
The things that bite: platform limits, host quirks, ordering requirements,
fields that look optional but are not, and any deliberate simplification with
a known ceiling. Prefer concrete numbers over adjectives.

## Related
Files that must change together, upstream callers, downstream consumers, the
migration that created its table, its test.
```

## Depth

Match the file. A 30-line pure helper does not need 200 lines of prose; a
600-line quotation form does. The test is whether a newcomer could make a
correct change without reading every caller first.

## Rules

- **Explain why, not what.** `const x = 5` needs no doc. `MAX_UPLOAD_BYTES =
  25MB because the host closes idle connections at 20s` does.
- **Record the defect.** Where code exists because something broke, name the
  failure. "PUT wrote `dealOwnerId || null` unconditionally, so any save that
  omitted the field erased the owner" teaches more than any description of the
  current code.
- **Use real numbers.** "The catalogue is large" is useless. "3,557 rows,
  fetched in one page against a 20,000 cap" is actionable.
- **Do not paraphrase the code.** If a paragraph would go stale the moment
  someone renames a variable, it is the wrong paragraph.
- **Link, do not duplicate.** Shared concepts live in one doc; others point at
  it.

## Keeping them true

The standing rule is in the repo root `CLAUDE.md`: a change to a file updates
its doc in the same commit. A doc describing behaviour the code no longer has
is worse than no doc, because it is trusted.
