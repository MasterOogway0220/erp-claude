# src/lib/dates.ts

> Formats a timestamp as the user's local calendar date for
> `<input type="date">` fields.

## Why this exists

The quotation edit pages used `new Date(x).toISOString().split("T")[0]` to
prefill date inputs. `toISOString()` is UTC, and India is UTC+5:30 — so any
timestamp between 00:00 and 05:29 IST formats as the **previous** calendar
day. Quotation revisions are stamped with a full `new Date()` timestamp, which
meant merely opening and re-saving an early-morning revision moved its
quotation date one day back, permanently (the save writes the shifted string).
One of the "values changed by themselves" family of edit bugs.

## What it does

```ts
toDateInput(new Date(2026, 0, 5)) // "2026-01-05" — local calendar, padded
toDateInput(null)                 // ""
toDateInput("not-a-date")         // ""
```

## How it works

`getFullYear/getMonth/getDate` — the local-time accessors — instead of any
UTC-based serialization. Blank/invalid input returns `""` because the date
inputs treat empty string as "not set".

## Domain notes

None — pure calendar mechanics.

## Gotchas and constraints

- The **save** side stores the `YYYY-MM-DD` string via `new Date(str)`, which
  is UTC midnight. For UTC+ timezones (India) that round-trips to the same
  local date. A UTC− deployment would shift dates backwards on load — if this
  system ever runs for a Americas-timezone tenant, the storage convention
  needs revisiting, not this helper.

## Related

- `src/lib/dates.test.ts` — the padding/junk cases.
- `src/app/(dashboard)/quotations/create/standard/page.tsx`,
  `src/app/(dashboard)/quotations/create/nonstandard/page.tsx` — the callers.
