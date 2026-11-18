# src/lib/stale-build.ts

> Recognises the error a browser tab throws when it is still running the previous deployment.

## Why this exists

Every Vercel deploy replaces the JavaScript files under `/_next/static`. A tab opened before the deploy still holds the old page, and the next time it needs a code file it has not loaded yet (opening another screen, a lazily loaded dialog), it asks for a file the new deployment does not have. The load fails, the page lands on the error screen, and "Try Again" asks for the same missing file. Only a full reload fetches the new build. Users experienced this as "the app stops working until I hard refresh".

## What it does

- `isStaleBuildError(error)` returns true for webpack/Turbopack `ChunkLoadError`, "Loading chunk … failed", "Loading CSS chunk … failed", and the Chrome, Safari and Firefox wordings of a failed dynamic import. Anything else is false.

## How it works

- Checks `error.name` and a regex over `error.message`. Kept deliberately narrow: a plain "Failed to fetch" (a network or API failure) does not match, because reloading would not fix it.

## Gotchas and constraints

- The reload itself happens in `src/app/error.tsx`, at most once per 30 seconds per tab (timestamp in `sessionStorage`), so a page that genuinely cannot load never loops.
- Vercel's Skew Protection (a project setting) keeps the old build's files reachable for a while after a deploy, which prevents most of these errors in the first place. This check is the fallback when it is off or expired.

## Related

- `stale-build.test.ts`
- `src/app/error.tsx` — calls it and reloads.
