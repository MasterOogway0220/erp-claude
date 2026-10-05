# src/components/sandbox/preview-gate.tsx

> Per-user switch for pages and components during a sandbox preview: the sandbox login renders the new version, everyone else the unchanged one.

## Why this exists

The browser half of the sandbox preview described in
`src/lib/sandbox/preview.ts.md`: the 03/10/26 meeting fixes are deployed for
the sandbox account only, until the owner switches them on for everyone.

## What it does

`sandboxSwitch(Next, Legacy, fallback?)` returns a component that renders
`Next` when `session.user.isSandbox` is true and `Legacy` otherwise, passing
props through. While the session is loading it renders `fallback`
(`<PageLoading />` by default; components pass `null`).

Used by every gated `page.tsx` and by `ProcessStep.tsx` and
`product-material-select.tsx`:

```tsx
import Next from "./page.sandbox";
import Legacy from "./page.legacy";
export default sandboxSwitch(Next, Legacy);
```

## How it works

Reads `useSession()` from next-auth, the same source the sandbox banner uses.
Nothing renders until the session is known, so a real user never sees the new
version flash before being switched to the old one.

## Gotchas and constraints

- This only chooses what is **shown**. What the server does is chosen
  separately, per request, by `sandboxGate`; both read the same sandbox flag.
- `product-material-select.tsx` keeps a module-level cache in each version;
  its gate reads `getMasterExtraSizes` from whichever cache is filled and
  clears both in `invalidateProductCache`.
- **Temporary.** Going live: replace each gated file with its `.sandbox`
  version and delete the `.sandbox` / `.legacy` copies, then this file.

## Related

- `src/lib/sandbox/preview.ts` — the server-side gate.
- `src/components/layout/sandbox-banner.tsx` — the other reader of `isSandbox`.
