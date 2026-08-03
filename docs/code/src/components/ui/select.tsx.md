# src/components/ui/select.tsx

> shadcn/ui primitive. See [README.md](./README.md) for the group's rationale,
> conventions and gotchas.

Generated component, owned in-repo so it can be restyled to the brand. Wraps
the corresponding Radix primitive (where one exists) with Tailwind classes,
composing them through `cn()` so a caller's `className` wins.

Changes here affect every screen. Before editing, check the README — in
particular the `Select` empty-value rule, which the whole codebase depends on.

## The phantom-`""` guard

`Select` is not a bare re-export of `SelectPrimitive.Root`: its
`onValueChange` swallows empty-string emissions. Radix fires a phantom
`onValueChange("")` — no user involved — when a controlled `value` is swapped
programmatically mid-render, which is exactly what an edit form does when it
populates state from fetched data. On the quotation edit pages this silently
wiped currency/length/uom after load, and the wipe got saved when the user
pressed Update. A real selection can never be `""` because Radix throws on
`<SelectItem value="">` (the codebase uses `"NONE"`/`"__none__"` sentinels
instead), so filtering `""` here is safe for every consumer and fixes the
whole app in one place. Do not remove the guard when regenerating this file
from shadcn.
