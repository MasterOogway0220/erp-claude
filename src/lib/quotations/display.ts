// Presentation helpers shared by the quotation PDF renderers
// (react-pdf download + HTML email attachment).

// A real inquiry reference (RFQ no., item code, mail ref) always carries at
// least one digit; free text like "require quotation" is a placeholder the
// customer should never see printed — or baked into the PDF filename.
export function displayInquiryNo(raw: string | null | undefined): string {
  const v = (raw || "").trim();
  return /\d/.test(v) ? v : "";
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
    return item.schedule ? `${nb}"NB X SCH ${item.schedule}` : `${nb}"NB`;
  }
  return "-";
}
