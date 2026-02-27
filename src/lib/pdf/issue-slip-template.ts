interface IssueSlipData {
  issueNo: string;
  issueDate: string | Date;
  status: string;
  remarks?: string | null;
  salesOrder: {
    soNo: string;
    customer?: { name: string } | null;
  };
  issuedBy?: { name: string } | null;
  authorizedBy?: { name: string } | null;
  items: {
    heatNo?: string | null;
    sizeLabel?: string | null;
    material?: string | null;
    quantityMtr: number | string;
    pieces: number;
    location?: string | null;
  }[];
}

interface CompanyInfo {
  companyName: string;
  regAddressLine1?: string | null;
  regCity?: string | null;
  regPincode?: string | null;
  regState?: string | null;
  telephoneNo?: string | null;
  email?: string | null;
}

export function generateIssueSlipHtml(data: IssueSlipData, company: CompanyInfo): string {
  const issueDate = new Date(data.issueDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const totalQty = data.items.reduce((sum, item) => sum + Number(item.quantityMtr || 0), 0);
  const totalPcs = data.items.reduce((sum, item) => sum + (item.pieces || 0), 0);

  const itemRows = data.items
    .map(
      (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.heatNo || "&mdash;"}</td>
        <td>${item.sizeLabel || "&mdash;"}</td>
        <td>${item.material || "&mdash;"}</td>
        <td class="right">${Number(item.quantityMtr).toFixed(3)}</td>
        <td class="right">${item.pieces}</td>
        <td>${item.location || "&mdash;"}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #333; padding: 15mm; }
  .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
  .header h1 { font-size: 18px; margin-bottom: 2px; }
  .header .company { font-size: 10px; color: #666; }
  .header h2 { font-size: 14px; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
  .info-box { border: 1px solid #ddd; padding: 10px; border-radius: 4px; }
  .info-box h3 { font-size: 11px; text-transform: uppercase; color: #666; margin-bottom: 6px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
  .info-row { display: flex; justify-content: space-between; padding: 2px 0; }
  .info-row .label { color: #888; }
  .info-row .value { font-weight: 500; }
  .status-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
  .status-DRAFT { background: #e5e7eb; color: #374151; }
  .status-PENDING_AUTHORIZATION { background: #fef3c7; color: #92400e; }
  .status-AUTHORIZED { background: #d1fae5; color: #065f46; }
  .status-REJECTED { background: #fee2e2; color: #991b1b; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  table.items th, table.items td { border: 1px solid #ccc; padding: 5px 8px; text-align: left; }
  table.items th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; }
  table.items tr:nth-child(even) { background: #fafafa; }
  table.items .right { text-align: right; }
  .totals { font-weight: bold; background: #f0f0f0 !important; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 40px; padding-top: 15px; }
  .sig-block { text-align: center; }
  .sig-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; font-size: 10px; }
  .remarks { margin-bottom: 15px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #fafafa; }
  .remarks .label { font-weight: bold; font-size: 10px; text-transform: uppercase; color: #666; }
</style>
</head>
<body>
  <div class="header">
    <h1>${company.companyName}</h1>
    <div class="company">
      ${company.regAddressLine1 || ""} ${company.regCity ? ", " + company.regCity : ""} ${company.regPincode ? "- " + company.regPincode : ""}
      ${company.telephoneNo ? " | Tel: " + company.telephoneNo : ""}
    </div>
    <h2>Issue Slip</h2>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>Issue Details</h3>
      <div class="info-row"><span class="label">Issue No.</span><span class="value">${data.issueNo}</span></div>
      <div class="info-row"><span class="label">Issue Date</span><span class="value">${issueDate}</span></div>
      <div class="info-row"><span class="label">Status</span><span class="status-badge status-${data.status}">${data.status.replace(/_/g, " ")}</span></div>
    </div>
    <div class="info-box">
      <h3>Sales Order</h3>
      <div class="info-row"><span class="label">SO No.</span><span class="value">${data.salesOrder.soNo}</span></div>
      <div class="info-row"><span class="label">Customer</span><span class="value">${data.salesOrder.customer?.name || "&mdash;"}</span></div>
    </div>
  </div>

  ${data.remarks ? `<div class="remarks"><span class="label">Remarks: </span>${data.remarks}</div>` : ""}

  <table class="items">
    <thead>
      <tr>
        <th>#</th>
        <th>Heat No.</th>
        <th>Size</th>
        <th>Material</th>
        <th class="right">Qty (Mtr)</th>
        <th class="right">Pieces</th>
        <th>Location</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr class="totals">
        <td colspan="4" class="right">Total</td>
        <td class="right">${totalQty.toFixed(3)}</td>
        <td class="right">${totalPcs}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line">Issued By: ${data.issuedBy?.name || ""}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">Authorized By: ${data.authorizedBy?.name || ""}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">Received By</div>
    </div>
  </div>
</body>
</html>`;
}
