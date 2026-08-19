// Standard Quotation PDF Template — Landscape A4, matches the client's standard
// format (QTN-Rev.2): S/N, Product, Specification, Dim., Add. Spec., Size,
// Length, Ends, Qty, Unit, Unit Rate, Amount, Delivery, Remark/Material Code

import { displaySizeLabel } from "../quotations/display";

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
  subtotal?: number | string | null;
  additionalDiscount?: number | string | null;
  discountAmount?: number | string | null;
  totalAfterDiscount?: number | string | null;
  taxRate?: number | string | null;
  taxAmount?: number | string | null;
  rcmEnabled?: boolean;
  roundOff?: boolean;
  roundOffAmount?: number | string | null;
  grandTotal?: number | string | null;
  advanceToPay?: number | string | null;
  items: any[];
  terms: any[];
}

// Verbatim from the client's STANDARD QUOTATION FORMAT.xlsx (RFQ sheet)
const fixedNotes = [
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

function esc(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmt(val: any, decimals: number = 2): string {
  const num = parseFloat(val);
  if (isNaN(num)) return "";
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtPlain(val: any, decimals: number = 2): string {
  const num = parseFloat(val);
  if (isNaN(num)) return "";
  return num.toFixed(decimals);
}

export function generateStandardQuotationHtml(
  quotation: QuotationData,
  company: CompanyInfo,
  variant: "QUOTED" | "UNQUOTED" = "QUOTED"
): string {
  const isUnquoted = variant === "UNQUOTED";
  const curr = quotation.currency || "INR";

  // Determine the UOM from items (use first item's uom or default to Mtr)
  const defaultUom = quotation.items[0]?.uom || "Mtr";

  const totalQty = quotation.items.reduce(
    (sum: number, item: any) => sum + (parseFloat(item.quantity) || 0),
    0
  );
  const totalAmount = quotation.items.reduce(
    (sum: number, item: any) => sum + (parseFloat(item.amount) || 0),
    0
  );

  const includedTerms = quotation.terms.filter((t: any) => t.isIncluded !== false);

  // Customer address parts
  const customerAddress = [
    quotation.customer.addressLine1,
    quotation.customer.addressLine2,
    [quotation.customer.city, quotation.customer.state, quotation.customer.pincode].filter(Boolean).join(", "),
  ].filter(Boolean).join(", ");

  const customerCountry = quotation.customer.country || "";

  const footerAddress = `Regd. Address: ${[
    company.regAddressLine1,
    company.regAddressLine2,
    company.regCity,
    company.regState ? `${company.regState} - ${company.regPincode || ""}` : company.regPincode,
    company.regCountry,
  ].filter(Boolean).join(", ")}`;

  const footerContact = [
    company.telephoneNo ? `Tel. ${company.telephoneNo}` : null,
    company.email ? `Email: ${company.email}` : null,
    company.website ? `Web: ${company.website}` : null,
  ].filter(Boolean).join(" ");

  // UOM as printed in the Unit column of the standard format.
  const unitLabel = (uom: string) => (uom === "Mtr" || uom === "Nos" ? `${uom}.` : uom);

  // Build item rows with individual columns
  const itemRows = quotation.items
    .map((item: any) => {
      const materialCode = item.materialCode?.code || item.materialCodeLabel || "";
      const uom = item.uom || defaultUom;
      const remarkCode = [item.remark, materialCode].filter(Boolean).join(" / ");
      // A regretted line is one we declined to quote — print REGRET where the
      // price would go rather than a blank or a token 1.00.
      const rateDisplay = item.isRegret
        ? '<b>REGRET</b>'
        : isUnquoted ? '<b>QUOTED</b>' : fmtPlain(item.unitRate, 2);
      const amountDisplay = item.isRegret
        ? 'REGRET'
        : isUnquoted ? 'QUOTED' : fmt(item.amount, 2);

      return `<tr>
        <td class="c" style="background-color:#d9d9d9;">${item.slNo ? esc(item.slNo) : item.sNo}</td>
        <td class="l">${esc(item.product)}</td>
        <td class="l">${esc(item.material)}</td>
        <td class="c">${esc(item.dimStandard) || "-"}</td>
        <td class="l">${esc(item.additionalSpec) || "-"}</td>
        <td class="c">${esc(displaySizeLabel(item))}</td>
        <td class="c">${esc(item.length) || "-"}</td>
        <td class="c">${esc(item.ends) || "-"}</td>
        <td class="r">${fmtPlain(item.quantity, 2)}</td>
        <td class="c">${esc(unitLabel(uom))}</td>
        <td class="r">${rateDisplay}</td>
        <td class="r">${amountDisplay}</td>
        <td class="c">${esc(item.delivery) || ""}</td>
        <td class="l small">${esc(remarkCode)}</td>
      </tr>`;
    })
    .join("\n");

  // Build term rows - aligned closer
  const termRows = includedTerms
    .map((term: any, i: number) => {
      return `<tr class="term-row">
        <td class="term-no">${i + 1}</td>
        <td class="term-name">${esc(term.termName)}</td>
        <td class="term-val">: ${esc(term.termValue)}</td>
      </tr>`;
    })
    .join("\n");

  // Build note rows — "1)" numbering per the client's format sheet
  const noteRows = fixedNotes
    .map((note, i) => `<tr class="note-row"><td colspan="3">${i + 1}) ${esc(note)}</td></tr>`)
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: 297mm 230mm;
    margin: 6mm 8mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
    font-size: 8.5pt;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Main table */
  table.main { border-collapse: collapse; width: 100%; }
  table.main td, table.main th {
    border: 1px solid #000;
    padding: 1px 3px;
    vertical-align: middle;
    font-size: 8.5pt;
  }

  /* Header info table */
  table.info { border-collapse: collapse; width: 100%; }
  table.info td {
    border: 1px solid #000;
    padding: 2px 5px;
    font-size: 8.5pt;
    vertical-align: top;
  }
  .info-label { font-weight: normal; }
  .info-val { font-weight: normal; }
  .bold { font-weight: bold; }

  /* Grey header — 15% grey for S/N column styling */
  .hdr th {
    background-color: #d9d9d9 !important;
    color: #000;
    font-weight: bold;
    font-size: 8pt;
    text-align: center;
    padding: 3px 2px;
    border: 1px solid #000;
  }

  /* Data cells */
  table.main .c { text-align: center; }
  table.main .l { text-align: left; }
  table.main .r { text-align: right; }
  table.main .small { font-size: 7.5pt; }

  /* Total row */
  .total-row td {
    font-weight: bold;
    background: #f5f5f5;
  }

  /* Financial summary - compact inline */
  .fin-summary { border-collapse: collapse; margin-top: 2px; }
  .fin-summary td {
    padding: 0px 4px;
    font-size: 8pt;
    border: none;
    line-height: 1.3;
  }
  .fin-summary .lbl { text-align: right; font-weight: normal; }
  .fin-summary .val { text-align: right; font-weight: bold; }

  /* Terms - tight alignment, no gap */
  table.terms { border-collapse: collapse; width: 100%; margin-top: 4px; table-layout: fixed; }
  table.terms td { border: none; padding: 0.5px 2px; font-size: 8.5pt; vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; }
  .terms-title { font-weight: bold; font-size: 9pt; padding: 4px 0 2px 0 !important; text-decoration: underline; }
  .term-no { width: 18px; text-align: right; padding-right: 2px !important; }
  .term-name { font-weight: bold; width: 28%; padding-right: 0px !important; }
  .term-val { font-weight: normal; padding-left: 2px !important; }

  /* Notes */
  .notes-title { font-weight: bold; font-size: 9pt; padding: 4px 0 2px 0 !important; text-decoration: underline; }
  .note-row td { font-size: 8pt; padding: 0.5px 4px; border: none; }

  /* Footer */
  .footer-bar {
    border-top: 1.5px solid #000;
    border-bottom: 1.5px solid #000;
    margin-top: 4px;
    padding: 2px 0;
    display: flex;
    justify-content: space-between;
    font-size: 7pt;
  }
  .footer-appreciation {
    text-align: center;
    font-size: 7.5pt;
    font-weight: bold;
    padding: 3px 0;
    border-bottom: 1px solid #000;
  }
  .footer-address {
    text-align: center;
    font-size: 7.5pt;
    padding: 3px 0;
    border-bottom: 1px solid #000;
    line-height: 1.3;
  }
  .keep-together { page-break-inside: avoid; }
</style>
</head>
<body>

<!-- HEADER: Logo row — ISO logo left, Company logo right -->
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
  <div style="font-size:10pt;">
    ${company.isoLogoUrl
      ? `<img src="${company.isoLogoUrl}" alt="ISO" style="max-height:75px;">`
      : `<span style="font-size:8pt;color:#666;">ISO 9001:2015 | ISO 14001:2015 | ISO 45001:2018</span>`
    }
  </div>
  <div style="text-align:right;">
    ${company.companyLogoUrl
      ? `<img src="${company.companyLogoUrl}" alt="Logo" style="max-height:50px;">`
      : `<span style="font-size:18pt;font-weight:bold;color:#548235;font-family:'Calibri',sans-serif;">${esc(company.companyName)}</span>`
    }
  </div>
</div>

<!-- CUSTOMER INFO GRID — labels in their own column with a rule after them,
     so all values start on one aligned edge (per the client's format) -->
<table class="info">
  <colgroup>
    <col style="width:8%"><col style="width:37%">
    <col style="width:9%"><col style="width:16%">
    <col style="width:11%"><col style="width:19%">
  </colgroup>
  <tr>
    <td class="bold">Customer<span style="float:right">:</span></td><td class="bold">${esc(quotation.customer.name)}</td>
    <td>Inquiry no.<span style="float:right">:</span></td><td>${esc((quotation.inquiryNo || "").trim())}</td>
    <td>Quotation No.<span style="float:right">:</span></td><td class="bold">${esc(quotation.quotationNo)}</td>
  </tr>
  <tr>
    <td>Address<span style="float:right">:</span></td><td>${esc(customerAddress)}</td>
    <td>Date<span style="float:right">:</span></td><td>${formatDate(quotation.inquiryDate)}</td>
    <td>Date<span style="float:right">:</span></td><td>${formatDate(quotation.quotationDate)}</td>
  </tr>
  <tr>
    <td>Country<span style="float:right">:</span></td><td>${esc(customerCountry)}</td>
    <td></td><td></td>
    <td></td><td></td>
  </tr>
  <tr>
    <td>Attn.<span style="float:right">:</span></td><td>${esc(quotation.buyer?.buyerName || quotation.customer.contactPerson)}</td>
    <td>Designation<span style="float:right">:</span></td><td>${esc(quotation.buyer?.designation)}</td>
    <td>Contact<span style="float:right">:</span></td><td>${esc(quotation.preparedBy?.name)}</td>
  </tr>
  <tr>
    <td>Email<span style="float:right">:</span></td><td>${esc(quotation.buyer?.email || quotation.customer.email)}</td>
    <td>Contact no.<span style="float:right">:</span></td><td>${esc(quotation.buyer?.mobile || quotation.buyer?.telephone || quotation.customer.phone)}</td>
    <td>Email<span style="float:right">:</span></td><td>${esc(quotation.preparedBy?.email)}</td>
  </tr>
</table>

<!-- QUOTATION SHEET HEADING -->
<div style="text-align:center;font-size:10pt;font-weight:bold;padding:4px 0 3px 0;border:1px solid #000;border-top:none;background:#f9f9f9;">
  Quotation Sheet${quotation.version && quotation.version > 0 ? ` (Revision ${quotation.version})` : ""}
</div>

<!-- ITEMS TABLE -->
<table class="main">
  <!-- Widths follow the format sheet's column spans: Product 2 grid cols,
       Size 3 grid cols — Size is the widest data column. -->
  <colgroup>
    <col style="width:3%">
    <col style="width:11%">
    <col style="width:9.5%">
    <col style="width:6.5%">
    <col style="width:8%">
    <col style="width:14%">
    <col style="width:6%">
    <col style="width:4%">
    <col style="width:4.5%">
    <col style="width:3.5%">
    <col style="width:7.5%">
    <col style="width:8.5%">
    <col style="width:6.5%">
    <col style="width:7.5%">
  </colgroup>
  <tr class="hdr">
    <th>S/N</th>
    <th>Product</th>
    <th>Specification</th>
    <th>Dim.</th>
    <th>Add. Spec.</th>
    <th>Size</th>
    <th>Length</th>
    <th>Ends</th>
    <th>Qty</th>
    <th>Unit</th>
    <th>Unit Rate<br>${esc(curr)}/Unit</th>
    <th>Amount<br>(${esc(curr)}.)</th>
    <th>Delivery<br>(Ex-works)</th>
    <th>Remark/<br>Material Code</th>
  </tr>

  ${itemRows}

  <tr class="total-row">
    <td class="c" colspan="8">Total</td>
    <td class="r">${fmtPlain(totalQty, 2)}</td>
    <td></td>
    <td></td>
    <td class="r">${isUnquoted ? 'QUOTED' : fmt(totalAmount, 2)}</td>
    <td></td>
    <td></td>
  </tr>
</table>

<!-- REMARKS (per client format: heading line between total and terms) -->
<div style="font-size:8.5pt;font-weight:bold;padding:6px 0 2px 0;">Remarks: </div>

<!-- OFFER TERMS -->
<table class="terms">
  <colgroup><col style="width:18px"><col style="width:28%"><col></colgroup>
  <tr><td colspan="3" class="terms-title">OFFER TERMS:</td></tr>
  ${termRows}
</table>

<!-- NOTES -->
<table class="terms">
  <tr><td colspan="3" class="notes-title">NOTES:</td></tr>
  ${noteRows}
</table>

<!-- FOOTER -->
<div class="footer-bar">
  <span>This is a computer generated document hence not signed.</span>
  <span>FORMAT: QTN-Rev.2, Dated: 19/12/2012</span>
</div>
<div class="footer-appreciation">
  YOUR ORDER WILL BE GREATLY APPRECIATED AND WILL RECEIVE OUR PROMPT AND CAREFUL ATTENTION.
</div>
<div class="footer-address">
  <b>${esc(footerAddress)}. ${esc(footerContact)}</b>
</div>

</body>
</html>`;
}
