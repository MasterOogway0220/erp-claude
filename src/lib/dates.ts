import { format } from "date-fns";

/**
 * Format a date for display, tolerating every value the API can actually send.
 *
 * `format(new Date(x))` throws `RangeError: Invalid time value` when `x` is
 * `undefined` or `""` — it does not degrade to a placeholder. One such cell
 * throws during render, React unmounts the tree, and the user gets the
 * "Something went wrong" boundary for the entire page instead of one empty
 * column.
 *
 * `undefined` is not a rare case. Any nullable column reaches the browser as
 * `undefined` whenever the route's `select` omits it, so narrowing a list
 * payload — which is a routine optimisation here — turns a working screen into
 * a crashing one with nothing failing at build time.
 *
 * `null` is handled too, and deliberately does NOT fall through to `new Date`:
 * `new Date(null)` is the epoch, so an unset date rendered "01 Jan 1970" as
 * though it were real data.
 */
export function formatDate(
  value: string | number | Date | null | undefined,
  pattern = "dd MMM yyyy",
  fallback = "—"
): string {
  if (value === null || value === undefined || value === "") return fallback;
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  return format(d, pattern);
}

/**
 * Format a date for an <input type="date"> using the user's LOCAL calendar.
 *
 * The obvious `toISOString().split("T")[0]` gives the UTC calendar date,
 * which in IST is one day early for any timestamp before 05:30 — so merely
 * opening and re-saving a quotation whose date carried such a time component
 * (revisions are stamped `new Date()`) silently moved its date back a day.
 */
export function toDateInput(
  value: string | number | Date | null | undefined
): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Turn an alphanumeric delivery schedule into a committed delivery date (CDD).
 *
 * Clients state delivery as a period, not a date — "10 weeks", "45 days",
 * "8-10 weeks", "ready stock". The CDD we commit to in the PO acceptance letter
 * is that period counted from the P.O. date, so the schedule text is parsed
 * here rather than the user doing the arithmetic on a calendar.
 *
 * A range commits to its UPPER bound ("8-10 weeks" -> 10 weeks): promising the
 * optimistic end of a range the client themselves gave as a range is how a
 * delivery is late on day one.
 *
 * Returns null when the text carries no period at all, so the caller can leave
 * the date for the user to pick instead of inventing one.
 */
export function deliveryScheduleToDate(
  schedule: string | null | undefined,
  from: string | number | Date | null | undefined
): string {
  if (!schedule || !from) return "";
  // A bare "yyyy-MM-dd" (what every date input on the form hands us) parses as
  // UTC midnight, which is the previous calendar day on any negative-offset
  // machine — the CDD would be committed one day early. Build it locally.
  const ymd =
    typeof from === "string" ? /^(d{4})-(d{2})-(d{2})$/.exec(from) : null;
  const base = ymd
    ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
    : new Date(from);
  if (isNaN(base.getTime())) return "";

  const text = schedule.toLowerCase();

  // "ready stock" / "ex-stock" / "immediate" — deliverable on the P.O. date.
  if (/\b(ready|ex[-\s]?stock|immediate|readily)\b/.test(text)) {
    return toDateInput(base);
  }

  // Take the LAST number+unit pair so a range commits to its upper bound.
  const matches = [
    ...text.matchAll(/(\d+(?:\.\d+)?)\s*(day|days|d|week|weeks|wks?|w|month|months|mon|year|years|yr|yrs)\b/g),
  ];
  const last = matches[matches.length - 1];
  if (!last) return "";

  const n = parseFloat(last[1]);
  if (!isFinite(n) || n < 0) return "";
  const unit = last[2];

  const result = new Date(base);
  if (/^d/.test(unit)) result.setDate(result.getDate() + Math.round(n));
  else if (/^w/.test(unit)) result.setDate(result.getDate() + Math.round(n * 7));
  else if (/^mon?/.test(unit)) result.setMonth(result.getMonth() + Math.round(n));
  else result.setFullYear(result.getFullYear() + Math.round(n));

  return toDateInput(result);
}
