// Presentation helpers shared by the quotation PDF renderers
// (react-pdf download + HTML email attachment).

// A real inquiry reference (RFQ no., item code, mail ref) always carries at
// least one digit; free text like "require quotation" is a placeholder that
// should not be baked into the PDF filename. Headers print the inquiry no.
// exactly as entered — this filter guards the filename only.
export function displayInquiryNo(raw: string | null | undefined): string {
  const v = (raw || "").trim();
  return /\d/.test(v) ? v : "";
}

/**
 * The word that stands in for a number in the Unit Rate / Amount cells, or
 * null when the cell should print the figure itself.
 *
 * Only two words may ever appear there, and the order matters:
 *
 * - **REGRET** — this line was declined, per item. It wins over QUOTED,
 *   because on a technical copy "QUOTED" would imply a price exists for a
 *   line that deliberately has none.
 * - **QUOTED** — the whole document is the technical (unpriced) copy, sent to
 *   a client's engineering department while purchasing gets the commercial one.
 *
 * Shared by all three renderers (react-pdf download, and the two HTML email
 * templates) so the precedence cannot drift between the copy a customer
 * downloads and the copy they are emailed. Callers apply their own emphasis
 * markup around the returned word.
 */
export function priceCellWord(
  item: { isRegret?: boolean | null },
  isUnquoted: boolean
): "REGRET" | "QUOTED" | null {
  if (item.isRegret) return "REGRET";
  return isUnquoted ? "QUOTED" : null;
}

export interface SizeSource {
  sizeLabel?: string | null;
  sizeNPS?: unknown; // Prisma Decimal | number | string
  schedule?: string | null;
}

// The Size cell must never print blank: fall back to the pipe geometry
// captured on the item (NPS + schedule), then to an explicit dash so a
// missing size reads as intentional rather than a rendering hole.
export function displaySizeLabel(item: SizeSource): string {
  if (item.sizeLabel) return String(item.sizeLabel);
  const nps = item.sizeNPS != null ? parseFloat(String(item.sizeNPS)) : NaN;
  if (!isNaN(nps) && nps > 0) {
    const nb = String(nps);
    if (!item.schedule) return `${nb}"NB`;
    // stored schedules already carry the prefix ("Sch 40", "SCH XS") —
    // don't double it; bare values ("XS", "STD") get one added.
    const sch = /^sch\b/i.test(item.schedule) ? item.schedule.toUpperCase() : `SCH ${item.schedule}`;
    return `${nb}"NB X ${sch}`;
  }
  return "-";
}
