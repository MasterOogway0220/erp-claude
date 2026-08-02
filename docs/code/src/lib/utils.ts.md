# src/lib/utils.ts

> `cn()` — merge Tailwind class names without conflicts.

## Why this exists

The standard shadcn/ui helper, present in every project scaffolded that way.
Every UI component in `src/components/ui/` imports it.

## What it does

`cn(...inputs)` takes anything `clsx` accepts — strings, conditionals, arrays,
objects — and returns one class string.

## How it works

Two libraries, in order:

1. **`clsx`** flattens the arguments and drops falsy values, so
   `cn("p-2", isActive && "bg-accent")` works without ternaries.
2. **`tailwind-merge`** resolves *conflicts*, last one winning.

The second is the reason this exists rather than a template literal. Plain
concatenation of `"px-2"` and `"px-4"` emits both, and which applies then
depends on their order in the generated stylesheet — not on the order you wrote
them. `twMerge` understands that `px-2` and `px-4` are the same property and
keeps only the last. That is what makes a component's `className` prop reliably
override its defaults.

## Domain notes

None.

## Gotchas and constraints

- `twMerge` only knows **standard Tailwind** class groups. Custom utilities
  from `globals.css` are passed through unmerged, so two conflicting custom
  classes both survive.
- Do not use for conditional logic beyond class names.

## Related

- `src/components/ui/**` — every component.
