# src/components/shared/smart-combobox.tsx

> A searchable text input with suggestions that also accepts free text.

## Why this exists

The size and product pickers need both behaviours at once: offer the catalogue,
but let a user type something not in it. A `Select` cannot do that, and a plain
input offers no help.

Sizes are the driving case — a quotation can legitimately name a size the
master does not carry.

## What it does

An `Input` with a filtered dropdown. `onSelect` fires on a pick, `onChange` on
every keystroke, so the caller receives free text too.

## How it works

### No render cap — deliberately

The list renders **every** filtered option. There was a cap; it was removed
because callers append master-entered options *after* the built-in pools, so a
cap hid exactly the hand-added entries. It also desynced keyboard navigation,
which indexes the full filtered array.

The tradeoff is stated in the source: the worst real list is now **5,626 rows**
(`FITTING_SIZES.BW_REDUCING`, the two-size reducer pairs) inside a
`max-h-48 overflow-auto` box. Typing filters it immediately; the first open is
the one to watch. Virtualise if it measures slow — **a cap is the wrong fix,
because it hides the tail by design.**

### Keyboard

Arrow keys move a highlight index into `filtered`, Enter selects, Escape
closes. `onMouseDown` rather than `onClick` for selection, so the pick lands
before the input's blur closes the list.

## Gotchas and constraints

- `filterFn` and `displayFn` are caller-supplied; most pass substring match and
  identity.
- Generic over the option type, so options can be strings or objects.
- Free text means the caller must handle a value that matches nothing.

## Related

- `src/components/shared/product-material-select.tsx`, `size-select.tsx`
- `src/lib/fitting-flange-sizes.ts` — the large pools.
