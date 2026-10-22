# src/components/ui/card.tsx

> shadcn/ui primitive. See [README.md](./README.md) for the group's rationale,
> conventions and gotchas.

Generated component, owned in-repo so it can be restyled to the brand. Wraps
the corresponding Radix primitive (where one exists) with Tailwind classes,
composing them through `cn()` so a caller's `className` wins.

Changes here affect every screen. Before editing, check the README — in
particular the `Select` empty-value rule, which the whole codebase depends on.

## Change (2026-10-22, follow-up 3)

No drop shadow on the base card: the border separates it (design rule 18). Overlays (dialog, popover, dropdown, sheet) keep their shadows; they need elevation.
