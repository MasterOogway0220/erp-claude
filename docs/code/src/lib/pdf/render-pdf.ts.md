# src/lib/pdf/render-pdf.ts

> Turns an HTML string into a PDF buffer via headless Chromium, resolving the
> browser differently on every environment this app runs in.

## Why this exists

Every printed document — quotation, purchase order, invoice, packing list,
inspection offer, dispatch dossier — is authored as HTML and rendered to PDF
here. One renderer, so page geometry and font handling stay identical across
documents.

The awkward part is Chromium itself. The app runs on Vercel serverless, and the
project has also targeted Hostinger and local machines. Each needs a different
binary in a different place, and a wrong guess means every PDF in the system
fails.

## What it does

`renderHtmlToPdf(html, landscape)` → `Buffer`.

## How it works

### Browser resolution, in order

1. **`CHROMIUM_EXECUTABLE_PATH`** — explicit override, wins outright. For VPS
   or Hostinger deployments where Chromium is installed at a known path.
2. **`@sparticuz/chromium`** — the Lambda-compatible build. This is the
   production path on Vercel: a normal Chromium download will not run there,
   and this package ships a binary that will.
3. **System browser** — `which chromium-browser`, `chromium`,
   `google-chrome-stable`, `google-chrome`.
4. **macOS Chrome** at the standard `/Applications` path, for local dev.

If none resolve it throws with the `apt-get` command and the env var name,
because the alternative is a stack trace from deep inside Puppeteer that says
nothing useful.

### The launch flags

`--no-sandbox`, `--disable-setuid-sandbox` — required in a container with no
user namespaces. `--single-process`, `--disable-dev-shm-usage` — serverless has
a very small `/dev/shm`, and the default multi-process model exhausts it.
`--font-render-hinting=none` keeps text metrics consistent between the
developer's machine and production, so a table that fits locally still fits
after deploy.

`puppeteer-core` is imported dynamically so the module is only loaded on PDF
routes.

### Page geometry — not A4

Neither branch uses A4, and both deviations are deliberate:

- **Landscape** — 297 × **230** mm (A4 landscape is 297 × 210). Taller, so the
  standard quotation's item table plus terms fit on one page.
- **Portrait** — 210 × **320** mm (A4 is 210 × 297). Taller again, so the
  non-standard quotation's footer lands on the same page instead of orphaning.

These are tuned to the client's actual documents. Changing them reflows every
PDF, so verify against a real rendered document rather than eyeballing the
numbers.

`waitUntil: "networkidle0"` waits for images — the company and ISO logos — to
load. Without it, logos are intermittently missing.

`printBackground: true` keeps table shading and header colours, which a print
stylesheet would otherwise drop.

## Domain notes

Documents here are commercial paperwork sent to clients and vendors, so
layout fidelity is not cosmetic — a quotation that reflows across two pages
looks careless and gets queried.

## Gotchas and constraints

- **Cold starts fail.** Launching Chromium on a fresh serverless instance
  routinely times out or errors; the immediate retry succeeds. That is why
  `src/lib/download.ts` retries once, and why the PDF routes carry
  `maxDuration: 60` and `memory: 1024` in `vercel.json`.
- **`execSync("which …")` runs a subprocess** on every render that reaches
  tier 3. Not hit on Vercel, since tier 2 resolves first.
- Chromium is heavy: the memory bump in `vercel.json` is required, not
  optional.
- No page-count guard. A document that overflows silently produces extra pages.

## Related

- `vercel.json` — per-route memory and duration for PDF endpoints.
- `src/lib/pdf/print-wrapper.ts` — the browser-print alternative.
- `src/lib/pdf/*-template.ts` — the HTML producers.
- `src/lib/download.ts` — the client-side retry that compensates for cold
  starts.
