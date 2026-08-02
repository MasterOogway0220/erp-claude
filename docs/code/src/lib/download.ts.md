# src/lib/download.ts

> Fetch-and-save with one automatic retry, for PDF endpoints that fail only on
> a cold start.

## Why this exists

Same core reason as `download-file.ts` — surface server errors instead of the
browser's opaque failure — plus one thing that file does not do: **retry**.

PDF rendering runs Chromium via `@sparticuz/chromium` in a serverless function.
The first invocation on a cold instance has to unpack and launch the browser
binary, and that routinely times out or fails. The immediate second attempt
lands on a warm instance and succeeds. Making the user click again for a fault
with a known, self-correcting cause is poor.

## What it does

`downloadFile(url)` — fetch, save, retry once on failure. Filename comes from
`Content-Disposition`, falling back to the last path segment.

## How it works

The download is an inner `attempt()` closure; the outer function calls it and,
on any throw, calls it once more. A second failure propagates.

One retry, not a loop with backoff: the fault being compensated for is
specifically the cold-start case, which either clears on the next request or is
a real error. Retrying a genuine 500 repeatedly just delays the message.

Filename resolution differs subtly from the other implementation: the regex is
`/filename="?([^";]+)"?/` — note `;` in the negated set, so parameters after
the filename are not swallowed. The fallback strips the query string from the
URL's last segment.

## Domain notes

None.

## Gotchas and constraints

- **Name collision with `src/lib/download-file.ts`.** Both export
  `downloadFile`; that one takes `(url, fallbackName)` and does not retry, this
  one takes `(url)` and does. Check the import path before assuming behaviour.
  Consolidating them is a genuine cleanup — keep the retry and the stricter
  regex.
- **Retries are unconditional**, including on a 4xx that will never succeed.
  Harmless but wasteful.
- No `Content-Disposition` and a query-only URL yields `"download"`.

## Related

- `src/lib/download-file.ts` — the other one.
- `src/lib/pdf/render-pdf.ts` — the Chromium path whose cold start this exists
  for.
