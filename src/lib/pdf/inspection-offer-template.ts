// Inspection Offer Letter PDF Template — Portrait A4

interface CompanyInfo {
  companyName: string;
  regAddressLine1?: string | null;
  regAddressLine2?: string | null;
  regCity?: string | null;
  regPincode?: string | null;
  regState?: string | null;
  regCountry?: string | null;
  telephoneNo?: string | null;
  email?: string | null;
}

interface InspectionOfferData {
  offerNo: string;
  offerDate: string | Date;
  poNumber?: string | null;
  projectName?: string | null;
  inspectionLocation?: string | null;
  proposedInspectionDate?: string | Date | null;
  quantityReady?: string | null;
  remarks?: string | null;
  customer: {
    name: string;
    addressLine1?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
  };
  tpiAgency?: { name: string; contactPerson?: string | null; phone?: string | null; email?: string | null } | null;
  items: {
    sNo: number;
    product?: string | null;
    material?: string | null;
    sizeLabel?: string | null;
    heatNo?: string | null;
    specification?: string | null;
    quantity?: string | null;
    quantityReady?: string | null;
    uom?: string | null;
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
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function generateInspectionOfferHtml(data: InspectionOfferData, company: CompanyInfo): string {
  const companyAddress = [company.regAddressLine1, company.regAddressLine2, company.regCity, company.regState ? `${company.regState} - ${company.regPincode || ""}` : company.regPincode, company.regCountry].filter(Boolean).join(", ");
  const customerAddress = [data.customer.addressLine1, data.customer.city, data.customer.state ? `${data.customer.state} - ${data.customer.pincode || ""}` : data.customer.pincode].filter(Boolean).join(", ");

  const itemRows = data.items.map((item) => `<tr class="data-row">
    <td style="text-align:center">${item.sNo}</td>
    <td>${escapeHtml(item.product)}</td>
    <td>${escapeHtml(item.material)}</td>
    <td style="text-align:center">${escapeHtml(item.sizeLabel)}</td>
    <td style="text-align:center;font-family:monospace">${escapeHtml(item.heatNo)}</td>
    <td>${escapeHtml(item.specification)}</td>
    <td style="text-align:right">${escapeHtml(item.quantity)}</td>
    <td style="text-align:right;font-weight:bold">${escapeHtml(item.quantityReady)}</td>
    <td style="text-align:center">${escapeHtml(item.uom) || "Mtr"}</td>
  </tr>`).join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: A4 portrait; margin: 8mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Calibri', 'Segoe UI', sans-serif; font-size: 10pt; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { border-collapse: collapse; width: 100%; }
  td, th { padding: 3px 5px; vertical-align: middle; }
  .outer-border { border: 2px solid #000; }
  .header-section { border-bottom: 2px solid #000; padding: 8px 12px; text-align: center; }
  .company-name { font-size: 16pt; font-weight: bold; }
  .company-address { font-size: 8pt; color: #444; }
  .title-bar { background-color: #E8F0FE; text-align: center; font-size: 13pt; font-weight: bold; padding: 5px 0; border-bottom: 2px solid #000; }
  .info-grid { display: flex; border-bottom: 1px solid #000; padding: 6px 12px; }
  .info-left, .info-right { width: 50%; }
  .info-row { display: flex; font-size: 9pt; line-height: 1.6; }
  .info-label { min-width: 140px; font-weight: bold; color: #333; }
  .items-table th { font-size: 9pt; font-weight: bold; text-align: center; padding: 4px 3px; border-bottom: 2px solid #000; border-right: 1px solid #ccc; background-color: #f5f5f5; }
  .items-table th:last-child { border-right: none; }
  .data-row td { font-size: 9pt; padding: 4px 5px; border-bottom: 1px solid #ddd; border-right: 1px solid #eee; }
  .data-row td:last-child { border-right: none; }
  .tpi-section { border-top: 2px solid #000; padding: 8px 12px; background: #fafafa; }
  .tpi-title { font-weight: bold; font-size: 10pt; margin-bottom: 4px; }
  .footer-section { border-top: 2px solid #000; padding: 8px 12px; display: flex; justify-content: space-between; }
  .disclaimer { text-align: center; font-size: 7pt; color: #888; padding: 3px; border-top: 1px solid #000; }
</style>
</head>
<body>
<div class="outer-border">
  <div class="header-section">
    <div class="company-name">${escapeHtml(company.companyName)}</div>
    <div class="company-address">${escapeHtml(companyAddress)}</div>
    ${company.telephoneNo ? `<div class="company-address">Tel: ${escapeHtml(company.telephoneNo)} | Email: ${escapeHtml(company.email)}</div>` : ""}
  </div>

  <div class="title-bar">INSPECTION OFFER LETTER</div>

  <div class="info-grid">
    <div class="info-left">
      <div class="info-row"><span class="info-label">Offer No.</span><span style="font-weight:bold">${escapeHtml(data.offerNo)}</span></div>
      <div class="info-row"><span class="info-label">Date</span><span>${formatDate(data.offerDate)}</span></div>
      ${data.poNumber ? `<div class="info-row"><span class="info-label">PO Number</span><span style="font-weight:bold">${escapeHtml(data.poNumber)}</span></div>` : ""}
      ${data.projectName ? `<div class="info-row"><span class="info-label">Project</span><span>${escapeHtml(data.projectName)}</span></div>` : ""}
    </div>
    <div class="info-right">
      <div class="info-row"><span class="info-label">Client</span><span style="font-weight:bold">${escapeHtml(data.customer.name)}</span></div>
      ${customerAddress ? `<div class="info-row"><span class="info-label">Address</span><span>${escapeHtml(customerAddress)}</span></div>` : ""}
      ${data.inspectionLocation ? `<div class="info-row"><span class="info-label">Inspection Location</span><span>${escapeHtml(data.inspectionLocation)}</span></div>` : ""}
      ${data.proposedInspectionDate ? `<div class="info-row"><span class="info-label">Proposed Date</span><span style="font-weight:bold;color:#0066cc">${formatDate(data.proposedInspectionDate)}</span></div>` : ""}
    </div>
  </div>

  ${data.quantityReady ? `<div style="padding:4px 12px;font-size:9pt;border-bottom:1px solid #000"><strong>Quantity Ready for Inspection:</strong> ${escapeHtml(data.quantityReady)}</div>` : ""}

  <table class="items-table">
    <thead>
      <tr>
        <th style="width:4%">S/N</th>
        <th style="width:15%">Product</th>
        <th style="width:14%">Material</th>
        <th style="width:10%">Size</th>
        <th style="width:12%">Heat No.</th>
        <th style="width:15%">Specification</th>
        <th style="width:10%">Qty Ordered</th>
        <th style="width:10%">Qty Ready</th>
        <th style="width:6%">UOM</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  ${data.tpiAgency ? `<div class="tpi-section">
    <div class="tpi-title">Third Party Inspection (TPI) Agency</div>
    <div class="info-row"><span class="info-label">Agency Name</span><span style="font-weight:bold">${escapeHtml(data.tpiAgency.name)}</span></div>
    ${data.tpiAgency.contactPerson ? `<div class="info-row"><span class="info-label">Contact Person</span><span>${escapeHtml(data.tpiAgency.contactPerson)}</span></div>` : ""}
    ${data.tpiAgency.phone ? `<div class="info-row"><span class="info-label">Phone</span><span>${escapeHtml(data.tpiAgency.phone)}</span></div>` : ""}
    ${data.tpiAgency.email ? `<div class="info-row"><span class="info-label">Email</span><span>${escapeHtml(data.tpiAgency.email)}</span></div>` : ""}
  </div>` : ""}

  ${data.remarks ? `<div style="padding:6px 12px;font-size:9pt;border-top:1px solid #000"><strong>Remarks:</strong> ${escapeHtml(data.remarks)}</div>` : ""}

  <div class="footer-section">
    <div style="font-size:9pt">
      <strong>Prepared By:</strong> ________________
    </div>
    <div style="font-size:9pt;text-align:right">
      <div style="font-weight:bold">For ${escapeHtml(company.companyName)}</div>
      <div style="height:35px"></div>
      <div>Authorised Signatory</div>
    </div>
  </div>

  <div class="disclaimer">This is a computer generated document. | Offer No: ${escapeHtml(data.offerNo)} | Items: ${data.items.length}</div>
</div>
</body>
</html>`;
}

// ==================== LENGTH TALLY LIST ====================
export function generateLengthTallyHtml(data: InspectionOfferData, company: CompanyInfo): string {
  const itemRows = data.items.map((item) => `<tr class="data-row">
    <td style="text-align:center">${item.sNo}</td>
    <td>${escapeHtml(item.product)}</td>
    <td>${escapeHtml(item.material)}</td>
    <td style="text-align:center">${escapeHtml(item.sizeLabel)}</td>
    <td style="text-align:center;font-family:monospace">${escapeHtml(item.heatNo)}</td>
    <td style="text-align:right">${escapeHtml(item.quantity)}</td>
    <td style="text-align:right">${escapeHtml(item.quantityReady)}</td>
    <td style="text-align:center">${escapeHtml(item.uom) || "Mtr"}</td>
    <td></td>
    <td></td>
  </tr>`).join("\n");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @page { size: A4 landscape; margin: 5mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Calibri', sans-serif; font-size: 10pt; color: #000; -webkit-print-color-adjust: exact; }
  table { border-collapse: collapse; width: 100%; }
  td, th { padding: 3px 5px; vertical-align: middle; }
  .outer-border { border: 2px solid #000; }
  .header-section { border-bottom: 2px solid #000; padding: 6px 10px; text-align: center; }
  .company-name { font-size: 14pt; font-weight: bold; }
  .title-bar { background-color: #E8F0FE; text-align: center; font-size: 12pt; font-weight: bold; padding: 4px 0; border-bottom: 2px solid #000; }
  .info-grid { display: flex; border-bottom: 1px solid #000; padding: 4px 10px; }
  .info-left, .info-right { width: 50%; }
  .info-row { display: flex; font-size: 9pt; line-height: 1.5; }
  .info-label { min-width: 100px; font-weight: bold; }
  .items-table th { font-size: 9pt; font-weight: bold; text-align: center; padding: 4px; border-bottom: 2px solid #000; border-right: 1px solid #ccc; background: #f5f5f5; }
  .items-table th:last-child { border-right: none; }
  .data-row td { font-size: 9pt; padding: 4px 5px; border-bottom: 1px solid #ddd; border-right: 1px solid #eee; }
  .data-row td:last-child { border-right: none; }
  .footer-section { border-top: 2px solid #000; padding: 6px 10px; display: flex; justify-content: space-between; }
  .disclaimer { text-align: center; font-size: 7pt; color: #888; padding: 2px; border-top: 1px solid #000; }
</style>
</head><body>
<div class="outer-border">
  <div class="header-section"><div class="company-name">${escapeHtml(company.companyName)}</div></div>
  <div class="title-bar">LENGTH TALLY LIST</div>
  <div class="info-grid">
    <div class="info-left">
      <div class="info-row"><span class="info-label">Ref. No.</span><span style="font-weight:bold">${escapeHtml(data.offerNo)}</span></div>
      <div class="info-row"><span class="info-label">Date</span><span>${formatDate(data.offerDate)}</span></div>
      ${data.poNumber ? `<div class="info-row"><span class="info-label">PO Number</span><span>${escapeHtml(data.poNumber)}</span></div>` : ""}
    </div>
    <div class="info-right">
      <div class="info-row"><span class="info-label">Client</span><span style="font-weight:bold">${escapeHtml(data.customer.name)}</span></div>
      ${data.inspectionLocation ? `<div class="info-row"><span class="info-label">Location</span><span>${escapeHtml(data.inspectionLocation)}</span></div>` : ""}
    </div>
  </div>

  <table class="items-table">
    <thead><tr>
      <th style="width:4%">S/N</th>
      <th style="width:14%">Product</th>
      <th style="width:14%">Material</th>
      <th style="width:9%">Size</th>
      <th style="width:11%">Heat No.</th>
      <th style="width:9%">Qty</th>
      <th style="width:9%">Qty Ready</th>
      <th style="width:6%">UOM</th>
      <th style="width:12%">Length (Individual)</th>
      <th style="width:12%">Tally Verified</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="footer-section">
    <div style="font-size:9pt"><strong>Tallied By:</strong> ________________</div>
    <div style="font-size:9pt"><strong>Verified By:</strong> ________________</div>
    <div style="font-size:9pt;text-align:right"><div style="font-weight:bold">For ${escapeHtml(company.companyName)}</div><div style="height:25px"></div><div>Authorised Signatory</div></div>
  </div>
  <div class="disclaimer">Length Tally List | Ref: ${escapeHtml(data.offerNo)} | Items: ${data.items.length}</div>
</div>
</body></html>`;
}

// ==================== COLOUR CODE COMPLIANCE LIST ====================
export function generateColourCodeHtml(data: InspectionOfferData, company: CompanyInfo): string {
  const itemRows = data.items.map((item: any) => `<tr class="data-row">
    <td style="text-align:center">${item.sNo}</td>
    <td>${escapeHtml(item.product)}</td>
    <td>${escapeHtml(item.material)}</td>
    <td style="text-align:center">${escapeHtml(item.sizeLabel)}</td>
    <td style="text-align:center;font-family:monospace">${escapeHtml(item.heatNo)}</td>
    <td style="text-align:center">${item.colourCodeRequired ? '<span style="color:green;font-weight:bold">Yes</span>' : '<span style="color:#999">No</span>'}</td>
    <td style="text-align:center;font-weight:bold">${escapeHtml(item.colourCode) || (item.colourCodeRequired ? '<span style="color:red">PENDING</span>' : '-')}</td>
    <td style="text-align:center">${item.colourCodeRequired ? '' : '-'}</td>
    <td>${escapeHtml(item.remark)}</td>
  </tr>`).join("\n");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @page { size: A4 portrait; margin: 8mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Calibri', sans-serif; font-size: 10pt; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { border-collapse: collapse; width: 100%; }
  td, th { padding: 3px 5px; vertical-align: middle; }
  .outer-border { border: 2px solid #000; }
  .header-section { border-bottom: 2px solid #000; padding: 6px 10px; text-align: center; }
  .company-name { font-size: 14pt; font-weight: bold; }
  .title-bar { background-color: #FFF3E0; text-align: center; font-size: 12pt; font-weight: bold; padding: 4px 0; border-bottom: 2px solid #000; }
  .info-grid { display: flex; border-bottom: 1px solid #000; padding: 4px 10px; }
  .info-left, .info-right { width: 50%; }
  .info-row { display: flex; font-size: 9pt; line-height: 1.5; }
  .info-label { min-width: 100px; font-weight: bold; }
  .items-table th { font-size: 9pt; font-weight: bold; text-align: center; padding: 4px; border-bottom: 2px solid #000; border-right: 1px solid #ccc; background: #f5f5f5; }
  .items-table th:last-child { border-right: none; }
  .data-row td { font-size: 9pt; padding: 4px 5px; border-bottom: 1px solid #ddd; border-right: 1px solid #eee; }
  .data-row td:last-child { border-right: none; }
  .footer-section { border-top: 2px solid #000; padding: 6px 10px; display: flex; justify-content: space-between; }
  .disclaimer { text-align: center; font-size: 7pt; color: #888; padding: 2px; border-top: 1px solid #000; }
</style>
</head><body>
<div class="outer-border">
  <div class="header-section"><div class="company-name">${escapeHtml(company.companyName)}</div></div>
  <div class="title-bar">COLOUR CODE COMPLIANCE LIST</div>
  <div class="info-grid">
    <div class="info-left">
      <div class="info-row"><span class="info-label">Ref. No.</span><span style="font-weight:bold">${escapeHtml(data.offerNo)}</span></div>
      <div class="info-row"><span class="info-label">Date</span><span>${formatDate(data.offerDate)}</span></div>
      ${data.poNumber ? `<div class="info-row"><span class="info-label">PO Number</span><span>${escapeHtml(data.poNumber)}</span></div>` : ""}
    </div>
    <div class="info-right">
      <div class="info-row"><span class="info-label">Client</span><span style="font-weight:bold">${escapeHtml(data.customer.name)}</span></div>
      ${data.inspectionLocation ? `<div class="info-row"><span class="info-label">Location</span><span>${escapeHtml(data.inspectionLocation)}</span></div>` : ""}
    </div>
  </div>

  <table class="items-table">
    <thead><tr>
      <th style="width:4%">S/N</th>
      <th style="width:14%">Product</th>
      <th style="width:14%">Material</th>
      <th style="width:9%">Size</th>
      <th style="width:11%">Heat No.</th>
      <th style="width:10%">Colour Code Req.</th>
      <th style="width:12%">Colour Code</th>
      <th style="width:10%">Compliance</th>
      <th style="width:16%">Remarks</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="footer-section">
    <div style="font-size:9pt"><strong>Checked By:</strong> ________________</div>
    <div style="font-size:9pt;text-align:right"><div style="font-weight:bold">For ${escapeHtml(company.companyName)}</div><div style="height:25px"></div><div>QC In-Charge</div></div>
  </div>
  <div class="disclaimer">Colour Code Compliance List | Ref: ${escapeHtml(data.offerNo)} | Items: ${data.items.length}</div>
</div>
</body></html>`;
}

// ==================== INSPECTION CRITERIA CHECKLIST ====================
interface CriteriaData {
  offerNo: string;
  offerDate: string | Date;
  poNumber?: string | null;
  customerName: string;
  inspectionLocation?: string | null;
  tpiAgencyName?: string | null;
  criteria: {
    sNo: number;
    parameter: string;
    value?: string | null;
    inspectionRequired: boolean;
    testingRequired: boolean;
    testType?: string | null;
    colourCodingRequired: boolean;
    inspectionLocation?: string | null;
    remarks?: string | null;
  }[];
}

export function generateCriteriaChecklistHtml(data: CriteriaData, company: CompanyInfo): string {
  const itemRows = data.criteria.map((c) => `<tr class="data-row">
    <td style="text-align:center">${c.sNo}</td>
    <td style="font-weight:bold">${escapeHtml(c.parameter)}</td>
    <td>${escapeHtml(c.value)}</td>
    <td style="text-align:center">${c.inspectionRequired ? '<span style="color:green;font-weight:bold">Yes</span>' : '<span style="color:#999">No</span>'}</td>
    <td style="text-align:center">${c.testingRequired ? '<span style="color:green;font-weight:bold">Yes</span>' : '<span style="color:#999">No</span>'}</td>
    <td style="text-align:center">${escapeHtml(c.testType) || '-'}</td>
    <td style="text-align:center">${c.colourCodingRequired ? '<span style="color:green;font-weight:bold">Yes</span>' : '<span style="color:#999">No</span>'}</td>
    <td style="text-align:center">${escapeHtml(c.inspectionLocation) || '-'}</td>
    <td></td>
    <td>${escapeHtml(c.remarks)}</td>
  </tr>`).join("\n");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @page { size: A4 landscape; margin: 5mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Calibri', sans-serif; font-size: 10pt; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { border-collapse: collapse; width: 100%; }
  td, th { padding: 3px 5px; vertical-align: middle; }
  .outer-border { border: 2px solid #000; }
  .header-section { border-bottom: 2px solid #000; padding: 6px 10px; text-align: center; }
  .company-name { font-size: 14pt; font-weight: bold; }
  .title-bar { background-color: #E8F5E9; text-align: center; font-size: 12pt; font-weight: bold; padding: 4px 0; border-bottom: 2px solid #000; }
  .info-grid { display: flex; border-bottom: 1px solid #000; padding: 4px 10px; }
  .info-left, .info-right { width: 50%; }
  .info-row { display: flex; font-size: 9pt; line-height: 1.5; }
  .info-label { min-width: 110px; font-weight: bold; }
  .items-table th { font-size: 8pt; font-weight: bold; text-align: center; padding: 4px 2px; border-bottom: 2px solid #000; border-right: 1px solid #ccc; background: #f5f5f5; }
  .items-table th:last-child { border-right: none; }
  .data-row td { font-size: 9pt; padding: 3px 4px; border-bottom: 1px solid #ddd; border-right: 1px solid #eee; }
  .data-row td:last-child { border-right: none; }
  .footer-section { border-top: 2px solid #000; padding: 6px 10px; display: flex; justify-content: space-between; }
  .disclaimer { text-align: center; font-size: 7pt; color: #888; padding: 2px; border-top: 1px solid #000; }
</style>
</head><body>
<div class="outer-border">
  <div class="header-section"><div class="company-name">${escapeHtml(company.companyName)}</div></div>
  <div class="title-bar">INSPECTION CRITERIA CHECKLIST</div>
  <div class="info-grid">
    <div class="info-left">
      <div class="info-row"><span class="info-label">Ref. No.</span><span style="font-weight:bold">${escapeHtml(data.offerNo)}</span></div>
      <div class="info-row"><span class="info-label">Date</span><span>${formatDate(data.offerDate)}</span></div>
      ${data.poNumber ? `<div class="info-row"><span class="info-label">PO Number</span><span>${escapeHtml(data.poNumber)}</span></div>` : ""}
    </div>
    <div class="info-right">
      <div class="info-row"><span class="info-label">Client</span><span style="font-weight:bold">${escapeHtml(data.customerName)}</span></div>
      ${data.inspectionLocation ? `<div class="info-row"><span class="info-label">Location</span><span>${escapeHtml(data.inspectionLocation)}</span></div>` : ""}
      ${data.tpiAgencyName ? `<div class="info-row"><span class="info-label">TPI Agency</span><span style="font-weight:bold">${escapeHtml(data.tpiAgencyName)}</span></div>` : ""}
    </div>
  </div>

  <table class="items-table">
    <thead><tr>
      <th style="width:4%">S/N</th>
      <th style="width:14%">Parameter</th>
      <th style="width:16%">Required Value / Spec</th>
      <th style="width:8%">Inspection Req.</th>
      <th style="width:8%">Testing Req.</th>
      <th style="width:8%">Test Type</th>
      <th style="width:8%">Colour Code</th>
      <th style="width:8%">Location</th>
      <th style="width:10%">Result</th>
      <th style="width:16%">Remarks</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="footer-section">
    <div style="font-size:9pt"><strong>Inspector:</strong> ________________</div>
    <div style="font-size:9pt"><strong>TPI Representative:</strong> ________________</div>
    <div style="font-size:9pt;text-align:right"><div style="font-weight:bold">For ${escapeHtml(company.companyName)}</div><div style="height:25px"></div><div>QC Manager</div></div>
  </div>
  <div class="disclaimer">Inspection Criteria Checklist | Ref: ${escapeHtml(data.offerNo)} | Parameters: ${data.criteria.length}</div>
</div>
</body></html>`;
}
