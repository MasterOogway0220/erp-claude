// Standard Quotation PDF Template — Landscape A4, matches N-Pipe Solutions format
// Separate columns: S/N, Product, Material, Additional Spec, Size, OD, WT, Length, Ends, Qty, Unit Rate, Amount, Delivery, Remark/Material Code

import { numberToWords } from "../amount-in-words";

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
  items: any[];
  terms: any[];
}

const fixedNotes = [
  "This quotation is subject to our final confirmation at the time of order placement.",
  "Prices are subject to review in the event of any change in item scope or quantities.",
  "Invoicing shall be based on the actual quantity supplied at the agreed unit rates.",
  "The delivery / shipping schedule shall be calculated based on the number of business days from the date of receipt of a clear techno-commercial Purchase Order (PO).",
  "Supply shall be made as close as reasonably possible to the requested quantities, in accordance with standard manufacturing tolerances and available fixed lengths.",
  "Once a Purchase Order is placed, cancellation shall not be permitted under any circumstances.",
  "The quoted specifications conform to standard industry practices and applicable specifications, without any supplementary requirements unless explicitly stated in this offer.",
  "Reduction in ordered quantity after placement of Purchase Order shall not be accepted. Any increase in quantity shall be subject to our review and acceptance.",
  "In the event of any change in Government duties, taxes, levies, or policies, the quoted prices shall be subject to revision accordingly.",
  "In case of Force Majeure events, we shall not be liable for any delay or failure in performance due to unforeseen events beyond our control, and delivery schedules shall be adjusted accordingly.",
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

  // Build item rows with individual columns
  const itemRows = quotation.items
    .map((item: any) => {
      const materialCode = item.materialCode?.code || item.materialCodeLabel || "";
      const uom = item.uom || defaultUom;

      return `<tr>
        <td class="c">${item.sNo}</td>
        <td class="l">${esc(item.product)}</td>
        <td class="l">${esc(item.material)}</td>
        <td class="l">${esc(item.additionalSpec)}</td>
        <td class="c">${esc(item.sizeLabel || "")}</td>
        <td class="c">${item.od ? fmtPlain(item.od, 1) : ""}</td>
        <td class="c">${item.wt ? fmtPlain(item.wt, 2) : ""}</td>
        <td class="c">${esc(item.length)}</td>
        <td class="c">${esc(item.ends)}</td>
        <td class="r">${fmtPlain(item.quantity, 2)}</td>
        <td class="r">${isUnquoted ? '<b>QUOTED</b>' : fmtPlain(item.unitRate, 2)}</td>
        <td class="r">${isUnquoted ? 'QUOTED' : fmt(item.amount, 2)}</td>
        <td class="c">${esc(item.delivery) || ""}</td>
        <td class="l small">${esc(materialCode)}</td>
      </tr>`;
    })
    .join("\n");

  // Build term rows - aligned closer
  const termRows = includedTerms
    .map((term: any, i: number) => {
      return `<tr class="term-row">
        <td class="term-no">${i + 1}.</td>
        <td class="term-name">${esc(term.termName)}</td>
        <td class="term-val">: ${esc(term.termValue)}</td>
      </tr>`;
    })
    .join("\n");

  // Build note rows
  const noteRows = fixedNotes
    .map((note, i) => `<tr class="note-row"><td colspan="3">${i + 1}. ${esc(note)}</td></tr>`)
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

  /* Financial summary - compact */
  .fin-summary { border-collapse: collapse; margin-top: 2px; }
  .fin-summary td {
    padding: 1px 6px;
    font-size: 8.5pt;
    border: none;
  }
  .fin-summary .lbl { text-align: right; font-weight: normal; }
  .fin-summary .val { text-align: right; font-weight: bold; }

  /* Terms - tighter alignment */
  table.terms { border-collapse: collapse; width: 100%; margin-top: 4px; }
  table.terms td { border: none; padding: 0.5px 2px; font-size: 8.5pt; vertical-align: top; }
  .terms-title { font-weight: bold; font-size: 9pt; padding: 4px 0 2px 0 !important; text-decoration: underline; }
  .term-no { width: 18px; text-align: right; padding-right: 3px !important; }
  .term-name { font-weight: bold; white-space: nowrap; padding-right: 2px !important; }
  .term-val { font-weight: normal; }

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
  .page-no {
    text-align: center;
    font-size: 7.5pt;
    padding: 1px 0;
  }

  .keep-together { page-break-inside: avoid; }
</style>
</head>
<body>

<!-- HEADER: Logo row — ISO logo left, Company logo right -->
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
  <div style="font-size:10pt;">
    ${company.isoLogoUrl
      ? `<img src="${company.isoLogoUrl}" alt="ISO" style="max-height:50px;">`
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

<!-- CUSTOMER INFO GRID -->
<table class="info">
  <tr>
    <td style="width:45%"><span class="info-label">Customer</span>&nbsp;&nbsp;: <b>${esc(quotation.customer.name)}</b></td>
    <td style="width:25%"><span class="info-label">Inquiry no.</span>&nbsp;&nbsp;: ${esc(quotation.inquiryNo)}</td>
    <td style="width:30%"><span class="info-label">Quotation No.</span>&nbsp;&nbsp;: <b>${esc(quotation.quotationNo)}</b></td>
  </tr>
  <tr>
    <td><span class="info-label">Address</span>&nbsp;&nbsp;${esc(customerAddress)}</td>
    <td><span class="info-label">Date</span>&nbsp;&nbsp;: ${formatDate(quotation.inquiryDate)}</td>
    <td><span class="info-label">Date</span>&nbsp;&nbsp;: ${formatDate(quotation.quotationDate)}</td>
  </tr>
  <tr>
    <td><span class="info-label">Country</span>&nbsp;&nbsp;${esc(customerCountry)}</td>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td><span class="info-label">Attn.</span>&nbsp;&nbsp;: ${esc(quotation.buyer?.buyerName || quotation.customer.contactPerson)}</td>
    <td><span class="info-label">Designation</span>&nbsp;&nbsp;: ${esc(quotation.buyer?.designation)}</td>
    <td><span class="info-label">Contact</span>&nbsp;&nbsp;: ${esc(quotation.preparedBy?.name)}</td>
  </tr>
  <tr>
    <td><span class="info-label">Email</span>&nbsp;&nbsp;: ${esc(quotation.buyer?.email || quotation.customer.email)}</td>
    <td><span class="info-label">Contact no.</span>&nbsp;&nbsp;: ${esc(quotation.buyer?.mobile || quotation.buyer?.telephone || quotation.customer.phone)}</td>
    <td><span class="info-label">Email</span>&nbsp;&nbsp;: ${esc(quotation.preparedBy?.email)}</td>
  </tr>
</table>

<!-- QUOTATION SHEET HEADING -->
<div style="text-align:center;font-size:10pt;font-weight:bold;padding:4px 0 3px 0;border:1px solid #000;border-top:none;background:#f9f9f9;">
  Quotation Sheet${quotation.version && quotation.version > 0 ? ` (Revision ${quotation.version})` : ""}
</div>

<!-- ITEMS TABLE -->
<table class="main">
  <colgroup>
    <col style="width:3%">
    <col style="width:10%">
    <col style="width:10%">
    <col style="width:10%">
    <col style="width:9%">
    <col style="width:5%">
    <col style="width:4.5%">
    <col style="width:6%">
    <col style="width:3.5%">
    <col style="width:6.5%">
    <col style="width:7%">
    <col style="width:8.5%">
    <col style="width:7%">
    <col style="width:10%">
  </colgroup>
  <tr class="hdr">
    <th>S/N</th>
    <th>Product</th>
    <th>Material</th>
    <th>Additional Spec.</th>
    <th>Size</th>
    <th>OD<br>(mm)</th>
    <th>W.T.<br>(mm)</th>
    <th>Length<br>(Mtr.)</th>
    <th>Ends</th>
    <th>Qty<br>(${esc(defaultUom)})</th>
    <th>Unit Rate<br>${esc(curr)}/${esc(defaultUom)}</th>
    <th>Amount<br>(${esc(curr)}.)</th>
    <th>Delivery<br>(Ex-works)</th>
    <th>Material Code</th>
  </tr>

  ${itemRows}

  <!-- Total row -->
  <tr class="total-row">
    <td class="c" colspan="9"><b>Total</b></td>
    <td class="r"><b>${fmtPlain(totalQty, 2)}</b></td>
    <td></td>
    <td class="r"><b>${isUnquoted ? "" : fmt(totalAmount, 2)}</b></td>
    <td colspan="2"></td>
  </tr>
</table>

${!isUnquoted ? `
<div style="font-size:9pt;padding:4px 0;text-align:left;">
  <b>Amount in Words:</b> ${esc(numberToWords(totalAmount, curr))}
</div>` : ""}

<!-- OFFER TERMS -->
<table class="terms">
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
  <span>FORMAT: ${quotation.version && quotation.version > 0 ? `QTN-Rev.${quotation.version}` : `QTN-${esc(quotation.quotationNo)}`}, Dated: ${formatDate(quotation.quotationDate)}</span>
</div>
<div class="footer-appreciation">
  YOUR ORDER WILL BE GREATLY APPRECIATED AND WILL RECEIVE OUR PROMPT AND CAREFUL ATTENTION.
</div>
<div class="footer-address">
  <b>${esc(footerAddress)}. ${esc(footerContact)}</b>
</div>
<div class="page-no">Page 1 of 1</div>

</body>
</html>`;
}
