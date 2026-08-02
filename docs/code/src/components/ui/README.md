# src/components/ui/ — shadcn/ui primitives

23 files. **These are generated components, not hand-written ones**, and they
are documented as a group because individually they are the upstream shadcn/ui
source with little or no local modification.

## What they are

shadcn/ui is not a dependency — it is a set of components you copy into your
project and own. Each file here wraps a Radix UI primitive with Tailwind
classes and `cva` variants.

Radix supplies behaviour and accessibility (focus management, keyboard
navigation, ARIA, portalling); the file supplies appearance.

## Why they are in the repo rather than `node_modules`

Because you are meant to edit them. A component you own can be restyled to the
brand — the red `#e31e24`, blue `#4e6cad` and black this project uses — without
fighting a library's theming API or waiting for an upstream release.

## The files

| Component | Radix primitive | Notes |
|---|---|---|
| `button.tsx` | — | `cva` variants: default, destructive, outline, secondary, ghost, link |
| `input.tsx`, `textarea.tsx`, `label.tsx` | — | Form primitives |
| `select.tsx` | `@radix-ui/react-select` | See the gotcha below |
| `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx` | Dialog / AlertDialog | Modal, confirm, slide-over |
| `dropdown-menu.tsx` | DropdownMenu | |
| `table.tsx` | — | Styled `<table>` parts; `data-table.tsx` builds on it |
| `tabs.tsx` | Tabs | |
| `card.tsx`, `badge.tsx`, `separator.tsx`, `skeleton.tsx`, `progress.tsx` | — | Presentational |
| `checkbox.tsx`, `switch.tsx` | Checkbox / Switch | |
| `avatar.tsx`, `tooltip.tsx`, `scroll-area.tsx` | Avatar / Tooltip / ScrollArea | |
| `form.tsx` | — | react-hook-form bindings |
| `sonner.tsx` | — | Toast host. `toast()` is imported from `sonner` directly |

## Conventions

- Every component composes classes with `cn()` from `src/lib/utils.ts`, so a
  caller's `className` reliably overrides the defaults.
- Variants use `class-variance-authority`.
- Most forward refs and spread the rest of their props to the Radix primitive.

## Gotchas

- **`Select` requires a non-empty `value` on every `SelectItem`.** Radix throws
  on `value=""`. The codebase's convention is a sentinel `"NONE"` mapped to `""`
  in the handler:

  ```tsx
  <Select value={formData.dealOwnerId || "NONE"}
          onValueChange={(v) => setFormData({ ...formData, dealOwnerId: v === "NONE" ? "" : v })}>
    <SelectItem value="NONE">Unassigned</SelectItem>
  ```

  You will see this pattern in every form; it is not incidental.

- **`Select` renders its items into a hidden `DocumentFragment` when closed**,
  which is how the trigger displays the selected label without the list being
  open. A `value` whose item mounts later still resolves — this was verified
  when diagnosing an "assignment disappears" report, and it was *not* the
  cause.

- **Do not upgrade these by regenerating** without diffing. Local restyling
  would be overwritten.

- `sonner.tsx` only mounts the toaster. Import `toast` from `sonner` itself.

## Related

- `src/lib/utils.ts` — `cn()`.
- `src/components/shared/` — application components built on these.
- `components.json` — the shadcn config.
