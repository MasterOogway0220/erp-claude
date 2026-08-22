import { StyleSheet } from "@react-pdf/renderer";

/**
 * Shared building blocks for every react-pdf document.
 *
 * These were written for the quotation PDF and proved out there; they are
 * lifted here unchanged so the documents migrating off the Chromium/HTML
 * pipeline reuse them rather than each rediscovering the same react-pdf
 * quirks. `quotation-pdf.tsx` imports from here too — there is one copy.
 */

// ─── Formatting ───────────────────────────────────────────────────────────────

/** dd/mm/yyyy. Empty string for a missing date, never "Invalid Date". */
export function fmtDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

/** Plain fixed-decimal. Empty string rather than "NaN" for unparseable input. */
export function fmt(val: any, dec = 2): string {
  const n = parseFloat(val);
  return isNaN(n) ? "" : n.toFixed(dec);
}

/**
 * Indian digit grouping — 12,34,567.89 rather than 1,234,567.89. Every money
 * figure on a document that goes to an Indian customer uses this.
 */
export function fmtIN(val: any, dec = 2): string {
  const n = parseFloat(val);
  if (isNaN(n)) return "";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

// ─── Table borders ────────────────────────────────────────────────────────────

export const GREY = "#D9D9D9";

/**
 * react-pdf has no `border-collapse`, so a cell bordered on all four sides
 * paints its own edge right next to its neighbour's — every internal gridline
 * comes out as a double rule, which doubles the ink on a printed document.
 *
 * Cells therefore paint only their bottom and left edge. Bottom rather than
 * top so that a table split across pages still closes at the page break: the
 * last row before the break draws its own bottom. The first row of a table
 * supplies the top edge (CELL_TOP) and the last cell in a row closes the
 * right edge (CELL_END).
 */
export const CELL = {
  borderBottomWidth: 0.5,
  borderLeftWidth: 0.5,
  borderColor: "#999",
  borderStyle: "solid" as const,
};
export const CELL_END = { borderRightWidth: 0.5 };
export const CELL_TOP = { borderTopWidth: 0.5 };

export const CELL_BOLD = {
  borderBottomWidth: 1,
  borderLeftWidth: 1,
  borderColor: "#000",
  borderStyle: "solid" as const,
};
export const CELL_BOLD_END = { borderRightWidth: 1 };
export const CELL_BOLD_TOP = { borderTopWidth: 1 };

// ─── Page furniture ───────────────────────────────────────────────────────────

/**
 * A4 at 72dpi is 595 x 842pt. The HTML templates used a 15mm page padding;
 * 15mm is ~42.5pt, rounded to 42 — react-pdf takes points, not millimetres,
 * and silently treats a bare number as points.
 */
export const PAGE_PADDING = 42;

export const base = StyleSheet.create({
  page: {
    paddingTop: PAGE_PADDING,
    paddingBottom: PAGE_PADDING,
    paddingHorizontal: PAGE_PADDING,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#333",
  },
  row: { flexDirection: "row" },
  bold: { fontFamily: "Helvetica-Bold" },
  right: { textAlign: "right" },
  center: { textAlign: "center" },
});
