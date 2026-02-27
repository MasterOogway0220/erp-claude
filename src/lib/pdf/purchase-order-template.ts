// Purchase Order PDF Template — Landscape A4
// Matches quotation PDF pattern for NPS Piping Solutions

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

interface POData {
  poNo: string;
  poDate: string | Date;
  version: number;
  currency: string;
  deliveryDate?: string | Date | null;
  specialRequirements?: string | null;
  paymentTerms?: string | null;
  termsAndConditions?: string | null;
  totalAmount: number;
  vendor: {
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
    gstNo?: string | null;
  };
  purchaseRequisition?: { prNo: string } | null;
  salesOrder?: { soNo: string } | null;
  approvedBy?: { name: string } | null;
  approvalDate?: string | Date | null;
  items: any[];
}

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

export function generatePurchaseOrderHtml(
  po: POData,
  company: CompanyInfo
): string {
  const totalQty = po.items.reduce(
    (sum: number, item: any) => sum + (parseFloat(item.quantity) || 0),
    0
  );
  const totalAmount = Number(po.totalAmount) || 0;

  const vendorAddress = [
    po.vendor.addressLine1,
    po.vendor.addressLine2,
    po.vendor.city,
    po.vendor.state ? `${po.vendor.state} - ${po.vendor.pincode || ""}` : po.vendor.pincode,
    po.vendor.country,
  ]
    .filter(Boolean)
    .join(", ");

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
    .join(" | ");

  const itemRows = po.items
    .map((item: any) => {
      return `<tr class="data-row">
        <td class="cell-center bl-med">${item.sNo}</td>
        <td class="cell-center">${escapeHtml(item.product)}</td>
        <td class="cell-center">${escapeHtml(item.material)}</td>
        <td class="cell-center">${escapeHtml(item.additionalSpec)}</td>
        <td class="cell-center">${escapeHtml(item.sizeLabel)}</td>
        <td class="cell-center">${formatNumber(item.quantity, 3)}</td>
        <td class="cell-center">${formatNumber(item.unitRate, 2)}</td>
        <td class="cell-center">${formatNumber(item.amount, 2)}</td>
        <td class="cell-center br-med">${item.deliveryDate ? formatDate(item.deliveryDate) : formatDate(po.deliveryDate)}</td>
      </tr>`;
    })
    .join("\n");

  const tcLines = po.termsAndConditions
    ? po.termsAndConditions.split("\n").filter((l: string) => l.trim())
    : [];
  const tcItems = tcLines
    .map((line: string, i: number) => {
      return `<div class="term-item">
        <span class="term-num">${i + 1}</span>
        <span class="term-value">${escapeHtml(line.trim())}</span>
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

  .bt-med { border-top: 2px solid #000; }
  .bb-med { border-bottom: 2px solid #000; }
  .bl-med { border-left: 2px solid #000; }
  .br-med { border-right: 2px solid #000; }

  .letterhead { height: 40px; }
  .letterhead td { vertical-align: middle; }
  .logo-cell { width: 150px; }
  .logo-cell img { max-width: 140px; max-height: 36px; object-fit: contain; }
  .company-name {
    font-size: 16pt;
    font-weight: bold;
    text-align: center;
  }

  .header-grid td { height: 17pt; font-size: 10pt; vertical-align: middle; }
  .hdr-label { text-align: right; padding-right: 4px; font-weight: normal; color: #333; }
  .hdr-value { text-align: left; padding-left: 4px; font-weight: normal; }

  .title-row td {
    font-size: 12pt;
    font-weight: bold;
    text-align: center;
    height: 22pt;
    border: 2px solid #000;
    background-color: #E8F0FE;
  }

  .table-header th {
    font-size: 10pt;
    font-weight: bold;
    text-align: center;
    height: 30pt;
    border-top: 2px solid #000;
    border-bottom: 1px solid #000;
    border-left: 1px solid #000;
    border-right: 1px solid #000;
    background-color: #f0f0f0;
    word-wrap: break-word;
    padding: 2px 2px;
    line-height: 1.2;
  }
  .table-header th:first-child { border-left: 2px solid #000; }
  .table-header th:last-child { border-right: 2px solid #000; }

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

  .terms-footer {
    break-inside: avoid;
    page-break-inside: avoid;
    margin-top: 2px;
  }
  .terms-section {
    border: 2px solid #000;
    border-bottom: none;
    padding: 4px 6px;
  }
  .terms-title {
    font-size: 9pt;
    font-weight: bold;
    margin-bottom: 2px;
  }
  .term-item {
    font-size: 8.5pt;
    line-height: 1.3;
    display: flex;
    gap: 3px;
  }
  .term-num { min-width: 18px; text-align: center; }
  .term-value { font-weight: normal; }

  .special-req {
    border: 2px solid #000;
    border-bottom: none;
    padding: 4px 6px;
  }
  .special-req-title {
    font-size: 9pt;
    font-weight: bold;
    margin-bottom: 2px;
  }
  .special-req-text {
    font-size: 8.5pt;
    line-height: 1.3;
  }

  .approval-section {
    border: 2px solid #000;
    border-bottom: none;
    padding: 6px;
    display: flex;
    justify-content: space-between;
  }
  .approval-block {
    font-size: 9pt;
  }
  .approval-label {
    color: #666;
    font-size: 8pt;
  }

  .footer-section {
    border: 2px solid #000;
    padding: 2px 4px;
  }
  .footer-disclaimer {
    font-size: 6.5pt;
    color: #666;
    display: flex;
    justify-content: space-between;
    padding: 1px 0;
  }
  .footer-address {
    font-size: 8pt;
    text-align: center;
    padding: 0;
  }

  col.col-sn    { width: 4%; }
  col.col-prod  { width: 14%; }
  col.col-mat   { width: 14%; }
  col.col-spec  { width: 14%; }
  col.col-size  { width: 8%; }
  col.col-qty   { width: 8%; }
  col.col-rate  { width: 12%; }
  col.col-amt   { width: 14%; }
  col.col-del   { width: 12%; }
</style>
</head>
<body>
<table>
  <colgroup>
    <col class="col-sn">
    <col class="col-prod">
    <col class="col-mat">
    <col class="col-spec">
    <col class="col-size">
    <col class="col-qty">
    <col class="col-rate">
    <col class="col-amt">
    <col class="col-del">
  </colgroup>

  <!-- ZONE 1: Letterhead -->
  <tr class="letterhead">
    <td colspan="2" rowspan="2" class="logo-cell">
      ${company.companyLogoUrl ? `<img src="${company.companyLogoUrl}" alt="Logo">` : `<span style="font-size:14pt;font-weight:bold">${escapeHtml(company.companyName)}</span>`}
    </td>
    <td colspan="7" class="company-name">${escapeHtml(company.companyName)}</td>
  </tr>
  <tr class="letterhead"><td colspan="7"></td></tr>

  <!-- ZONE 2: Header info grid -->
  <tr class="header-grid">
    <td class="hdr-label bt-med" colspan="2">Vendor :</td>
    <td class="hdr-value bt-med" colspan="3">${escapeHtml(po.vendor.name)}</td>
    <td class="hdr-label bt-med" colspan="2">PO No. :</td>
    <td class="hdr-value bt-med" colspan="2" style="font-weight:bold">${escapeHtml(po.poNo)}</td>
  </tr>
  <tr class="header-grid">
    <td class="hdr-label" colspan="2">Address :</td>
    <td class="hdr-value" colspan="3">${escapeHtml(vendorAddress)}</td>
    <td class="hdr-label" colspan="2">PO Date :</td>
    <td class="hdr-value" colspan="2">${formatDate(po.poDate)}</td>
  </tr>
  <tr class="header-grid">
    <td class="hdr-label" colspan="2">GST No. :</td>
    <td class="hdr-value" colspan="3" style="font-family:monospace">${escapeHtml(po.vendor.gstNo)}</td>
    <td class="hdr-label" colspan="2">Delivery Date :</td>
    <td class="hdr-value" colspan="2">${formatDate(po.deliveryDate)}</td>
  </tr>
  <tr class="header-grid">
    <td class="hdr-label" colspan="2">Contact :</td>
    <td class="hdr-value" colspan="3">${escapeHtml(po.vendor.contactPerson)}${po.vendor.phone ? ` | ${escapeHtml(po.vendor.phone)}` : ""}</td>
    <td class="hdr-label" colspan="2">${po.purchaseRequisition ? "PR Ref :" : po.salesOrder ? "SO Ref :" : ""}</td>
    <td class="hdr-value" colspan="2">${escapeHtml(po.purchaseRequisition?.prNo || po.salesOrder?.soNo)}</td>
  </tr>
  <tr class="header-grid">
    <td class="hdr-label bb-med" colspan="2">Email :</td>
    <td class="hdr-value bb-med" colspan="3">${escapeHtml(po.vendor.email)}</td>
    <td class="hdr-label bb-med" colspan="2">Currency :</td>
    <td class="hdr-value bb-med" colspan="2">${escapeHtml(po.currency)}</td>
  </tr>

  <!-- ZONE 3: Title -->
  <tr class="title-row">
    <td colspan="9">${po.version > 0 ? `PURCHASE ORDER — Revision ${po.version}` : "PURCHASE ORDER"}</td>
  </tr>

  <!-- ZONE 4: Table header -->
  <tr class="table-header">
    <th style="border-left:2px solid #000">S/N</th>
    <th>Product</th>
    <th>Material</th>
    <th>Additional Spec.</th>
    <th>Size</th>
    <th>Qty</th>
    <th>Unit Rate<br>(${escapeHtml(po.currency)})</th>
    <th>Amount<br>(${escapeHtml(po.currency)})</th>
    <th style="border-right:2px solid #000">Delivery<br>Date</th>
  </tr>

  <!-- ZONE 5: Data rows -->
  ${itemRows}

  <!-- ZONE 6: Total row -->
  <tr class="total-row">
    <td colspan="5" class="bl-med" style="text-align:center">Total</td>
    <td>${formatNumber(totalQty, 3)}</td>
    <td></td>
    <td style="font-weight:bold">${formatNumber(totalAmount, 2)}</td>
    <td class="br-med"></td>
  </tr>

  <!-- Amount in Words -->
  <tr>
    <td colspan="9" class="bl-med br-med bb-med" style="font-size:10pt;padding:4px 6px;text-align:left;">
      <strong>Amount in Words:</strong> ${escapeHtml(numberToWords(totalAmount, po.currency))}
    </td>
  </tr>
</table>

<!-- Terms + Footer — one block -->
<div class="terms-footer">
  ${po.paymentTerms ? `<div class="terms-section">
    <div class="terms-title">PAYMENT TERMS:</div>
    <div style="font-size:8.5pt">${escapeHtml(po.paymentTerms)}</div>
  </div>` : ""}

  ${tcLines.length > 0 ? `<div class="terms-section">
    <div class="terms-title">TERMS & CONDITIONS:</div>
    ${tcItems}
  </div>` : ""}

  ${po.specialRequirements ? `<div class="special-req">
    <div class="special-req-title">SPECIAL REQUIREMENTS:</div>
    <div class="special-req-text">${escapeHtml(po.specialRequirements)}</div>
  </div>` : ""}

  <div class="approval-section">
    <div class="approval-block">
      <div class="approval-label">Prepared By</div>
      <div>${escapeHtml(company.companyName)}</div>
    </div>
    ${po.approvedBy ? `<div class="approval-block">
      <div class="approval-label">Approved By</div>
      <div>${escapeHtml(po.approvedBy.name)}</div>
      <div style="font-size:8pt;color:#666">${formatDate(po.approvalDate)}</div>
    </div>` : ""}
    <div class="approval-block">
      <div class="approval-label">Vendor Acceptance</div>
      <div style="min-width:120px;border-bottom:1px solid #999;margin-top:20px">&nbsp;</div>
    </div>
  </div>

  <div class="footer-section">
    <div class="footer-disclaimer">
      <span>This is a computer generated document hence not signed.</span>
      <span>${po.version > 0 ? `This PO supersedes all previous revisions.` : ""}</span>
    </div>
    <div class="footer-address">Regd. Address: ${escapeHtml(footerAddress)}. ${escapeHtml(footerContact)}</div>
  </div>
</div>

</body>
</html>`;
}
