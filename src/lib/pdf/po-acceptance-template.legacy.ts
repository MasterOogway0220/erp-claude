// PO Acceptance Letter PDF Template — Portrait A4

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
  website?: string | null;
  companyLogoUrl?: string | null;
}

interface CustomerInfo {
  name: string;
  contactPerson?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  email?: string | null;
  phone?: string | null;
  gstNo?: string | null;
}

interface POAcceptanceData {
  acceptanceNo: string;
  acceptanceDate: string | Date;
  committedDeliveryDate: string | Date;
  remarks?: string | null;
  followUpName?: string | null;
  followUpEmail?: string | null;
  followUpPhone?: string | null;
  qualityName?: string | null;
  qualityEmail?: string | null;
  qualityPhone?: string | null;
  accountsName?: string | null;
  accountsEmail?: string | null;
  accountsPhone?: string | null;
  clientPO: {
    cpoNo: string;
    clientPoNumber: string;
    clientPoDate?: string | Date | null;
    projectName?: string | null;
    paymentTerms?: string | null;
    deliveryTerms?: string | null;
    currency: string;
    subtotal?: number | null;
    grandTotal?: number | null;
  };
  items: {
    sNo: number;
    product?: string | null;
    material?: string | null;
    additionalSpec?: string | null;
    sizeLabel?: string | null;
    ends?: string | null;
    uom?: string | null;
    qtyOrdered: number;
    unitRate: number;
    amount: number;
  }[];
  customer: CustomerInfo;
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatCurrency(value: number | null | undefined, currency: string): string {
  if (value === null || value === undefined) return "";
  const symbol = currency === "INR" ? "₹" : currency + " ";
  return `${symbol}${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generatePOAcceptanceLetterHtml(
  data: POAcceptanceData,
  company: CompanyInfo
): string {
  const companyAddress = [
    company.regAddressLine1,
    company.regAddressLine2,
    company.regCity,
    company.regState ? `${company.regState} - ${company.regPincode || ""}` : company.regPincode,
    company.regCountry,
  ].filter(Boolean).join(", ");

  const customerAddress = [
    data.customer.addressLine1,
    data.customer.addressLine2,
    data.customer.city,
    data.customer.state,
  ].filter(Boolean).join(", ");

  const currency = data.clientPO.currency || "INR";

  const itemRows = data.items.map((item) => `
    <tr>
      <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${item.sNo}</td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;">
        ${escapeHtml(item.product) || "-"}
        ${item.material ? `<br><span style="font-size:11px;color:#666;">${escapeHtml(item.material)}${item.additionalSpec ? ` / ${escapeHtml(item.additionalSpec)}` : ""}</span>` : ""}
      </td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${escapeHtml(item.sizeLabel) || "-"}</td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${item.qtyOrdered}</td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${escapeHtml(item.uom) || "-"}</td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:right;">${formatCurrency(item.unitRate, currency)}</td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:right;">${formatCurrency(item.amount, currency)}</td>
    </tr>
  `).join("");

  const contactRows: string[] = [];
  if (data.followUpName) {
    contactRows.push(`<tr><td style="padding:4px 8px;border:1px solid #d1d5db;">Follow-up</td><td style="padding:4px 8px;border:1px solid #d1d5db;">${escapeHtml(data.followUpName)}</td><td style="padding:4px 8px;border:1px solid #d1d5db;">${escapeHtml(data.followUpEmail)}</td><td style="padding:4px 8px;border:1px solid #d1d5db;">${escapeHtml(data.followUpPhone)}</td></tr>`);
  }
  if (data.qualityName) {
    contactRows.push(`<tr><td style="padding:4px 8px;border:1px solid #d1d5db;">Quality</td><td style="padding:4px 8px;border:1px solid #d1d5db;">${escapeHtml(data.qualityName)}</td><td style="padding:4px 8px;border:1px solid #d1d5db;">${escapeHtml(data.qualityEmail)}</td><td style="padding:4px 8px;border:1px solid #d1d5db;">${escapeHtml(data.qualityPhone)}</td></tr>`);
  }
  if (data.accountsName) {
    contactRows.push(`<tr><td style="padding:4px 8px;border:1px solid #d1d5db;">Accounts</td><td style="padding:4px 8px;border:1px solid #d1d5db;">${escapeHtml(data.accountsName)}</td><td style="padding:4px 8px;border:1px solid #d1d5db;">${escapeHtml(data.accountsEmail)}</td><td style="padding:4px 8px;border:1px solid #d1d5db;">${escapeHtml(data.accountsPhone)}</td></tr>`);
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PO Acceptance Letter - ${escapeHtml(data.acceptanceNo)}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    @media print { body { margin: 0; } }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.5; }
    table { border-collapse: collapse; width: 100%; }
    .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 12px; margin-bottom: 20px; }
    .header h1 { font-size: 20px; color: #1e40af; margin: 0 0 4px; }
    .header p { font-size: 11px; color: #64748b; margin: 2px 0; }
    .section-title { font-size: 14px; font-weight: bold; color: #1e40af; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin: 20px 0 10px; }
    .info-grid { display: flex; justify-content: space-between; margin-bottom: 16px; }
    .info-block { width: 48%; }
    .info-block p { margin: 2px 0; font-size: 12px; }
    .info-label { font-weight: bold; color: #475569; }
    .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(company.companyName)}</h1>
    <p>${escapeHtml(companyAddress)}</p>
    ${company.telephoneNo ? `<p>Tel: ${escapeHtml(company.telephoneNo)} | Email: ${escapeHtml(company.email)}</p>` : ""}
    ${company.website ? `<p>${escapeHtml(company.website)}</p>` : ""}
  </div>

  <h2 style="text-align:center;font-size:16px;color:#1e293b;margin:0 0 20px;">PURCHASE ORDER ACCEPTANCE</h2>

  <div class="info-grid">
    <div class="info-block">
      <p><span class="info-label">To:</span></p>
      <p><strong>${escapeHtml(data.customer.name)}</strong></p>
      ${data.customer.contactPerson ? `<p>Attn: ${escapeHtml(data.customer.contactPerson)}</p>` : ""}
      <p>${escapeHtml(customerAddress)}</p>
      ${data.customer.gstNo ? `<p>GSTIN: ${escapeHtml(data.customer.gstNo)}</p>` : ""}
    </div>
    <div class="info-block" style="text-align:right;">
      <p><span class="info-label">Acceptance No:</span> ${escapeHtml(data.acceptanceNo)}</p>
      <p><span class="info-label">Date:</span> ${formatDate(data.acceptanceDate)}</p>
      <p><span class="info-label">Your PO No:</span> ${escapeHtml(data.clientPO.clientPoNumber)}</p>
      ${data.clientPO.clientPoDate ? `<p><span class="info-label">PO Date:</span> ${formatDate(data.clientPO.clientPoDate)}</p>` : ""}
      ${data.clientPO.projectName ? `<p><span class="info-label">Project:</span> ${escapeHtml(data.clientPO.projectName)}</p>` : ""}
      <p><span class="info-label">Our Ref:</span> ${escapeHtml(data.clientPO.cpoNo)}</p>
    </div>
  </div>

  <p>Dear ${escapeHtml(data.customer.contactPerson) || "Sir/Madam"},</p>
  <p>We acknowledge receipt of your Purchase Order No. <strong>${escapeHtml(data.clientPO.clientPoNumber)}</strong>${data.clientPO.clientPoDate ? ` dated <strong>${formatDate(data.clientPO.clientPoDate)}</strong>` : ""} and are pleased to confirm our acceptance of the same.</p>
  <p>The committed delivery date for this order is <strong>${formatDate(data.committedDeliveryDate)}</strong>.</p>

  <div class="section-title">Order Details</div>
  <table>
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;width:40px;">S.No</th>
        <th style="padding:6px 8px;border:1px solid #d1d5db;">Product Description</th>
        <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">Size</th>
        <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">Qty</th>
        <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">UOM</th>
        <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:right;">Rate</th>
        <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
    <tfoot>
      <tr style="background:#f8fafc;font-weight:bold;">
        <td colspan="6" style="padding:6px 8px;border:1px solid #d1d5db;text-align:right;">Total:</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:right;">${formatCurrency(data.clientPO.grandTotal, currency)}</td>
      </tr>
    </tfoot>
  </table>

  ${data.clientPO.paymentTerms || data.clientPO.deliveryTerms ? `
  <div class="section-title">Terms</div>
  <table>
    ${data.clientPO.paymentTerms ? `<tr><td style="padding:4px 8px;width:140px;font-weight:bold;">Payment Terms:</td><td style="padding:4px 8px;">${escapeHtml(data.clientPO.paymentTerms)}</td></tr>` : ""}
    ${data.clientPO.deliveryTerms ? `<tr><td style="padding:4px 8px;width:140px;font-weight:bold;">Delivery Terms:</td><td style="padding:4px 8px;">${escapeHtml(data.clientPO.deliveryTerms)}</td></tr>` : ""}
  </table>
  ` : ""}

  ${contactRows.length > 0 ? `
  <div class="section-title">Contact Persons</div>
  <table>
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="padding:4px 8px;border:1px solid #d1d5db;">Department</th>
        <th style="padding:4px 8px;border:1px solid #d1d5db;">Name</th>
        <th style="padding:4px 8px;border:1px solid #d1d5db;">Email</th>
        <th style="padding:4px 8px;border:1px solid #d1d5db;">Phone</th>
      </tr>
    </thead>
    <tbody>
      ${contactRows.join("")}
    </tbody>
  </table>
  ` : ""}

  ${data.remarks ? `<p style="margin-top:16px;"><strong>Remarks:</strong> ${escapeHtml(data.remarks)}</p>` : ""}

  <div style="margin-top:40px;">
    <p>Thanking you,</p>
    <p style="margin-top:40px;">
      <strong>For ${escapeHtml(company.companyName)}</strong><br>
      <span style="color:#64748b;">Authorized Signatory</span>
    </p>
  </div>

  <div class="footer">
    This is a system generated document from ${escapeHtml(company.companyName)}
  </div>
</body>
</html>`;
}
