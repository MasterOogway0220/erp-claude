// Standard Quotation PDF Template — Landscape A4, 16-column table
// Matches PIPES_QUOTATION_FORMAT > RFQ sheet exactly

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
  } | null;
  preparedBy?: { name?: string; email?: string } | null;
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

export function generateStandardQuotationHtml(
  quotation: QuotationData,
  company: CompanyInfo
): string {
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
    company.telephoneNo ? `Tel. ${company.telephoneNo}` : null,
    company.email ? `Email: ${company.email}` : null,
    company.website ? `Web: ${company.website}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const itemRows = quotation.items
    .map((item: any) => {
      return `<tr class="data-row">
        <td class="cell-center bl-med">${item.sNo}</td>
        <td class="cell-center" colspan="2">${escapeHtml(item.product)}</td>
        <td class="cell-center">${escapeHtml(item.material)}</td>
        <td class="cell-center">${escapeHtml(item.additionalSpec)}</td>
        <td class="cell-center">${item.sizeNPS ? formatNumber(item.sizeNPS, 0) : escapeHtml(item.sizeLabel)}</td>
        <td class="cell-center">${item.od ? formatNumber(item.od, 1) : ""}</td>
        <td class="cell-center">${escapeHtml(item.schedule) || ""}</td>
        <td class="cell-center">${item.wt ? formatNumber(item.wt, 2) : ""}</td>
        <td class="cell-center">${escapeHtml(item.length)}</td>
        <td class="cell-center">${escapeHtml(item.ends)}</td>
        <td class="cell-center">${formatNumber(item.quantity, 0)}</td>
        <td class="cell-center green-bg">${formatNumber(item.unitRate, 2)}</td>
        <td class="cell-center">${formatNumber(item.amount, 0)}</td>
        <td class="cell-center">${escapeHtml(item.delivery)}</td>
        <td class="cell-center br-med">${escapeHtml(item.remark) || escapeHtml(item.materialCode?.code)}</td>
      </tr>`;
    })
    .join("\n");

  const termItems = includedTerms
    .map((term: any, index: number) => {
      return `<div class="term-item">
        <span class="term-num">${index + 1}</span>
        <span class="term-name">${escapeHtml(term.termName)}</span>
        <span class="term-value">: ${escapeHtml(term.termValue)}</span>
      </div>`;
    })
    .join("\n");

  const noteItems = exportNotes
    .map((note, index) => {
      return `<div class="note-item">
        <span class="note-num">${index + 1})</span>
        <span class="note-text">${escapeHtml(note)}</span>
      </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: A4 landscape;
    margin: 5mm;
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

  /* Border utilities */
  .bt-med { border-top: 2px solid #000; }
  .bb-med { border-bottom: 2px solid #000; }
  .bl-med { border-left: 2px solid #000; }
  .br-med { border-right: 2px solid #000; }
  .bt-thin { border-top: 1px solid #000; }
  .bb-thin { border-bottom: 1px solid #000; }
  .bl-thin { border-left: 1px solid #000; }
  .br-thin { border-right: 1px solid #000; }
  .b-med { border: 2px solid #000; }

  /* ZONE 1: Letterhead */
  .letterhead { height: 40px; }
  .letterhead td { vertical-align: middle; }
  .logo-cell { width: 150px; }
  .logo-cell img { max-width: 140px; max-height: 36px; object-fit: contain; }
  .company-name {
    font-size: 16pt;
    font-weight: bold;
    text-align: center;
  }

  /* ZONE 2: Header info grid */
  .header-grid td { height: 17pt; font-size: 10pt; vertical-align: middle; }
  .hdr-label { text-align: right; padding-right: 4px; font-weight: normal; color: #333; }
  .hdr-value { text-align: left; padding-left: 4px; font-weight: normal; }
  .hdr-value-right { text-align: left; padding-left: 4px; color: #444; }
  .hdr-label-right { text-align: right; padding-right: 4px; color: #444; }

  /* ZONE 3: Title */
  .title-row td {
    font-size: 11pt;
    font-weight: bold;
    text-align: center;
    height: 18pt;
    border: 2px solid #000;
  }

  /* ZONE 4: Table header */
  .table-header th {
    font-size: 10pt;
    font-weight: bold;
    text-align: center;
    height: 30pt;
    border-top: 2px solid #000;
    border-bottom: 1px solid #000;
    border-left: 1px solid #000;
    border-right: 1px solid #000;
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: normal;
    padding: 2px 2px;
    line-height: 1.2;
  }
  .table-header th:first-child { border-left: 2px solid #000; }
  .table-header th:last-child { border-right: 2px solid #000; }

  /* Green highlight for Unit Rate column */
  .green-bg { background-color: #92D050 !important; }

  /* ZONE 5: Data rows */
  .data-row td {
    font-size: 10pt;
    text-align: center;
    height: 18pt;
    border: 1px solid #000;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 1px 3px;
  }
  .cell-center { text-align: center; }

  /* ZONE 6: Total row */
  .total-row td {
    font-size: 11pt;
    font-weight: bold;
    text-align: center;
    height: 20pt;
    border-top: 1px solid #000;
    border-bottom: 2px solid #000;
    border-left: 1px solid #000;
    border-right: 1px solid #000;
  }
  .total-row td:first-child { border-left: 2px solid #000; }
  .total-row td:last-child { border-right: 2px solid #000; }

  /* ZONE 7-9: Terms + Notes + Footer — single block, avoid page-break splitting */
  .terms-notes-footer {
    break-inside: avoid;
    page-break-inside: avoid;
    margin-top: 2px;
  }
  .terms-section {
    border-top: 2px solid #000;
    border-left: 2px solid #000;
    padding: 2px 6px;
  }
  .terms-title {
    font-size: 8.5pt;
    font-weight: bold;
    margin-bottom: 0;
  }
  .term-item {
    font-size: 8.5pt;
    line-height: 1.25;
    display: flex;
    gap: 3px;
  }
  .term-num { min-width: 18px; text-align: center; }
  .term-name { font-weight: bold; white-space: nowrap; }
  .term-value { font-weight: normal; }

  .notes-section {
    margin-top: 1px;
    padding: 0 6px;
  }
  .notes-title {
    font-size: 8.5pt;
    font-weight: bold;
    margin-bottom: 0;
    border-left: 2px solid #000;
    padding-left: 6px;
  }
  .note-item {
    font-size: 7.5pt;
    line-height: 1.25;
    display: flex;
    gap: 2px;
    padding-left: 6px;
  }
  .note-num { min-width: 18px; text-align: right; padding-right: 2px; flex-shrink: 0; }
  .note-text { text-align: left; }

  .footer-section {
    margin-top: 2px;
  }
  .footer-disclaimer {
    font-size: 6.5pt;
    color: #666;
    display: flex;
    justify-content: space-between;
    padding: 0;
  }
  .footer-appreciation {
    font-size: 7.5pt;
    text-align: center;
    padding: 1px 0;
  }
  .footer-address {
    font-size: 8pt;
    text-align: center;
    padding: 0;
  }

  /* Column widths - 16 columns (A through P) */
  col.col-sn    { width: 3%; }
  col.col-prod1 { width: 5.5%; }
  col.col-prod2 { width: 5.5%; }
  col.col-mat   { width: 10%; }
  col.col-spec  { width: 11%; }
  col.col-nps   { width: 5%; }
  col.col-od    { width: 5%; }
  col.col-sch   { width: 5%; }
  col.col-wt    { width: 5%; }
  col.col-len   { width: 6%; }
  col.col-ends  { width: 4%; }
  col.col-qty   { width: 6%; }
  col.col-rate  { width: 7%; }
  col.col-amt   { width: 8%; }
  col.col-del   { width: 8%; }
  col.col-rmk   { width: 11%; }
</style>
</head>
<body>
<table>
  <colgroup>
    <col class="col-sn">
    <col class="col-prod1">
    <col class="col-prod2">
    <col class="col-mat">
    <col class="col-spec">
    <col class="col-nps">
    <col class="col-od">
    <col class="col-sch">
    <col class="col-wt">
    <col class="col-len">
    <col class="col-ends">
    <col class="col-qty">
    <col class="col-rate">
    <col class="col-amt">
    <col class="col-del">
    <col class="col-rmk">
  </colgroup>

  <!-- ZONE 1: Letterhead -->
  <tr class="letterhead">
    <td colspan="3" rowspan="2" class="logo-cell">
      ${company.companyLogoUrl ? `<img src="${company.companyLogoUrl}" alt="Logo">` : `<span style="font-size:16pt;font-weight:bold">${escapeHtml(company.companyName)}</span>`}
    </td>
    <td colspan="13" class="company-name">${escapeHtml(company.companyName)}</td>
  </tr>
  <tr class="letterhead"><td colspan="13"></td></tr>

  <!-- ZONE 2: Header info grid -->
  <!-- Row 6 -->
  <tr class="header-grid">
    <td class="hdr-label bt-med" colspan="2">Customer :</td>
    <td class="hdr-value bt-med" colspan="5">${escapeHtml(quotation.customer.name)}</td>
    <td class="hdr-label bt-med" colspan="2">Enquiry Reference :</td>
    <td class="hdr-value bt-med" colspan="3">${quotation.enquiry ? escapeHtml(quotation.enquiry.enquiryNo) : ""}</td>
    <td class="hdr-label-right bt-med" colspan="2">Quotation No. :</td>
    <td class="hdr-value-right bt-med" colspan="2">${escapeHtml(quotation.quotationNo)}</td>
  </tr>
  <!-- Row 7 -->
  <tr class="header-grid">
    <td class="hdr-label" colspan="2">Address :</td>
    <td class="hdr-value" colspan="5">${escapeHtml(quotation.customer.addressLine1)}${quotation.customer.city ? `, ${escapeHtml(quotation.customer.city)}` : ""}</td>
    <td class="hdr-label" colspan="2">Date :</td>
    <td class="hdr-value" colspan="3">${quotation.enquiry?.enquiryDate ? formatDate(quotation.enquiry.enquiryDate) : ""}</td>
    <td class="hdr-label-right" colspan="2">Date :</td>
    <td class="hdr-value-right" colspan="2">${formatDate(quotation.quotationDate)}</td>
  </tr>
  <!-- Row 8 -->
  <tr class="header-grid">
    <td class="hdr-label" colspan="2">Country :</td>
    <td class="hdr-value" colspan="5">${escapeHtml(quotation.customer.country)}</td>
    <td class="hdr-label" colspan="2"></td>
    <td class="hdr-value" colspan="3"></td>
    <td class="hdr-label-right" colspan="2">Valid upto :</td>
    <td class="hdr-value-right" colspan="2">${formatDate(quotation.validUpto)}</td>
  </tr>
  <!-- Row 9 -->
  <tr class="header-grid">
    <td class="hdr-label" colspan="2">Attn. :</td>
    <td class="hdr-value" colspan="5">${escapeHtml(quotation.buyer?.buyerName || quotation.customer.contactPerson)}</td>
    <td class="hdr-label" colspan="2">Designation :</td>
    <td class="hdr-value" colspan="3">${escapeHtml(quotation.buyer?.designation)}</td>
    <td class="hdr-label-right" colspan="2">Contact :</td>
    <td class="hdr-value-right" colspan="2">${escapeHtml(quotation.preparedBy?.name)}</td>
  </tr>
  <!-- Row 10 -->
  <tr class="header-grid">
    <td class="hdr-label bb-med" colspan="2">Email :</td>
    <td class="hdr-value bb-med" colspan="5">${escapeHtml(quotation.buyer?.email || quotation.customer.email)}</td>
    <td class="hdr-label bb-med" colspan="2">Contact :</td>
    <td class="hdr-value bb-med" colspan="3">${escapeHtml(quotation.buyer?.mobile || quotation.buyer?.telephone || quotation.customer.phone)}</td>
    <td class="hdr-label-right bb-med" colspan="2">Email :</td>
    <td class="hdr-value-right bb-med" colspan="2">${escapeHtml(quotation.preparedBy?.email)}</td>
  </tr>

  <!-- ZONE 3: Title -->
  <tr class="title-row">
    <td colspan="16">${(quotation.version ?? 0) > 0 ? `Revised Quotation Sheet — Revision ${quotation.version}` : "Quotation Sheet"}</td>
  </tr>

  <!-- ZONE 4: Table header -->
  <tr class="table-header">
    <th style="border-left:2px solid #000">S/N</th>
    <th colspan="2">Product</th>
    <th>Material</th>
    <th>Additional Spec.</th>
    <th>Size<br>(NPS)</th>
    <th>OD<br>(mm)</th>
    <th>Schedule</th>
    <th>W.T.<br>(mm)</th>
    <th>Length<br>(Mtr.)</th>
    <th>Ends</th>
    <th>Qty<br>(Mtr.)</th>
    <th class="green-bg">Unit Rate<br>${escapeHtml(quotation.currency)}/Mtr</th>
    <th>Amount<br>(${escapeHtml(quotation.currency)}.)</th>
    <th>Delivery<br>(Ex-works)</th>
    <th style="border-right:2px solid #000">Remark/<br>Material Code</th>
  </tr>

  <!-- ZONE 5: Data rows -->
  ${itemRows}

  <!-- ZONE 6: Total row -->
  <tr class="total-row">
    <td colspan="11" class="bl-med" style="text-align:center">Total</td>
    <td>${formatNumber(totalQty, 0)}</td>
    <td class="green-bg"></td>
    <td>${formatNumber(totalAmount, 0)}</td>
    <td></td>
    <td class="br-med"></td>
  </tr>

  <!-- Amount in Words -->
  <tr>
    <td colspan="16" class="bl-med br-med" style="font-size:10pt;padding:4px 6px;text-align:left;">
      <strong>Amount in Words:</strong> ${escapeHtml(numberToWords(totalAmount, quotation.currency))}
    </td>
  </tr>
</table>

<!-- ZONE 7-9: Terms + Notes + Footer — one block, never split -->
<div class="terms-notes-footer">
  <div class="terms-section">
    <div class="terms-title">OFFER TERMS:</div>
    ${termItems}
  </div>

  <div class="notes-section">
    <div class="notes-title">NOTES:</div>
    ${noteItems}
  </div>

  ${(quotation.version ?? 0) > 0 ? `<div style="font-size:8pt;text-align:center;font-weight:bold;padding:3px;color:#c00;">This quotation supersedes all previous revisions.</div>` : ""}

  <div class="footer-section">
    <div class="footer-disclaimer">
      <span>This is a computer generated document hence not signed.</span>
      <span>FORMAT: QTN-Rev.2, Dated: 19/12/2012</span>
    </div>
    <div class="footer-appreciation">YOUR ORDER WILL BE GREATLY APPRECIATED AND WILL RECEIVE OUR PROMPT AND CAREFUL ATTENTION.</div>
    <div class="footer-address">Regd. Address: ${escapeHtml(footerAddress)}. ${escapeHtml(footerContact)}</div>
  </div>
</div>

</body>
</html>`;
}
