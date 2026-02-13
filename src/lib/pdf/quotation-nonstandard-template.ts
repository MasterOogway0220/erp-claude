// Non-Standard Quotation PDF Template — Portrait A4, 9-column table
// Matches EXPORT_QUOTATION_FORMAT > COMMERCIAL / TECHNICAL sheets exactly
// Generates COMMERCIAL (with prices) or TECHNICAL (with "QUOTED") variant

import { numberToWords } from "../amount-in-words";

interface CompanyInfo {
  companyName: string;
  companyLogoUrl?: string | null;
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
  enquiry?: {
    enquiryNo?: string;
    enquiryDate?: string | Date;
    mode?: string;
  } | null;
  preparedBy?: { name?: string; email?: string; phone?: string } | null;
  buyer?: {
    buyerName?: string | null;
    designation?: string | null;
    email?: string | null;
    mobile?: string | null;
    telephone?: string | null;
  } | null;
  items: any[];
  terms: any[];
}

const exportNotes = [
  "Prices are subject to review if items are deleted or if quantities are changed.",
  "This quotation is subject to confirmation at the time of order placement.",
  "Invoicing shall be based on the actual quantity supplied at the agreed unit rate.",
  "Shipping date will be calculated based on the number of business days after receipt of the techno-commercial Purchase Order (PO).",
  "Supply shall be made as close as possible to the requested quantity in the fixed lengths indicated.",
  "Once an order is placed, it cannot be cancelled under any circumstances.",
  "The quoted specification complies with the standard practice of the specification, without supplementary requirements (unless otherwise specifically stated in the offer).",
  "Reduction in quantity after placement of order will not be accepted. Any increase in quantity will be subject to our acceptance.",
  "In case of any changes in Government duties, taxes, or policies, the rates are liable to revision.",
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
    return nl2br(item.itemDescription);
  }

  const lines: string[] = [];

  if (item.materialCode?.code) {
    lines.push(`MATERIAL CODE: ${item.materialCode.code}`);
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
  variant: "COMMERCIAL" | "TECHNICAL"
): string {
  const isTechnical = variant === "TECHNICAL";

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

  const itemRows = quotation.items
    .map((item: any) => {
      const desc = buildItemDescription(item);
      return `<tr class="data-row">
        <td class="cell-center cell-top">${item.sNo}</td>
        <td class="cell-left cell-top cell-wrap" colspan="4">${desc}</td>
        <td class="cell-left cell-top cell-wrap">${formatNumber(item.quantity, 0)}</td>
        <td class="cell-right cell-top">${isTechnical ? '<span class="quoted-bold">QUOTED</span>' : formatNumber(item.unitRate, 2)}</td>
        <td class="cell-right cell-top">${isTechnical ? '<span class="quoted-normal">QUOTED</span>' : formatNumber(item.amount, 0)}</td>
        <td class="cell-center cell-top cell-wrap">${escapeHtml(item.delivery)}</td>
      </tr>`;
    })
    .join("\n");

  // Non-standard terms include "Currency" as first extra term
  const currencyTerm = `<tr class="term-row">
    <td class="term-name" colspan="3">Currency</td>
    <td class="term-value" colspan="6">: ${escapeHtml(quotation.currency)} (${quotation.currency === "USD" ? "$" : quotation.currency === "EUR" ? "€" : quotation.currency})</td>
  </tr>`;

  const termRows = includedTerms
    .map((term: any) => {
      return `<tr class="term-row">
        <td class="term-name" colspan="3">${escapeHtml(term.termName)}</td>
        <td class="term-value" colspan="6">: ${escapeHtml(term.termValue)}</td>
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

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: A4 portrait;
    margin: 10mm 8mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Calibri', 'Segoe UI', sans-serif;
    font-size: 10pt;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  table { border-collapse: collapse; width: 100%; }
  td, th { padding: 1px 3px; vertical-align: middle; }

  /* Hair borders (very thin, grey) — Non-Standard default */
  .hair { border: 0.5px solid #999; }
  .hair-all td { border: 0.5px solid #999; }
  .hair-top { border-top: 0.5px solid #999; }
  .hair-bottom { border-bottom: 0.5px solid #999; }
  .hair-left { border-left: 0.5px solid #999; }
  .hair-right { border-right: 0.5px solid #999; }

  .thin { border: 1px solid #000; }
  .thin-top { border-top: 1px solid #000; }
  .thin-bottom { border-bottom: 1px solid #000; }

  /* ZONE 1: Type label */
  .type-label {
    font-size: 20pt;
    font-weight: bold;
    text-align: center;
    border: 1px solid #000;
    padding: 6px 12px;
    vertical-align: middle;
  }

  /* ZONE 2: Info block */
  .info-grid td {
    height: 13.5pt;
    font-size: 10pt;
    border: 0.5px solid #999;
    padding: 1px 4px;
  }
  .info-label { font-weight: bold; }
  .info-value { font-weight: normal; }
  .info-customer-name { font-weight: bold; font-size: 10pt; }
  .info-small { font-size: 9pt; }

  /* Quotation number block */
  .qtn-block td {
    border: 0.5px solid #999;
    font-size: 10pt;
    height: 13.5pt;
    padding: 1px 4px;
  }

  /* ZONE 3: Intro line */
  .intro-row td { font-size: 10pt; padding: 8px 0 6px 0; }

  /* ZONE 4: Table header */
  .table-header th {
    font-size: 10pt;
    font-weight: normal;
    text-align: center;
    height: 15pt;
    background-color: #D9D9D9 !important;
    border: 0.5px solid #999;
    padding: 2px 3px;
  }
  .table-header-sub th {
    font-size: 10pt;
    font-weight: bold;
    text-align: center;
    height: 15pt;
    background-color: #D9D9D9 !important;
    border: 0.5px solid #999;
    padding: 2px 3px;
  }

  /* Data rows */
  .data-row td {
    font-size: 10pt;
    border: 0.5px solid #999;
    padding: 3px 4px;
    line-height: 1.35;
  }
  .cell-center { text-align: center; }
  .cell-left { text-align: left; }
  .cell-right { text-align: right; }
  .cell-top { vertical-align: top; }
  .cell-wrap { white-space: normal; word-wrap: break-word; }
  .quoted-bold { font-weight: bold; }
  .quoted-normal { font-weight: normal; }

  /* Total row */
  .grand-total td {
    font-size: 10pt;
    font-weight: bold;
    text-align: center;
    border: 0.5px solid #999;
    padding: 3px 4px;
    height: 18pt;
  }

  /* ZONE 6: Offer terms */
  .terms-header td {
    font-size: 10pt;
    font-weight: bold;
    text-align: left;
    padding-top: 10px;
    padding-bottom: 3px;
  }
  .term-row td { font-size: 10pt; height: 13.5pt; padding: 0 4px; }
  .term-name { font-weight: bold; text-align: left; }
  .term-value { font-weight: normal; text-align: left; }

  /* ZONE 7: Notes */
  .notes-header td {
    font-size: 10pt;
    font-weight: bold;
    text-align: left;
    padding-top: 10px;
    padding-bottom: 3px;
  }
  .note-row td { font-size: 9pt; height: 13.5pt; padding: 0 4px; text-align: left; }

  /* ZONE 8: Footer */
  .footer-disclaimer td {
    font-size: 8pt;
    height: 14pt;
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
    font-size: 8pt;
    text-align: center;
    height: 16pt;
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
    border-left: 1px solid #000;
    border-right: 1px solid #000;
    padding-top: 3px;
  }
  .footer-address td {
    font-size: 9pt;
    text-align: center;
    border: 1px solid #000;
    padding: 4px;
    line-height: 1.3;
    white-space: normal;
  }

  /* Column widths - 9 columns (A through I) */
  col.col-sr     { width: 5%; }
  col.col-desc1  { width: 16%; }
  col.col-desc2  { width: 17%; }
  col.col-desc3  { width: 12%; }
  col.col-desc4  { width: 12%; }
  col.col-qty    { width: 8%; }
  col.col-rate   { width: 11%; }
  col.col-total  { width: 12%; }
  col.col-deliv  { width: 13%; }

  /* Page break control */
  .keep-together { page-break-inside: avoid; }
</style>
</head>
<body>
<table>
  <colgroup>
    <col class="col-sr">
    <col class="col-desc1">
    <col class="col-desc2">
    <col class="col-desc3">
    <col class="col-desc4">
    <col class="col-qty">
    <col class="col-rate">
    <col class="col-total">
    <col class="col-deliv">
  </colgroup>

  <!-- ZONE 1: Type label + Logo -->
  <tr>
    <td colspan="6" rowspan="2" style="vertical-align:middle;padding:4px;">
      ${company.companyLogoUrl ? `<img src="${company.companyLogoUrl}" alt="Logo" style="max-width:200px;max-height:50px;object-fit:contain;">` : `<span style="font-size:16pt;font-weight:bold">${escapeHtml(company.companyName)}</span>`}
    </td>
    <td colspan="3" rowspan="2" class="type-label">${variant}</td>
  </tr>
  <tr></tr>
  <tr><td colspan="9" style="height:4px;"></td></tr>

  <!-- Quotation Number block (top right) -->
  <tr class="qtn-block">
    <td colspan="6"></td>
    <td class="info-label">Quotation Number:</td>
    <td class="info-value" colspan="2">${escapeHtml(quotation.quotationNo)}</td>
  </tr>
  <tr class="qtn-block">
    <td colspan="6"></td>
    <td class="info-label">Dated:</td>
    <td class="info-value" colspan="2">${formatDate(quotation.quotationDate)}</td>
  </tr>
  <tr><td colspan="9" style="height:4px;"></td></tr>

  <!-- ZONE 2: Customer / Buyer / Prepared By info grid -->
  <tr class="info-grid">
    <td class="info-label" colspan="2">Customer:</td>
    <td class="info-label" colspan="2">Attention:</td>
    <td class="info-value" colspan="5">Prepared by: ${escapeHtml(quotation.preparedBy?.name)}</td>
  </tr>
  <tr class="info-grid">
    <td class="info-customer-name" colspan="2">M/s. ${escapeHtml(quotation.customer.name)}</td>
    <td class="info-value" colspan="2">${escapeHtml(quotation.buyer?.buyerName || quotation.customer.contactPerson)}</td>
    <td class="info-value" colspan="5">Direct Line: ${escapeHtml(quotation.preparedBy?.phone) || ""}</td>
  </tr>
  <tr class="info-grid">
    <td class="info-value" colspan="2">${escapeHtml(quotation.customer.addressLine1)}</td>
    <td class="info-value" colspan="2">${escapeHtml(quotation.buyer?.designation)}</td>
    <td class="info-value" colspan="5">Enquiry Reference: ${quotation.enquiry ? escapeHtml(quotation.enquiry.enquiryNo) : ""}</td>
  </tr>
  <tr class="info-grid">
    <td class="info-value" colspan="2">${[quotation.customer.city, quotation.customer.state, quotation.customer.pincode].filter(Boolean).join(", ")}</td>
    <td class="info-value" colspan="2">${escapeHtml(quotation.buyer?.email || quotation.customer.email)}</td>
    <td class="info-small" colspan="5">${quotation.enquiry ? `Client Ref No. - ${escapeHtml(quotation.enquiry.enquiryNo)}` : ""}</td>
  </tr>
  <tr class="info-grid">
    <td class="info-value" colspan="2">${escapeHtml(quotation.customer.country)}</td>
    <td class="info-value" colspan="2">${escapeHtml(quotation.buyer?.mobile || quotation.buyer?.telephone || quotation.customer.phone)}</td>
    <td class="info-small" colspan="5">Dated: ${formatDate(quotation.quotationDate)}</td>
  </tr>

  <!-- ZONE 3: Intro line -->
  <tr class="intro-row">
    <td colspan="9">In response to your inquiry, we are pleased to quote as follows:</td>
  </tr>

  <!-- ZONE 4: Item table header (2 rows) -->
  <tr class="table-header">
    <th>Sr.</th>
    <th colspan="4">Item Description</th>
    <th>Qty</th>
    <th>Unit rate</th>
    <th>Total</th>
    <th>Delivery</th>
  </tr>
  <tr class="table-header-sub">
    <th>no.</th>
    <th colspan="4"></th>
    <th>MTR</th>
    <th>${escapeHtml(quotation.currency)}</th>
    <th>${escapeHtml(quotation.currency)}</th>
    <th>Ex-Works</th>
  </tr>

  <!-- ZONE 5: Data rows -->
  ${itemRows}

  <!-- Grand Total row -->
  <tr class="grand-total">
    <td colspan="5">Grand Total</td>
    <td>${formatNumber(totalQty, 0)}</td>
    <td></td>
    <td>${isTechnical ? "" : formatNumber(totalAmount, 0)}</td>
    <td></td>
  </tr>

  ${!isTechnical ? `<!-- Amount in Words -->
  <tr>
    <td colspan="9" style="font-size:10pt;padding:4px 6px;text-align:left;border:0.5px solid #999;">
      <strong>Amount in Words:</strong> ${escapeHtml(numberToWords(totalAmount, quotation.currency))}
    </td>
  </tr>` : ""}

  <!-- ZONE 6: Offer Terms -->
  <tr class="terms-header">
    <td colspan="9">OFFER TERMS:</td>
  </tr>
  ${currencyTerm}
  ${termRows}

  <!-- ZONE 7: Notes -->
  <tr class="notes-header">
    <td colspan="9">NOTES:</td>
  </tr>
  ${noteRows}

  <!-- Spacer -->
  <tr><td colspan="9" style="height:8px;"></td></tr>

  <!-- ZONE 8: Footer -->
  <tr class="footer-disclaimer">
    <td colspan="5" class="left">This is a computer generated document hence not signed.</td>
    <td colspan="4" class="right">FORMAT: QTN-Rev.2, Dated: 19/12/2012</td>
  </tr>
  <tr class="footer-appreciation">
    <td colspan="9">YOUR ORDER WILL BE GREATLY APPRECIATED AND WILL RECEIVE OUR PROMPT AND CAREFUL ATTENTION.</td>
  </tr>
  <tr class="footer-address">
    <td colspan="9">Regd. Address: ${escapeHtml(footerAddress)}.<br>${escapeHtml(footerContact)}</td>
  </tr>
</table>
</body>
</html>`;
}
