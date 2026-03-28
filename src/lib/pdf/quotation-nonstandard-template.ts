// Non-Standard Quotation PDF Template — Portrait A4, 9-column table
// Matches EXPORT_QUOTATION_FORMAT > COMMERCIAL / TECHNICAL sheets exactly
// COMMERCIAL = with prices, TECHNICAL = prices shown as "QUOTED"

import { numberToWords } from "../amount-in-words";

interface CompanyInfo {
  companyName: string;
  companyLogoUrl?: string | null;
  isoLogoUrl?: string | null;
  regAddressLine1?: string | null;
  regAddressLine2?: string | null;
  regCity?: string | null;
  regPincode?: string | null;
  regState?: string | null;
  regCountry?: string | null;
  telephoneNo?: string | null;
  email?: string | null;
  website?: string | null;
}

interface QuotationData {
  quotationNo: string;
  quotationDate: string | Date;
  validUpto?: string | Date | null;
  currency: string;
  inquiryNo?: string | null;
  inquiryDate?: string | Date | null;
  customer: {
    name: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    pincode?: string | null;
    contactPerson?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  preparedBy?: { name?: string; email?: string; phone?: string } | null;
  buyer?: {
    buyerName?: string | null;
    designation?: string | null;
    email?: string | null;
    mobile?: string | null;
    telephone?: string | null;
  } | null;
  version?: number;
  items: any[];
  terms: any[];
}

const exportNotes = [
  "This quotation is subject to our final confirmation at the time of order placement.",
  "Prices are subject to review in the event of any change in item scope or quantities.",
  "Invoicing shall be based on the actual quantity supplied at the agreed unit rates.",
  "The delivery / shipping schedule shall be calculated based on the number of business days from the date of receipt of a clear techno-commercial Purchase Order (PO).",
  "Supply shall be made as close as reasonably possible to the requested quantities, in accordance with standard manufacturing tolerances and available fixed lengths.",
  "Once a Purchase Order is placed, cancellation shall not be permitted under any circumstances.",
  "The quoted specifications conform to standard industry practices and applicable specifications, without any supplementary requirements unless explicitly stated in this offer.",
  "Reduction in ordered quantity after placement of Purchase Order shall not be accepted. Any increase in quantity shall be subject to our review and acceptance.",
  "In the event of any change in Government duties, taxes, levies, or policies, the quoted prices shall be subject to revision accordingly.",
  "In case of Force Majeure events, we shall not be liable for any delay or failure in performance due to unforeseen events beyond our control, and delivery schedules shall be adjusted accordingly.",
];

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatNumber(val: any, decimals: number = 2): string {
  const num = parseFloat(val);
  if (isNaN(num)) return "";
  return num.toFixed(decimals);
}

function nl2br(str: string | null | undefined): string {
  if (!str) return "";
  return escapeHtml(str).replace(/\n/g, "<br>");
}

/**
 * Build multi-line item description text for non-standard quotation.
 * If the item has a custom itemDescription, use that; otherwise build from structured fields.
 */
function buildItemDescription(item: any): string {
  if (item.itemDescription) {
    // If itemDescription doesn't already include material code, prepend it
    const mcCode = item.materialCode?.code || item.materialCodeLabel || "";
    const desc = item.itemDescription;
    if (mcCode && !desc.includes(mcCode)) {
      return `MATERIAL CODE: ${escapeHtml(mcCode)}<br>${nl2br(desc)}`;
    }
    return nl2br(desc);
  }

  const lines: string[] = [];

  const matCode = item.materialCode?.code || item.materialCodeLabel || item.remark || "";
  if (matCode) {
    lines.push(`MATERIAL CODE: ${matCode}`);
  }

  // Build short pipe description line
  const descParts = [item.product, item.sizeLabel, item.material].filter(Boolean);
  if (descParts.length > 0) lines.push(descParts.join(" "));

  if (item.sizeLabel) lines.push(`SIZE: ${item.sizeLabel}${item.schedule ? ` X ${item.schedule}` : ""}`);
  if (item.ends) lines.push(`END TYPE: ${item.ends}`);
  if (item.material) lines.push(`MATERIAL: ${item.material}${item.additionalSpec ? ` ${item.additionalSpec}` : ""}`);
  if (item.tagNo) lines.push(`TAG NUMBER: ${item.tagNo}`);
  if (item.drawingRef) lines.push(`DWG: ${item.drawingRef}`);
  if (item.componentPosition) lines.push(`ITEM NO.: ${item.componentPosition}`);

  if (item.certificateReq) {
    lines.push("");
    lines.push(`CERTIFICATE REQUIRED: ${item.certificateReq}`);
  }

  return lines.map((l) => escapeHtml(l)).join("<br>");
}

export function generateNonStandardQuotationHtml(
  quotation: QuotationData,
  company: CompanyInfo,
  variant: "QUOTED" | "UNQUOTED"
): string {
  const isTechnical = variant === "UNQUOTED";
  // Display label: COMMERCIAL for quoted (with prices), TECHNICAL for unquoted
  const typeLabel = isTechnical ? "TECHNICAL" : "COMMERCIAL";

  const totalQty = quotation.items.reduce(
    (sum, item) => sum + (parseFloat(item.quantity) || 0),
    0
  );
  const totalAmount = quotation.items.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0
  );

  const includedTerms = quotation.terms.filter((t: any) => t.isIncluded !== false);

  const footerAddress = [
    company.regAddressLine1,
    company.regAddressLine2,
    company.regCity,
    company.regState ? `${company.regState} - ${company.regPincode || ""}` : company.regPincode,
    company.regCountry,
  ]
    .filter(Boolean)
    .join(", ");

  const footerContact = [
    company.telephoneNo ? `Phone: ${company.telephoneNo}` : null,
    company.email ? `Email: ${company.email}` : null,
    company.website ? `Web: ${company.website}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  // Build customer address lines (rows 7-10 col A-C in Excel)
  const customerAddressLines: string[] = [];
  if (quotation.customer.addressLine1) customerAddressLines.push(quotation.customer.addressLine1);
  if (quotation.customer.addressLine2) customerAddressLines.push(quotation.customer.addressLine2);
  const cityStateLine = [
    quotation.customer.city,
    quotation.customer.state,
    quotation.customer.pincode,
    quotation.customer.country,
  ].filter(Boolean).join(", ");
  if (cityStateLine) customerAddressLines.push(cityStateLine);

  // Buyer info
  const buyerName = quotation.buyer?.buyerName || quotation.customer.contactPerson || "";
  const buyerDesignation = quotation.buyer?.designation || "";
  const buyerEmail = quotation.buyer?.email || quotation.customer.email || "";
  const buyerContact = quotation.buyer?.mobile || quotation.buyer?.telephone || quotation.customer.phone || "";

  // Enquiry reference
  const enquiryRef = quotation.inquiryNo || "";
  const enquiryDate = quotation.inquiryDate;

  // Prepared by
  const preparedByName = quotation.preparedBy?.name || "";
  const preparedByPhone = quotation.preparedBy?.phone || "";

  const itemRows = quotation.items
    .map((item: any) => {
      const desc = buildItemDescription(item);
      return `<tr class="data-row">
        <td class="cell-center cell-top" style="background-color:#d9d9d9;">${item.sNo}</td>
        <td class="cell-left cell-top cell-wrap" colspan="4">${desc}</td>
        <td class="cell-center cell-top">${formatNumber(item.quantity, 0)}</td>
        <td class="cell-right cell-top">${isTechnical ? '<span class="quoted-bold">QUOTED</span>' : formatNumber(item.unitRate, 2)}</td>
        <td class="cell-right cell-top">${isTechnical ? '<span class="quoted-normal">QUOTED</span>' : formatNumber(item.amount, 0)}</td>
        <td class="cell-center cell-top cell-wrap">${escapeHtml(item.delivery)}</td>
      </tr>`;
    })
    .join("\n");

  const termRows = includedTerms
    .map((term: any) => {
      return `<tr class="term-row">
        <td class="term-name" colspan="2">${escapeHtml(term.termName)}</td>
        <td class="term-value" colspan="7">: ${escapeHtml(term.termValue)}</td>
      </tr>`;
    })
    .join("\n");

  const noteRows = exportNotes
    .map((note, index) => {
      return `<tr class="note-row">
        <td class="note-text" colspan="9">${index + 1}) ${escapeHtml(note)}</td>
      </tr>`;
    })
    .join("\n");

  // Revision label
  const revisionLabel = quotation.version && quotation.version > 0
    ? `REVISED ${typeLabel}<br><span style="font-size:10pt">Revision ${quotation.version}</span>`
    : typeLabel;

  // Footer format text
  const formatText = quotation.version && quotation.version > 0
    ? `FORMAT: QTN-Rev.${quotation.version}, Dated: ${formatDate(quotation.quotationDate)}`
    : `FORMAT: ${escapeHtml(quotation.quotationNo)}, Dated: ${formatDate(quotation.quotationDate)}`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: 210mm 320mm; /* taller than A4 portrait to fit all content on one page */
    margin: 8mm 8mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Calibri', 'Segoe UI', sans-serif;
    font-size: 9pt;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  table { border-collapse: collapse; width: 100%; }
  td, th { padding: 1px 3px; vertical-align: middle; }

  /* Hair borders (very thin, grey) */
  .hair { border: 0.5px solid #999; }
  .hair-all td { border: 0.5px solid #999; }

  /* ZONE 1: Type label */
  .type-label {
    font-size: 18pt;
    font-weight: bold;
    text-align: center;
    border: 1px solid #000;
    padding: 4px 10px;
    vertical-align: middle;
  }

  /* ZONE 2: Info block */
  .info-grid td {
    height: 13pt;
    font-size: 9pt;
    border: 0.5px solid #999;
    padding: 1px 4px;
    vertical-align: top;
  }
  .info-label { font-weight: bold; }
  .info-value { font-weight: normal; }
  .info-customer-name { font-weight: bold; font-size: 9pt; }
  .info-small { font-size: 8pt; }

  /* Quotation number block */
  .qtn-row td {
    font-size: 9pt;
    height: 13pt;
    padding: 1px 4px;
  }
  .qtn-row .qtn-label { font-weight: bold; text-align: left; }
  .qtn-row .qtn-value { font-weight: normal; text-align: left; }

  /* ZONE 3: Intro line */
  .intro-row td { font-size: 9pt; padding: 5px 0 4px 0; }

  /* ZONE 4: Table header — grey background */
  .table-header th {
    font-size: 9pt;
    font-weight: normal;
    text-align: center;
    height: 13pt;
    background-color: #D9D9D9 !important;
    border: 0.5px solid #999;
    padding: 1px 3px;
  }
  .table-header-sub th {
    font-size: 9pt;
    font-weight: bold;
    text-align: center;
    height: 13pt;
    background-color: #D9D9D9 !important;
    border: 0.5px solid #999;
    padding: 1px 3px;
  }

  /* Data rows */
  .data-row td {
    font-size: 9pt;
    border: 0.5px solid #999;
    padding: 2px 3px;
    line-height: 1.25;
  }
  .cell-center { text-align: center; }
  .cell-left { text-align: left; }
  .cell-right { text-align: right; }
  .cell-top { vertical-align: top; }
  .cell-wrap { white-space: normal; word-wrap: break-word; }
  .quoted-bold { font-weight: bold; }
  .quoted-normal { font-weight: normal; }

  /* Grand Total row */
  .grand-total td {
    font-size: 9pt;
    font-weight: bold;
    text-align: center;
    border: 0.5px solid #999;
    padding: 2px 3px;
    height: 15pt;
  }

  /* ZONE 6: Offer terms — tight spacing */
  .terms-header td {
    font-size: 9pt;
    font-weight: bold;
    text-align: left;
    text-decoration: underline;
    padding-top: 4px;
    padding-bottom: 1px;
  }
  .term-row td { font-size: 8.5pt; height: auto; padding: 0px 2px; line-height: 1.15; }
  .term-name { font-weight: bold; text-align: left; white-space: nowrap; padding-right: 0px; }
  .term-value { font-weight: normal; text-align: left; padding-left: 0px; }

  /* ZONE 7: Notes */
  .notes-header td {
    font-size: 9pt;
    font-weight: bold;
    text-align: left;
    text-decoration: underline;
    padding-top: 4px;
    padding-bottom: 1px;
  }
  .note-row td { font-size: 8pt; height: 10pt; padding: 0px 4px; text-align: left; line-height: 1.2; }

  /* Financial summary — compact */
  .fin-summary td {
    padding: 0px 4px;
    font-size: 8pt;
    border: none;
    line-height: 1.3;
  }
  .fin-summary .lbl { text-align: right; font-weight: normal; }
  .fin-summary .val { text-align: right; font-weight: bold; }

  /* ZONE 8: Footer */
  .footer-disclaimer td {
    font-size: 7.5pt;
    height: 12pt;
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
    padding: 2px 4px;
  }
  .footer-disclaimer .left {
    text-align: left;
    border-left: 1px solid #000;
  }
  .footer-disclaimer .right {
    text-align: right;
    border-right: 1px solid #000;
  }
  .footer-appreciation td {
    font-size: 7.5pt;
    text-align: center;
    height: 13pt;
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
    border-left: 1px solid #000;
    border-right: 1px solid #000;
    padding-top: 2px;
  }
  .footer-address td {
    font-size: 8pt;
    text-align: center;
    border: 1px solid #000;
    padding: 3px;
    line-height: 1.2;
    white-space: normal;
  }

  /* Column widths - 9 columns (A through I) matching Excel */
  col.col-a { width: 5%; }   /* Sr. no */
  col.col-b { width: 14%; }  /* Desc col 1 */
  col.col-c { width: 14%; }  /* Desc col 2 */
  col.col-d { width: 12%; }  /* Desc col 3 / Attention */
  col.col-e { width: 12%; }  /* Desc col 4 */
  col.col-f { width: 8%; }   /* Qty */
  col.col-g { width: 11%; }  /* Unit rate */
  col.col-h { width: 11%; }  /* Total */
  col.col-i { width: 13%; }  /* Delivery */

  /* Page break control */
  .keep-together { page-break-inside: avoid; }
</style>
</head>
<body>
<table>
  <colgroup>
    <col class="col-a">
    <col class="col-b">
    <col class="col-c">
    <col class="col-d">
    <col class="col-e">
    <col class="col-f">
    <col class="col-g">
    <col class="col-h">
    <col class="col-i">
  </colgroup>

  <!-- ============================================================ -->
  <!-- ROW 1-2: Logo (cols A-F) + Type Label (cols G-I)             -->
  <!-- ============================================================ -->
  <tr>
    <td colspan="2" rowspan="2" style="vertical-align:middle;padding:4px;">
      ${(company as any).isoLogoUrl
        ? `<img src="${(company as any).isoLogoUrl}" alt="ISO" style="max-height:45px;">`
        : `<span style="font-size:7pt;color:#666;">ISO 9001:2015 | ISO 14001:2015 | ISO 45001:2018</span>`
      }
    </td>
    <td colspan="4" rowspan="2" style="vertical-align:middle;text-align:center;padding:4px;">
      ${company.companyLogoUrl ? `<img src="${company.companyLogoUrl}" alt="Logo" style="max-height:50px;object-fit:contain;">` : `<span style="font-size:16pt;font-weight:bold">${escapeHtml(company.companyName)}</span>`}
    </td>
    <td colspan="3" rowspan="2" class="type-label">${revisionLabel}</td>
  </tr>
  <tr></tr>
  <tr><td colspan="9" style="height:4px;"></td></tr>

  <!-- ============================================================ -->
  <!-- ROW 4: Quotation Number / Dated labels (right side G-I)      -->
  <!-- ============================================================ -->
  <tr class="qtn-row">
    <td colspan="6"></td>
    <td class="qtn-label" colspan="2">Quotation Number :</td>
    <td class="qtn-label">Dated :</td>
  </tr>
  <!-- ROW 5: Quotation Number / Dated values -->
  <tr class="qtn-row">
    <td colspan="6"></td>
    <td class="qtn-value" colspan="2">${escapeHtml(quotation.quotationNo)}</td>
    <td class="qtn-value">${formatDate(quotation.quotationDate)}</td>
  </tr>

  <!-- ============================================================ -->
  <!-- ROW 6: Customer / Attention / Prepared by labels             -->
  <!-- ============================================================ -->
  <tr class="info-grid">
    <td class="info-label" colspan="3">Customer :</td>
    <td class="info-label" colspan="3">Attention :</td>
    <td class="info-value" colspan="3"><strong>Prepared by:</strong> ${escapeHtml(preparedByName)}</td>
  </tr>

  <!-- ROW 7: Customer name / Buyer name / Direct Line -->
  <tr class="info-grid">
    <td class="info-customer-name" colspan="3">M/s. ${escapeHtml(quotation.customer.name)}</td>
    <td class="info-value" colspan="3">${escapeHtml(buyerName)}</td>
    <td class="info-value" colspan="3">Direct Line : ${escapeHtml(preparedByPhone)}</td>
  </tr>

  <!-- ROW 8: Customer address line 1 / Buyer designation / Enquiry Reference -->
  <tr class="info-grid">
    <td class="info-value" colspan="3">${escapeHtml(customerAddressLines[0] || "")}</td>
    <td class="info-value" colspan="3">${escapeHtml(buyerDesignation)}</td>
    <td class="info-value" colspan="3"><strong>Enquiry Reference :</strong>${enquiryRef ? "" : ""}</td>
  </tr>

  <!-- ROW 9: Customer address line 2 / Buyer email / Enquiry number -->
  <tr class="info-grid">
    <td class="info-value" colspan="3">${escapeHtml(customerAddressLines[1] || "")}</td>
    <td class="info-value" colspan="3">${escapeHtml(buyerEmail)}</td>
    <td class="info-small" colspan="3">${escapeHtml(enquiryRef)}</td>
  </tr>

  <!-- ROW 10: Customer address line 3 / Buyer contact / Enquiry dated -->
  <tr class="info-grid">
    <td class="info-value" colspan="3">${escapeHtml(customerAddressLines[2] || "")}</td>
    <td class="info-value" colspan="3">${escapeHtml(buyerContact)}</td>
    <td class="info-value" colspan="3">${enquiryDate ? `<strong>Dated:</strong> ${formatDate(enquiryDate)}` : ""}</td>
  </tr>

  <!-- ============================================================ -->
  <!-- ROW 12: Intro line                                           -->
  <!-- ============================================================ -->
  <tr class="intro-row">
    <td colspan="9">In response to your inquiry, we are pleased to quote as follows:</td>
  </tr>

  <!-- ============================================================ -->
  <!-- ROW 13-14: Item table header (2 rows with grey background)   -->
  <!-- ============================================================ -->
  <tr class="table-header">
    <th>Sr.</th>
    <th colspan="4">Item Desciption</th>
    <th>Qty</th>
    <th>Unit rate</th>
    <th>Total</th>
    <th>Delivery</th>
  </tr>
  <tr class="table-header-sub">
    <th>no.</th>
    <th colspan="4"></th>
    <th>${escapeHtml(quotation.items[0]?.uom || "MTR")}</th>
    <th>${escapeHtml(quotation.currency)}</th>
    <th>${escapeHtml(quotation.currency)}</th>
    <th>Ex-Works</th>
  </tr>

  <!-- ============================================================ -->
  <!-- Data rows                                                    -->
  <!-- ============================================================ -->
  ${itemRows}

  <!-- ============================================================ -->
  <!-- Grand Total row                                              -->
  <!-- ============================================================ -->
  ${!isTechnical ? (() => {
    const gt = parseFloat(String((quotation as any).grandTotal)) || totalAmount;
    return `<tr><td colspan="9" style="font-size:8pt;padding:4px 6px 2px 6px;text-align:left;border:0.5px solid #999;">
      <strong>Amount in Words:</strong> ${escapeHtml(numberToWords(gt, quotation.currency))}
    </td></tr>`;
  })() : ""}

  <!-- ============================================================ -->
  <!-- OFFER TERMS                                                  -->
  <!-- ============================================================ -->
  <tr class="terms-header">
    <td colspan="9">OFFER TERMS:</td>
  </tr>
  ${termRows}

  <!-- ============================================================ -->
  <!-- NOTES                                                        -->
  <!-- ============================================================ -->
  <tr class="notes-header">
    <td colspan="9">NOTES:</td>
  </tr>
  ${noteRows}

  <!-- Spacer -->
  <tr><td colspan="9" style="height:8px;"></td></tr>

  <!-- ============================================================ -->
  <!-- FOOTER                                                       -->
  <!-- ============================================================ -->
  <tr class="footer-disclaimer">
    <td colspan="5" class="left">This is a computer generated document hence not signed.</td>
    <td colspan="4" class="right">${escapeHtml(formatText)}</td>
  </tr>
  <tr class="footer-appreciation">
    <td colspan="9">YOUR ORDER WILL BE GREATLY APPRECIATED AND WILL RECEIVE OUR PROMPT AND CAREFUL ATTENTION.</td>
  </tr>
  <tr class="footer-address">
    <td colspan="9"><b>Regd. Address: ${escapeHtml(footerAddress)}. ${escapeHtml(footerContact)}</b></td>
  </tr>
</table>
</body>
</html>`;
}
