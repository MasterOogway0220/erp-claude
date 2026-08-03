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
