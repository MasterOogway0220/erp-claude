/**
 * A VDI / hydro-test witness percentage for an Int column: rounded to a whole
 * number, null when blank or not a number. The live MySQL is non-strict and
 * would otherwise truncate 12.5 to 12 without an error.
 */
export function wholePercent(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}
