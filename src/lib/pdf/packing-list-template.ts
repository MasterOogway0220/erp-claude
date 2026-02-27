// Packing List PDF Template — Portrait A4
// For physical verification at dispatch

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

interface PackingListData {
  plNo: string;
  plDate: string | Date;
  remarks?: string | null;
  salesOrder?: {
    soNo: string;
    customer?: {
      name: string;
      addressLine1?: string | null;
      city?: string | null;
      state?: string | null;
      pincode?: string | null;
    } | null;
  } | null;
  items: {
    heatNo?: string | null;
    sizeLabel?: string | null;
    material?: string | null;
    quantityMtr: number;
    pieces: number;
    bundleNo?: string | null;
    grossWeightKg?: number | null;
    netWeightKg?: number | null;
    markingDetails?: string | null;
    inventoryStock?: { product?: string | null } | null;
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

function formatNumber(val: any, decimals: number = 3): string {
  const num = parseFloat(val);
  if (isNaN(num)) return "0.000";
  return num.toFixed(decimals);
}

export function generatePackingListHtml(
  pl: PackingListData,
  company: CompanyInfo
): string {
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

  const customerName = pl.salesOrder?.customer?.name || "";
  const customerAddress = [
    pl.salesOrder?.customer?.addressLine1,
    pl.salesOrder?.customer?.city,
    pl.salesOrder?.customer?.state
      ? `${pl.salesOrder.customer.state} - ${pl.salesOrder.customer.pincode || ""}`
      : pl.salesOrder?.customer?.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const totalQty = pl.items.reduce(
    (sum, item) => sum + (parseFloat(String(item.quantityMtr)) || 0),
    0
  );
  const totalPcs = pl.items.reduce(
    (sum, item) => sum + (Number(item.pieces) || 0),
    0
  );
  const totalGrossWt = pl.items.reduce(
    (sum, item) => sum + (parseFloat(String(item.grossWeightKg)) || 0),
    0
  );
  const totalNetWt = pl.items.reduce(
    (sum, item) => sum + (parseFloat(String(item.netWeightKg)) || 0),
    0
  );

  const itemRows = pl.items
    .map((item, index) => {
      return `<tr class="data-row">
        <td style="text-align:center">${index + 1}</td>
        <td style="text-align:center;font-family:monospace">${escapeHtml(item.heatNo)}</td>
        <td style="text-align:center">${escapeHtml(item.sizeLabel)}</td>
        <td>${escapeHtml(item.material)}</td>
        <td>${escapeHtml(item.inventoryStock?.product)}</td>
        <td style="text-align:right">${formatNumber(item.quantityMtr)}</td>
        <td style="text-align:center">${item.pieces}</td>
        <td style="text-align:center">${escapeHtml(item.bundleNo)}</td>
        <td style="text-align:right">${item.grossWeightKg ? formatNumber(item.grossWeightKg) : "-"}</td>
        <td style="text-align:right">${item.netWeightKg ? formatNumber(item.netWeightKg) : "-"}</td>
        <td style="font-size:8pt">${escapeHtml(item.markingDetails)}</td>
      </tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: A4 landscape; margin: 5mm; }
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
  }

  .header-section {
    border-bottom: 2px solid #000;
    padding: 6px 10px;
    text-align: center;
  }
  .company-name {
    font-size: 16pt;
    font-weight: bold;
  }
  .company-address {
    font-size: 8pt;
    color: #444;
  }

  .title-bar {
    background-color: #E8F0FE;
    text-align: center;
    font-size: 13pt;
    font-weight: bold;
    padding: 4px 0;
    border-bottom: 2px solid #000;
  }

  .info-grid {
    display: flex;
    border-bottom: 1px solid #000;
    padding: 4px 10px;
  }
  .info-left, .info-right { width: 50%; }
  .info-row {
    display: flex;
    font-size: 9pt;
    line-height: 1.5;
  }
  .info-label {
    min-width: 90px;
    font-weight: bold;
    color: #333;
  }

  .items-table th {
    font-size: 9pt;
    font-weight: bold;
    text-align: center;
    padding: 4px 3px;
    border-bottom: 2px solid #000;
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

  .total-row td {
    font-size: 10pt;
    font-weight: bold;
    padding: 4px 4px;
    border-top: 2px solid #000;
    border-right: 1px solid #eee;
  }
  .total-row td:last-child { border-right: none; }

  .footer-section {
    border-top: 2px solid #000;
    padding: 6px 10px;
    display: flex;
    justify-content: space-between;
  }
  .disclaimer {
    text-align: center;
    font-size: 7pt;
    color: #888;
    padding: 2px;
    border-top: 1px solid #000;
  }
</style>
</head>
<body>
<div class="outer-border">
  <div class="header-section">
    <div class="company-name">${escapeHtml(company.companyName)}</div>
    <div class="company-address">${escapeHtml(companyAddress)}</div>
  </div>

  <div class="title-bar">PACKING LIST</div>

  <div class="info-grid">
    <div class="info-left">
      <div class="info-row"><span class="info-label">PL No.</span><span style="font-weight:bold">${escapeHtml(pl.plNo)}</span></div>
      <div class="info-row"><span class="info-label">PL Date</span><span>${formatDate(pl.plDate)}</span></div>
      ${pl.salesOrder ? `<div class="info-row"><span class="info-label">SO Ref.</span><span>${escapeHtml(pl.salesOrder.soNo)}</span></div>` : ""}
    </div>
    <div class="info-right">
      <div class="info-row"><span class="info-label">Customer</span><span style="font-weight:bold">${escapeHtml(customerName)}</span></div>
      ${customerAddress ? `<div class="info-row"><span class="info-label">Address</span><span>${escapeHtml(customerAddress)}</span></div>` : ""}
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width:4%">S/N</th>
        <th style="width:11%">Heat No.</th>
        <th style="width:10%">Size</th>
        <th style="width:12%">Material</th>
        <th style="width:10%">Product</th>
        <th style="width:9%">Qty (Mtr)</th>
        <th style="width:5%">Pcs</th>
        <th style="width:8%">Bundle No.</th>
        <th style="width:10%">Gross Wt (Kg)</th>
        <th style="width:10%">Net Wt (Kg)</th>
        <th style="width:11%">Marking</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}

      <tr class="total-row">
        <td colspan="5" style="text-align:center">Total</td>
        <td style="text-align:right">${formatNumber(totalQty)}</td>
        <td style="text-align:center">${totalPcs}</td>
        <td></td>
        <td style="text-align:right">${formatNumber(totalGrossWt)}</td>
        <td style="text-align:right">${formatNumber(totalNetWt)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  ${pl.remarks ? `<div style="padding:4px 10px;font-size:9pt;border-top:1px solid #000"><strong>Remarks:</strong> ${escapeHtml(pl.remarks)}</div>` : ""}

  <div class="footer-section">
    <div style="font-size:9pt">
      <strong>Checked By:</strong> ________________
    </div>
    <div style="font-size:9pt;text-align:right">
      <div style="font-weight:bold">For ${escapeHtml(company.companyName)}</div>
      <div style="height:30px"></div>
      <div>Authorised Signatory</div>
    </div>
  </div>

  <div class="disclaimer">
    This is a computer generated document. | Total Items: ${pl.items.length} | Total Weight: ${formatNumber(totalNetWt)} Kg (Net)
  </div>
</div>
</body>
</html>`;
}
