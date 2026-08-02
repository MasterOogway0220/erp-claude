# src/lib/purchase/rfq-reminders.ts

> Decides which vendors are due a nudge before an RFQ closes, and which have
> run out of time.

## Why this exists

The purchase workflow document asks for a reminder two days before the
submission deadline, and for vendors who never reply to be marked "No
Response". `RFQVendor` already carried `reminderCount` and `lastReminderDate`
— the schema anticipated this — but nothing ever set them, so chasing
quotations was manual.

The logic is pure and separate from the cron route because it is date
arithmetic, which is the part that goes quietly wrong. A boundary error here
either spams vendors daily or never fires at all, and both are invisible until
someone complains. Every branch is tested against a fixed clock.

## What it does

| Export | Meaning |
|---|---|
| `REMINDER_LEAD_DAYS` | 2 — how early to nudge. |
| `REMINDER_COOLDOWN_HOURS` | 20 — minimum gap between reminders. |
| `needsReminder(state, now)` | Should this vendor be chased right now? |
| `hasExpired(state, now)` | Has the deadline passed with no quote? |

`RfqVendorState` is a plain shape — status, `sentDate`, `submissionDeadline`,
`lastReminderDate` — so callers can build it from any query.

## How it works

### `needsReminder`

Five conditions, all required:

1. Status is `PENDING` — an answered vendor is never chased.
2. `sentDate` is set — the RFQ actually went out. A drafted-but-unsent RFQ has
   nobody to remind.
3. `submissionDeadline` is set — nothing to count down to otherwise.
4. The deadline is **in the future** and within `REMINDER_LEAD_DAYS`. Note
   `msLeft <= 0` excludes a passed deadline: that is the expiry case, and a
   vendor should not receive "your deadline is approaching" after it has gone.
5. Either no reminder has been sent, or the last one was at least
   `REMINDER_COOLDOWN_HOURS` ago.

### Why a 20-hour cooldown for a daily job

The cron runs once a day, so a cooldown looks redundant. It is there because
the job may be re-run manually, retried by the platform, or rescheduled to run
more often later. Without it, each run inside the two-day window sends another
mail. 20 rather than 24 so a daily job that drifts slightly earlier still
fires — at exactly 24 the second day's run could fall a minute short and skip.

### `hasExpired`

Status `PENDING`, deadline set, deadline `<= now`. It maps to the
`VendorQuoteStatus.EXPIRED` enum value, which already meant exactly what the
document calls "No Response" — no schema change was needed.

The `PENDING` check makes both functions idempotent: a vendor already `EXPIRED`
is not re-expired, and one who submitted late is not overwritten.

An RFQ with **no deadline** never expires. Open-ended enquiries exist and
should not be closed by a background job.

## Domain notes

- **RFQ** — Request for Quotation. Sent to several vendors at once; their
  replies become `VendorQuotation` rows, which feed the **Comparative
  Statement** that ranks them L1/L2/L3 by total landed cost.
- **L1** is the lowest landed cost. Choosing L2 or L3 requires written
  justification — buying decisions here are auditable.
- A vendor who never quotes still matters: the CS must show they were asked and
  did not respond, which is why they are marked rather than deleted.

## Gotchas and constraints

- Pure. Sending and persistence are the route's job.
- The deadline is per **RFQ**, not per vendor, so all vendors on one RFQ are
  chased on the same day.
- Only chases `PENDING`. There is no follow-up for a vendor who quoted and was
  then asked to revise.
- Requires `CRON_SECRET`; the route refuses to run without it.

## Related

- `src/lib/purchase/rfq-reminders.test.ts` — boundary cases against a fixed
  clock.
- `src/app/api/cron/rfq-reminders/route.ts` — the caller.
- `vercel.json` — the schedule (`30 3 * * *`).
- `prisma/schema.prisma` → `RFQVendor`, `VendorQuoteStatus`.
