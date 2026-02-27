// Invoice PDF Template — Portrait A4
// GST-compliant tax invoice for NPS Piping Solutions

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
  gstNo?: string | null;
  panNo?: string | null;
}

interface InvoiceData {
  invoiceNo: string;
  invoiceDate: string | Date;
  invoiceType: string;
  dueDate?: string | Date | null;
  placeOfSupply?: string | null;
  customerGstin?: string | null;
  eWayBillNo?: string | null;
  currency: string;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  tcsAmount: number;
  roundOff: number;
  totalAmount: number;
  amountInWords?: string | null;
  customer: {
    name: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    gstNo?: string | null;
    panNo?: string | null;
    contactPerson?: string | null;
    phone?: string | null;
  };
  salesOrder?: { soNo: string } | null;
  dispatchNote?: { dnNo: string } | null;
  items: {
    sNo: number;
    description?: string | null;
    heatNo?: string | null;
    sizeLabel?: string | null;
    hsnCode?: string | null;
    uom?: string | null;
    quantity: number;
    unitRate: number;
    amount: number;
    taxRate?: number | null;
  }[];
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
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function generateInvoiceHtml(
  invoice: InvoiceData,
  company: CompanyInfo
): string {
  const customerAddress = [
    invoice.customer.addressLine1,
    invoice.customer.addressLine2,
    invoice.customer.city,
    invoice.customer.state
      ? `${invoice.customer.state} - ${invoice.customer.pincode || ""}`
      : invoice.customer.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const companyAddress = [
    company.regAddressLine1,
    company.regAddressLine2,
    company.regCity,
    company.regState
      ? `${company.regState} - ${company.regPincode || ""}`
      : company.regPincode,
    company.regCountry,
  ]
    .filter(Boolean)
    .join(", ");

  const hasIgst = Number(invoice.igst) > 0;
  const totalAmount = Number(invoice.totalAmount) || 0;
  const amtWords =
    invoice.amountInWords ||
    numberToWords(totalAmount, invoice.currency || "INR");

  const itemRows = invoice.items
    .map((item) => {
      return `<tr class="data-row">
        <td style="text-align:center">${item.sNo}</td>
        <td>${escapeHtml(item.description)}</td>
        <td style="text-align:center">${escapeHtml(item.heatNo)}</td>
        <td style="text-align:center">${escapeHtml(item.sizeLabel)}</td>
        <td style="text-align:center">${escapeHtml(item.hsnCode)}</td>
        <td style="text-align:center">${escapeHtml(item.uom) || "Mtr"}</td>
        <td style="text-align:right">${formatNumber(item.quantity, 3)}</td>
        <td style="text-align:right">${formatNumber(item.unitRate)}</td>
        <td style="text-align:right">${formatNumber(item.amount)}</td>
      </tr>`;
    })
    .join("\n");

  const taxSummaryRows = hasIgst
    ? `<tr>
        <td colspan="7" style="text-align:right;padding-right:8px">IGST</td>
        <td></td>
        <td style="text-align:right">${formatNumber(invoice.igst)}</td>
      </tr>`
    : `<tr>
        <td colspan="7" style="text-align:right;padding-right:8px">CGST</td>
        <td></td>
        <td style="text-align:right">${formatNumber(invoice.cgst)}</td>
      </tr>
      <tr>
        <td colspan="7" style="text-align:right;padding-right:8px">SGST</td>
        <td></td>
        <td style="text-align:right">${formatNumber(invoice.sgst)}</td>
      </tr>`;

  const tcsRow =
    Number(invoice.tcsAmount) > 0
      ? `<tr>
        <td colspan="7" style="text-align:right;padding-right:8px">TCS</td>
        <td></td>
        <td style="text-align:right">${formatNumber(invoice.tcsAmount)}</td>
      </tr>`
      : "";

  const roundOffRow =
    Number(invoice.roundOff) !== 0
      ? `<tr>
        <td colspan="7" style="text-align:right;padding-right:8px">Round Off</td>
        <td></td>
        <td style="text-align:right">${formatNumber(invoice.roundOff)}</td>
      </tr>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: A4 portrait; margin: 8mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Calibri', 'Segoe UI', sans-serif;
    font-size: 10pt;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  table { border-collapse: collapse; width: 100%; }
  td, th { padding: 2px 4px; vertical-align: middle; }

  .outer-border {
    border: 2px solid #000;
    padding: 0;
  }

  .header-section {
    border-bottom: 2px solid #000;
    padding: 8px 12px;
    text-align: center;
  }
  .company-name {
    font-size: 18pt;
    font-weight: bold;
    margin-bottom: 2px;
  }
  .company-address {
    font-size: 8pt;
    color: #444;
  }
  .company-gst {
    font-size: 9pt;
    font-weight: bold;
    margin-top: 2px;
  }

  .title-bar {
    background-color: #E8F0FE;
    text-align: center;
    font-size: 14pt;
    font-weight: bold;
    padding: 4px 0;
    border-bottom: 2px solid #000;
  }

  .info-grid {
    display: flex;
    border-bottom: 1px solid #000;
  }
  .info-left, .info-right {
    width: 50%;
    padding: 6px 10px;
  }
  .info-left { border-right: 1px solid #000; }
  .info-row {
    display: flex;
    font-size: 9pt;
    line-height: 1.6;
  }
  .info-label {
    min-width: 100px;
    font-weight: bold;
    color: #333;
  }
  .info-value { flex: 1; }

  .items-table { width: 100%; }
  .items-table th {
    font-size: 9pt;
    font-weight: bold;
    text-align: center;
    padding: 4px 3px;
    border-bottom: 1px solid #000;
    border-right: 1px solid #ccc;
    background-color: #f5f5f5;
  }
  .items-table th:last-child { border-right: none; }

  .data-row td {
    font-size: 9pt;
    padding: 3px 4px;
    border-bottom: 1px solid #ddd;
    border-right: 1px solid #eee;
  }
  .data-row td:last-child { border-right: none; }

  .subtotal-section td {
    font-size: 9pt;
    padding: 2px 4px;
    border-right: 1px solid #eee;
  }
  .subtotal-section td:last-child { border-right: none; }

  .total-row td {
    font-size: 11pt;
    font-weight: bold;
    padding: 4px 4px;
    border-top: 2px solid #000;
  }

  .amount-words {
    border-top: 1px solid #000;
    padding: 4px 10px;
    font-size: 9pt;
  }

  .footer-section {
    border-top: 2px solid #000;
    padding: 8px 10px;
    display: flex;
    justify-content: space-between;
  }
  .bank-details {
    font-size: 8pt;
    line-height: 1.5;
  }
  .bank-details strong {
    font-size: 9pt;
  }
  .auth-sign {
    text-align: right;
    font-size: 9pt;
  }
  .auth-sign .company {
    font-weight: bold;
  }
  .auth-sign .sig-space {
    height: 40px;
  }

  .disclaimer {
    text-align: center;
    font-size: 7pt;
    color: #888;
    padding: 2px;
    border-top: 1px solid #000;
  }

  col.col-sn { width: 5%; }
  col.col-desc { width: 22%; }
  col.col-heat { width: 10%; }
  col.col-size { width: 10%; }
  col.col-hsn { width: 10%; }
  col.col-uom { width: 6%; }
  col.col-qty { width: 10%; }
  col.col-rate { width: 12%; }
  col.col-amt { width: 15%; }
</style>
</head>
<body>
<div class="outer-border">
  <!-- Header -->
  <div class="header-section">
    <div class="company-name">${escapeHtml(company.companyName)}</div>
    <div class="company-address">${escapeHtml(companyAddress)}</div>
    <div class="company-gst">
      ${company.gstNo ? `GSTIN: ${escapeHtml(company.gstNo)}` : ""}
      ${company.panNo ? ` | PAN: ${escapeHtml(company.panNo)}` : ""}
    </div>
  </div>

  <!-- Title -->
  <div class="title-bar">TAX INVOICE</div>

  <!-- Info Grid -->
  <div class="info-grid">
    <div class="info-left">
      <div class="info-row"><span class="info-label">Invoice No.</span><span class="info-value" style="font-weight:bold">${escapeHtml(invoice.invoiceNo)}</span></div>
      <div class="info-row"><span class="info-label">Invoice Date</span><span class="info-value">${formatDate(invoice.invoiceDate)}</span></div>
      ${invoice.dueDate ? `<div class="info-row"><span class="info-label">Due Date</span><span class="info-value">${formatDate(invoice.dueDate)}</span></div>` : ""}
      ${invoice.salesOrder ? `<div class="info-row"><span class="info-label">SO Ref.</span><span class="info-value">${escapeHtml(invoice.salesOrder.soNo)}</span></div>` : ""}
      ${invoice.dispatchNote ? `<div class="info-row"><span class="info-label">DN Ref.</span><span class="info-value">${escapeHtml(invoice.dispatchNote.dnNo)}</span></div>` : ""}
      ${invoice.eWayBillNo ? `<div class="info-row"><span class="info-label">E-Way Bill</span><span class="info-value">${escapeHtml(invoice.eWayBillNo)}</span></div>` : ""}
    </div>
    <div class="info-right">
      <div class="info-row"><span class="info-label">Bill To</span><span class="info-value" style="font-weight:bold">${escapeHtml(invoice.customer.name)}</span></div>
      <div class="info-row"><span class="info-label">Address</span><span class="info-value">${escapeHtml(customerAddress)}</span></div>
      ${invoice.customer.gstNo ? `<div class="info-row"><span class="info-label">GSTIN</span><span class="info-value" style="font-family:monospace">${escapeHtml(invoice.customer.gstNo)}</span></div>` : ""}
      ${invoice.customer.panNo ? `<div class="info-row"><span class="info-label">PAN</span><span class="info-value" style="font-family:monospace">${escapeHtml(invoice.customer.panNo)}</span></div>` : ""}
      ${invoice.placeOfSupply ? `<div class="info-row"><span class="info-label">Place of Supply</span><span class="info-value">${escapeHtml(invoice.placeOfSupply)}</span></div>` : ""}
    </div>
  </div>

  <!-- Items Table -->
  <table class="items-table">
    <colgroup>
      <col class="col-sn">
      <col class="col-desc">
      <col class="col-heat">
      <col class="col-size">
      <col class="col-hsn">
      <col class="col-uom">
      <col class="col-qty">
      <col class="col-rate">
      <col class="col-amt">
    </colgroup>
    <thead>
      <tr>
        <th>S/N</th>
        <th>Description</th>
        <th>Heat No.</th>
        <th>Size</th>
        <th>HSN Code</th>
        <th>UOM</th>
        <th>Qty</th>
        <th>Rate (${escapeHtml(invoice.currency)})</th>
        <th>Amount (${escapeHtml(invoice.currency)})</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}

      <!-- Subtotal -->
      <tr class="subtotal-section">
        <td colspan="7" style="text-align:right;padding-right:8px;border-top:1px solid #000"><strong>Subtotal</strong></td>
        <td style="border-top:1px solid #000"></td>
        <td style="text-align:right;border-top:1px solid #000"><strong>${formatNumber(invoice.subtotal)}</strong></td>
      </tr>

      <!-- Tax rows -->
      ${taxSummaryRows}
      ${tcsRow}
      ${roundOffRow}

      <!-- Total -->
      <tr class="total-row">
        <td colspan="7" style="text-align:right;padding-right:8px">TOTAL</td>
        <td></td>
        <td style="text-align:right">${escapeHtml(invoice.currency)} ${formatNumber(totalAmount)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Amount in Words -->
  <div class="amount-words">
    <strong>Amount in Words:</strong> ${escapeHtml(amtWords)}
  </div>

  <!-- Footer: Bank Details + Auth Signatory -->
  <div class="footer-section">
    <div class="bank-details">
      <strong>Bank Details:</strong><br>
      Bank: HDFC Bank<br>
      A/c No: As per Company Records<br>
      IFSC: As per Company Records<br>
      Branch: Mumbai
    </div>
    <div class="auth-sign">
      <div class="company">For ${escapeHtml(company.companyName)}</div>
      <div class="sig-space"></div>
      <div>Authorised Signatory</div>
    </div>
  </div>

  <!-- Disclaimer -->
  <div class="disclaimer">
    This is a computer generated invoice. | Subject to Mumbai Jurisdiction.
  </div>
</div>
</body>
</html>`;
}
