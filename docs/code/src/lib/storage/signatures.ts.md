# src/lib/storage/signatures.ts

> Decides which file types may be stored in the database, by checking their leading bytes.

## Why this exists

Uploads (client MTCs, lab reports, inspection documents) used to be stored under whatever MIME type the browser sent, and served inline from this same origin. An uploaded HTML or SVG file would therefore run script in the app. The allowlist plus a byte check stops that: a file must both claim an allowed type and start with that type's signature.

## What it does

- `matchesSignature(mimeType, data)` returns true only if `mimeType` is on the allowlist and `data` starts with its signature.
- Allowed: `application/pdf`, `image/png`, `image/jpeg`, `image/webp`, the xlsx and docx types (zip container), and legacy `application/vnd.ms-excel` (OLE container).

## How it works

- Each signature is a small predicate on the first 4 to 12 bytes.
- The table is a plain object lookup, so an unknown MIME returns false without reaching a predicate.

## Gotchas and constraints

- Adding a type means adding both the MIME entry and its byte check. A MIME without a byte check is not possible here by construction.
- Some legitimate uploads may fail if their browser sends an unexpected MIME (for example `application/octet-stream` for a real PDF). The user sees "Unsupported file type".
- `storeFile` (in `files.ts`) is the only caller.

## Related

- `src/lib/storage/files.ts` — calls this before storing.
- `src/app/api/files/[id]/route.ts` — serves what was stored.
- `signatures.test.ts`
