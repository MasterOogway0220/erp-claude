// Client Order Status Report PDF Template — Portrait A4
// Professional status report for client communication

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

export interface StatusReportItem {
  sNo: number;
  product: string;
  material: string;
  size: string;
  qtyOrdered: number;
  qtyDispatched: number;
  qtyBalance: number;
  materialPrepared: string; // qty or status text
  inspectionStatus: string;
  testingStatus: string;
  heatNo: string;
  expectedDispatchDate: string;
  remarks: string;
}

export interface ClientStatusReportData {
  reportDate: string;
  customer: {
    name: string;
    contactPerson?: string | null;
    addressLine1?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
  };
  salesOrder: {
    soNo: string;
    soDate: string;
    customerPoNo?: string | null;
    customerPoDate?: string | null;
    projectName?: string | null;
    deliverySchedule?: string | null;
    status: string;
  };
  items: StatusReportItem[];
  summary: {
    totalItems: number;
    totalOrdered: number;
    totalDispatched: number;
    totalBalance: number;
    inspectionComplete: number;
    testingComplete: number;
    materialReady: number;
  };
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
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
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case "COMPLETED":
    case "DONE":
    case "PASS":
    case "READY":
    case "ISSUED":
      return "#16a34a";
    case "IN_PROGRESS":
    case "IN PROGRESS":
    case "PREPARING":
      return "#2563eb";
    case "PENDING":
      return "#d97706";
    case "FAIL":
    case "REJECTED":
      return "#dc2626";
    case "N/A":
    case "NA":
      return "#9ca3af";
    default:
      return "#374151";
  }
}

function getStatusBadge(status: string): string {
  const color = getStatusColor(status);
  const label = status.replace(/_/g, " ");
  return `<span style="display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:600;color:${color};background:${color}15;border:1px solid ${color}30;">${escapeHtml(label)}</span>`;
}

export function generateClientStatusReportHtml(
  report: ClientStatusReportData,
  company: CompanyInfo
): string {
  const companyAddress = [
    company.regAddressLine1,
    company.regAddressLine2,
    company.regCity,
    company.regState
      ? `${company.regState} - ${company.regPincode || ""}`
      : company.regPincode,
  ]
    .filter(Boolean)
    .join(", ");

  const customerAddress = [
    report.customer.addressLine1,
    report.customer.city,
    report.customer.state
      ? `${report.customer.state} - ${report.customer.pincode || ""}`
      : report.customer.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const itemRows = report.items
    .map(
      (item) => `
      <tr>
        <td style="text-align:center">${item.sNo}</td>
        <td>${escapeHtml(item.product)}</td>
        <td>${escapeHtml(item.material)}</td>
        <td>${escapeHtml(item.size)}</td>
        <td style="text-align:center;font-family:monospace;font-size:10px">${escapeHtml(item.heatNo) || "&mdash;"}</td>
        <td style="text-align:right">${formatNumber(item.qtyOrdered)}</td>
        <td style="text-align:right">${formatNumber(item.qtyDispatched)}</td>
        <td style="text-align:right;font-weight:600">${formatNumber(item.qtyBalance)}</td>
        <td style="text-align:center">${getStatusBadge(item.materialPrepared)}</td>
        <td style="text-align:center">${getStatusBadge(item.inspectionStatus)}</td>
        <td style="text-align:center">${getStatusBadge(item.testingStatus)}</td>
        <td style="text-align:center;font-size:10px">${escapeHtml(item.expectedDispatchDate) || "&mdash;"}</td>
        <td style="font-size:10px">${escapeHtml(item.remarks) || "&mdash;"}</td>
      </tr>`
    )
    .join("");

  const { summary } = report;
  const inspPct = summary.totalItems > 0 ? Math.round((summary.inspectionComplete / summary.totalItems) * 100) : 0;
  const testPct = summary.totalItems > 0 ? Math.round((summary.testingComplete / summary.totalItems) * 100) : 0;
  const prepPct = summary.totalItems > 0 ? Math.round((summary.materialReady / summary.totalItems) * 100) : 0;
  const dispPct = summary.totalOrdered > 0 ? Math.round((summary.totalDispatched / summary.totalOrdered) * 100) : 0;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1f2937; line-height: 1.4; }

  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 3px solid #1e40af; margin-bottom: 16px; }
  .company-name { font-size: 18px; font-weight: 700; color: #1e40af; }
  .company-address { font-size: 9px; color: #6b7280; margin-top: 2px; }
  .report-title { font-size: 16px; font-weight: 700; color: #1e40af; text-align: right; }
  .report-date { font-size: 10px; color: #6b7280; text-align: right; margin-top: 2px; }

  .info-grid { display: flex; gap: 20px; margin-bottom: 16px; }
  .info-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; }
  .info-box h3 { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
  .info-label { color: #64748b; font-size: 10px; }
  .info-value { font-weight: 600; font-size: 10px; }

  .summary-bar { display: flex; gap: 10px; margin-bottom: 16px; }
  .summary-card { flex: 1; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 8px 12px; text-align: center; }
  .summary-card.green { background: #f0fdf4; border-color: #bbf7d0; }
  .summary-card.amber { background: #fffbeb; border-color: #fde68a; }
  .summary-card.blue { background: #eff6ff; border-color: #bfdbfe; }
  .summary-number { font-size: 18px; font-weight: 700; color: #1e40af; }
  .summary-card.green .summary-number { color: #16a34a; }
  .summary-card.amber .summary-number { color: #d97706; }
  .summary-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 1px; }
  .summary-pct { font-size: 10px; color: #64748b; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #1e40af; color: white; font-size: 9px; font-weight: 600; padding: 6px 5px; text-align: left; text-transform: uppercase; letter-spacing: 0.3px; }
  td { padding: 5px 5px; border-bottom: 1px solid #e5e7eb; font-size: 10px; vertical-align: middle; }
  tr:nth-child(even) { background: #f9fafb; }
  tr:hover { background: #f0f4ff; }

  .footer { margin-top: 20px; padding-top: 12px; border-top: 2px solid #e5e7eb; }
  .footer-note { font-size: 9px; color: #9ca3af; font-style: italic; }
  .footer-company { font-size: 10px; font-weight: 600; color: #1e40af; margin-top: 4px; }

  .progress-bar { width: 100%; height: 6px; background: #e5e7eb; border-radius: 3px; margin-top: 4px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 3px; }

  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; font-weight: 900; color: rgba(30, 64, 175, 0.04); pointer-events: none; white-space: nowrap; }

  @media print { body { margin: 0; } }
</style>
</head>
<body>
<div class="watermark">ORDER STATUS</div>

<!-- Header -->
<div class="header">
  <div>
    <div class="company-name">${escapeHtml(company.companyName)}</div>
    <div class="company-address">${escapeHtml(companyAddress)}</div>
    ${company.telephoneNo ? `<div class="company-address">Tel: ${escapeHtml(company.telephoneNo)} | Email: ${escapeHtml(company.email || "")}</div>` : ""}
  </div>
  <div>
    <div class="report-title">Order Status Report</div>
    <div class="report-date">Generated: ${formatDate(report.reportDate)}</div>
  </div>
</div>

<!-- PO & Customer Details -->
<div class="info-grid">
  <div class="info-box">
    <h3>Customer Details</h3>
    <div class="info-row"><span class="info-label">Customer</span><span class="info-value">${escapeHtml(report.customer.name)}</span></div>
    ${report.customer.contactPerson ? `<div class="info-row"><span class="info-label">Contact</span><span class="info-value">${escapeHtml(report.customer.contactPerson)}</span></div>` : ""}
    ${customerAddress ? `<div class="info-row"><span class="info-label">Address</span><span class="info-value">${escapeHtml(customerAddress)}</span></div>` : ""}
  </div>
  <div class="info-box">
    <h3>Order Details</h3>
    <div class="info-row"><span class="info-label">SO No.</span><span class="info-value">${escapeHtml(report.salesOrder.soNo)}</span></div>
    <div class="info-row"><span class="info-label">SO Date</span><span class="info-value">${formatDate(report.salesOrder.soDate)}</span></div>
    ${report.salesOrder.customerPoNo ? `<div class="info-row"><span class="info-label">Client PO No.</span><span class="info-value">${escapeHtml(report.salesOrder.customerPoNo)}</span></div>` : ""}
    ${report.salesOrder.customerPoDate ? `<div class="info-row"><span class="info-label">PO Date</span><span class="info-value">${formatDate(report.salesOrder.customerPoDate)}</span></div>` : ""}
    ${report.salesOrder.projectName ? `<div class="info-row"><span class="info-label">Project</span><span class="info-value">${escapeHtml(report.salesOrder.projectName)}</span></div>` : ""}
    <div class="info-row"><span class="info-label">SO Status</span><span class="info-value">${escapeHtml(report.salesOrder.status.replace(/_/g, " "))}</span></div>
    ${report.salesOrder.deliverySchedule ? `<div class="info-row"><span class="info-label">Delivery</span><span class="info-value">${escapeHtml(report.salesOrder.deliverySchedule)}</span></div>` : ""}
  </div>
</div>

<!-- Summary Cards -->
<div class="summary-bar">
  <div class="summary-card">
    <div class="summary-number">${summary.totalItems}</div>
    <div class="summary-label">Total Items</div>
  </div>
  <div class="summary-card blue">
    <div class="summary-number">${dispPct}%</div>
    <div class="summary-label">Dispatched</div>
    <div class="progress-bar"><div class="progress-fill" style="width:${dispPct}%;background:#2563eb"></div></div>
  </div>
  <div class="summary-card green">
    <div class="summary-number">${prepPct}%</div>
    <div class="summary-label">Material Ready</div>
    <div class="progress-bar"><div class="progress-fill" style="width:${prepPct}%;background:#16a34a"></div></div>
  </div>
  <div class="summary-card amber">
    <div class="summary-number">${inspPct}%</div>
    <div class="summary-label">Inspection Done</div>
    <div class="progress-bar"><div class="progress-fill" style="width:${inspPct}%;background:#d97706"></div></div>
  </div>
  <div class="summary-card">
    <div class="summary-number">${testPct}%</div>
    <div class="summary-label">Testing Done</div>
    <div class="progress-bar"><div class="progress-fill" style="width:${testPct}%;background:#6366f1"></div></div>
  </div>
</div>

<!-- Items Table -->
<table>
  <thead>
    <tr>
      <th style="width:25px;text-align:center">#</th>
      <th>Product</th>
      <th>Material</th>
      <th>Size</th>
      <th style="text-align:center">Heat No.</th>
      <th style="text-align:right">Ordered</th>
      <th style="text-align:right">Dispatched</th>
      <th style="text-align:right">Balance</th>
      <th style="text-align:center">Material</th>
      <th style="text-align:center">Inspection</th>
      <th style="text-align:center">Testing</th>
      <th style="text-align:center">Exp. Dispatch</th>
      <th>Remarks</th>
    </tr>
  </thead>
  <tbody>
    ${itemRows}
  </tbody>
</table>

<!-- Footer -->
<div class="footer">
  <div class="footer-note">
    This is a computer-generated report. Status information is current as of ${formatDate(report.reportDate)}.
    For any queries, please contact our sales team.
  </div>
  <div class="footer-company">${escapeHtml(company.companyName)}${company.telephoneNo ? ` | ${escapeHtml(company.telephoneNo)}` : ""}${company.email ? ` | ${escapeHtml(company.email)}` : ""}</div>
</div>

</body>
</html>`;
}
