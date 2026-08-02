# src/lib/download-file.ts

> Fetches a file and triggers a real browser download, surfacing server errors
> instead of hiding them.

## Why this exists

The obvious approach — `<a href="/api/…/pdf" download>` — fails badly here.
The browser navigates, and if the server returns a JSON error the user gets
either a downloaded file containing `{"error":"..."}` or an opaque "download
failed", with the actual message invisible.

Every PDF in this ERP is generated on demand and can genuinely fail: an
unpriced quotation, a missing company logo, a serverless timeout. Those need to
reach the user as text.

## What it does

`downloadFile(url, fallbackName)` — fetches, saves, throws a useful `Error` on
failure.

## How it works

1. `fetch` the URL.
2. On non-OK, parse the body as JSON and throw `e.error || e.detail`. Wrapped
   in `try/catch` so an HTML error page does not throw *inside* the error path.
3. Read the body as a `Blob`.
4. Take the filename from `Content-Disposition` — the server names the file
   (`quotation-NPS-26-15213.pdf`), the client does not have to reconstruct it.
   `fallbackName` covers a missing header.
5. Create an object URL, click a synthetic `<a download>`, remove it, and
   **revoke the object URL**. Skipping the revoke leaks the whole blob for the
   lifetime of the page, which for a multi-megabyte dossier is noticeable.

## Domain notes

None.

## Gotchas and constraints

- **Same-origin only.** Cross-origin responses hide `Content-Disposition`
  unless explicitly exposed.
- **The whole file goes through memory** as a blob. Fine for the documents
  here.
- **There is a second, near-identical `downloadFile` in `src/lib/download.ts`.**
  That one takes no fallback name and retries once. Two functions with the same
  name doing almost the same thing is a real trip hazard — check which one is
  imported before changing behaviour. They should be merged.

## Related

- `src/lib/download.ts` — the near-duplicate, with retry.
- `src/lib/pdf/render-pdf.ts` — what produces most of these responses.
