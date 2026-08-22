# src/lib/dates.ts

> Formats a timestamp as the user's local calendar date for
> `<input type="date">` fields, and turns a written delivery period into a
> committed delivery date.

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

deliveryScheduleToDate("10 weeks", "2026-01-05")  // "2026-03-16"
deliveryScheduleToDate("45 days", "2026-01-05")   // "2026-02-19"
deliveryScheduleToDate("8-10 weeks", "2026-01-05")// upper bound: 10 weeks
deliveryScheduleToDate("ready stock", "2026-01-05") // "2026-01-05"
deliveryScheduleToDate("as per site", "2026-01-05") // "" — no period stated
```

### deliveryScheduleToDate

A client states delivery as a period, not a date: "10 weeks", "45 days",
"8-10 weeks", "ready stock". The committed delivery date (CDD) that goes into
the P.O. acceptance letter is that period counted from the client's P.O. date.
Registration used to leave the arithmetic to the user and a calendar; the CDD
field on the client-PO screen now pre-fills from this and stays editable.

A **range commits to its upper bound** — the last number+unit pair in the text
wins. Promising the optimistic end of a range the client themselves gave as a
range is how a delivery is late on day one.

Returns `""` when the text carries no period, so the caller leaves the date for
the user to pick rather than inventing one.

## How it works

`getFullYear/getMonth/getDate` — the local-time accessors — instead of any
UTC-based serialization. Blank/invalid input returns `""` because the date
inputs treat empty string as "not set".

`deliveryScheduleToDate` parses a bare `yyyy-MM-dd` base date **locally**
rather than through `new Date(str)`, which is UTC midnight: on a negative-offset
machine the CDD would otherwise be committed one calendar day early. Weeks are
added as 7 days; months and years shift the corresponding field, so month-end
arithmetic follows the platform's normal `setMonth` behaviour.

## Domain notes

None — pure calendar mechanics.

## Gotchas and constraints

- The **save** side stores the `YYYY-MM-DD` string via `new Date(str)`, which
  is UTC midnight. For UTC+ timezones (India) that round-trips to the same
  local date. A UTC− deployment would shift dates backwards on load — if this
  system ever runs for a Americas-timezone tenant, the storage convention
  needs revisiting, not this helper.

## Related

- `src/lib/dates.test.ts` — the padding/junk cases and the schedule parsing.
- `src/app/(dashboard)/client-purchase-orders/create/page.tsx` — derives the
  CDD from the delivery schedule.
- `src/app/(dashboard)/quotations/create/standard/page.tsx`,
  `src/app/(dashboard)/quotations/create/nonstandard/page.tsx` — the callers.
