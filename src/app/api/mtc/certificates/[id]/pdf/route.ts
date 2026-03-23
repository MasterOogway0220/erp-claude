import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { renderHtmlToPdf } from "@/lib/pdf/render-pdf";
import { wrapHtmlForPrint } from "@/lib/pdf/print-wrapper";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

function fmtDate(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function esc(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Format a numeric value — show significant digits, strip trailing zeros past 2dp */
function v(val: any, minDec: number = 2, maxDec: number = 3): string {
  if (val === null || val === undefined || val === "") return "";
  const num = typeof val === "number" ? val : parseFloat(String(val));
  if (isNaN(num)) return String(val);
  // Use maxDec then strip unnecessary trailing zeros (keep at least minDec)
  let s = num.toFixed(maxDec);
  // Remove trailing zeros beyond minDec
  if (maxDec > minDec) {
    const dotIdx = s.indexOf(".");
    if (dotIdx >= 0) {
      let end = s.length;
      while (end > dotIdx + minDec + 1 && s[end - 1] === "0") end--;
      s = s.substring(0, end);
    }
  }
  return s;
}

function vd(val: any, minDec: number = 2, maxDec: number = 3): string {
  return v(val, minDec, maxDec) || "--";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response, companyId } = await checkAccess("mtc", "read");
    if (!authorized) return response!;
    const { id } = await params;

    const certificate = await prisma.mTCCertificate.findFirst({
      where: { id, ...companyFilter(companyId) },
      include: {
        customer: true,
        materialSpecRef: true,
        items: {
          include: {
            chemicalResults: { orderBy: { sortOrder: "asc" } },
            mechanicalResults: { orderBy: { sortOrder: "asc" } },
            impactResults: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!certificate) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    const company = await prisma.companyMaster.findFirst();
    const origin = request.nextUrl.origin || "";
    let companyLogoUrl = (company as any)?.companyLogoUrl || "";
    let isoLogoUrl = (company as any)?.isoLogoUrl || "";
    if (companyLogoUrl && companyLogoUrl.startsWith("/")) companyLogoUrl = `${origin}${companyLogoUrl}`;
    if (isoLogoUrl && isoLogoUrl.startsWith("/")) isoLogoUrl = `${origin}${isoLogoUrl}`;

    const chemElements = certificate.items[0]?.chemicalResults?.map((cr) => cr.element) || [];
    const mechProps = certificate.items[0]?.mechanicalResults?.map((mr) => ({
      name: mr.propertyName, unit: mr.unit,
    })) || [];

    const html = generateHTML(certificate, company, chemElements, mechProps, companyLogoUrl, isoLogoUrl);

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    // HTML preview mode
    if (format === "html") {
      return new NextResponse(wrapHtmlForPrint(html, true), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // PDF download mode (via Puppeteer)
    const pdfBuffer = await renderHtmlToPdf(html, true);
    const certNo = (certificate.certificateNo || "MTC").replace(/\//g, "-");
    const customer = (certificate.customerName || "").toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim();
    const filename = `MTC-${certNo}-${customer}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating MTC PDF:", error);
    return NextResponse.json({ error: "Failed to generate MTC PDF" }, { status: 500 });
  }
}

function generateHTML(
  cert: any, company: any, chemElements: string[],
  mechProps: { name: string; unit: string | null }[],
  companyLogoUrl: string, isoLogoUrl: string
): string {
  const items = cert.items || [];
  const hasImpact = items.some((it: any) => it.impactResults?.length > 0);

  const footerAddr1 = [
    "Regd. Office:",
    company?.regAddressLine1, company?.regAddressLine2,
    company?.regCity ? `${company.regCity} - ${company?.regPincode || ""}` : "",
    company?.regState, company?.regCountry,
  ].filter(Boolean).join(", ") +
    (company?.telephoneNo ? ` Tel.: ${company.telephoneNo}` : "") +
    (company?.fax ? `, Fax: ${company.fax}` : "");
  const footerAddr2 = company?.worksAddress || "";

  const notesLines = (cert.notes || "").split("\n").filter((l: string) => l.trim());
  const remarksLines = (cert.remarks || "").split("\n").filter((l: string) => l.trim());

  const itemsRows = items.map((item: any) => `<tr>
    <td class="c">${esc(String(item.itemNo))}</td>
    <td class="l">${esc(item.description || "")}</td>
    <td class="c">${esc(item.constructionType || "")}</td>
    <td class="c">${esc(item.dimensionStandard || "")}</td>
    <td class="c">${esc(item.sizeOD1 || "")}</td>
    <td class="c">${esc(item.sizeWT1 || "")}</td>
    <td class="c">${item.sizeOD2 ? esc(item.sizeOD2) : "-"}</td>
    <td class="c">${item.sizeWT2 ? esc(item.sizeWT2) : "-"}</td>
    <td class="c">${item.quantity || ""}</td>
    <td class="c">${esc(item.heatNo || "")}</td>
    <td class="c">${esc(item.rawMaterial || "")}</td>
  </tr>`).join("");

  const chemTable = buildChemicalTable(items, chemElements);
  const mechTable = buildMechanicalTable(items, mechProps, hasImpact);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>MTC - ${esc(cert.certificateNo)}</title>
<style>
  @page { size: A4 landscape; margin: 6mm 8mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 8pt; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #000; padding: 2px 4px; vertical-align: middle; font-size: 7.5pt; }
  th { background: #d9d9d9 !important; font-weight: bold; text-align: center; }
  .c { text-align: center; } .l { text-align: left; } .r { text-align: right; } .b { font-weight: bold; }
  .section-hdr { background: #d9d9d9 !important; text-align: center; font-weight: bold; font-size: 8pt; letter-spacing: 3px; padding: 3px; }
  .info td { font-size: 8pt; padding: 2px 5px; }
  .chem td, .chem th { font-size: 7pt; padding: 1px 3px; text-align: center; }
  .mech td, .mech th { font-size: 7pt; padding: 1px 3px; text-align: center; }
  .items td, .items th { font-size: 7pt; padding: 2px 3px; text-align: center; }
  .formula { font-size: 7pt; padding: 2px 6px; border: 1px solid #000; border-top: none; }
  .cert-stmt { font-size: 7.5pt; padding: 4px 6px; text-align: left; }
  .legends td { border: none; font-size: 7pt; padding: 0px 3px; }
  .sig-row td { border: none; font-size: 7pt; padding: 0; vertical-align: bottom; }
  .footer-bar { font-size: 6.5pt; text-align: center; padding: 3px 6px; border: 1px solid #000; margin-top: 2px; line-height: 1.3; }
  .fmt-ref { font-size: 6.5pt; display: flex; justify-content: space-between; margin-top: 2px; }
</style>
</head>
<body>

<!-- HEADER -->
<table style="border:none;margin-bottom:2px;">
<tr>
  <td style="border:none;width:15%;vertical-align:middle;padding:2px;">
    ${isoLogoUrl ? `<img src="${isoLogoUrl}" alt="ISO" style="max-height:45px;">` : `<span style="font-size:7pt;color:#666;">ISO 9001:2015<br>ISO 14001:2015<br>ISO 45001:2018</span>`}
  </td>
  <td style="border:none;text-align:center;vertical-align:middle;">
    <div style="font-size:14pt;font-weight:bold;letter-spacing:3px;">M I L L &nbsp; T E S T &nbsp; C E R T I F I C A T E</div>
    <div style="font-size:9pt;font-weight:bold;">EN 10204:2004 3.1 / ISO 10474:1991 3.1</div>
    <div style="font-size:7pt;font-style:italic;margin-top:2px;">Manufacturer of Pipes, Fittings &amp; Flanges in Carbon Steel, Alloy Steel, Stainless Steel, Duplex Steel &amp; Nickel Alloys</div>
  </td>
  <td style="border:none;width:15%;text-align:right;vertical-align:middle;padding:2px;">
    ${companyLogoUrl ? `<img src="${companyLogoUrl}" alt="Logo" style="max-height:50px;">` : `<span style="font-size:14pt;font-weight:bold;color:#003366;">${esc(company?.companyName || "NPS")}</span>`}
  </td>
</tr>
</table>

<!-- CUSTOMER DETAILS -->
<table class="info">
<tr><td style="width:14%">Customer</td><td style="width:36%" colspan="2"><b>${esc(cert.customerName || "")}</b></td><td style="width:14%">Certificate No.</td><td style="width:22%"><b>${esc(cert.certificateNo || "")}</b></td><td style="width:5%">Date</td><td style="width:9%">${fmtDate(cert.certificateDate)}</td></tr>
<tr><td>P.O. No. / P. R. No.</td><td colspan="2">${esc(cert.poNo || cert.quotationNo || "")}</td><td>Date</td><td colspan="2">${fmtDate(cert.poDate)}</td><td></td></tr>
<tr><td>Project Name</td><td colspan="2">${esc(cert.projectName || "-")}</td><td>Other Reference</td><td colspan="3">${esc(cert.otherReference || "")}</td></tr>
<tr><td>Material Specification</td><td colspan="2">${esc(cert.materialSpec || "")}</td><td>Starting Material</td><td colspan="3">${esc(cert.startingMaterial || "")}</td></tr>
<tr><td>Additional Requirement</td><td colspan="2">${esc(cert.additionalRequirement || "")}</td><td>Heat Treatment</td><td colspan="3">${esc(cert.heatTreatment || "")}</td></tr>
</table>

<!-- ITEM DETAILS -->
<table class="items">
<tr><th rowspan="2" style="width:4%">ITEM<br>NO.</th><th rowspan="2" style="width:18%">DESCRIPTION</th><th colspan="2">CONSTRUCTION</th><th colspan="4">SIZE</th><th rowspan="2" style="width:4%">QTY.<br>PCS.</th><th rowspan="2" style="width:8%">HEAT NO.</th><th rowspan="2" style="width:8%">RAW MATERIAL</th></tr>
<tr><th style="width:8%">TYPE</th><th style="width:10%">STANDARD</th><th style="width:7%">OD 1</th><th style="width:7%">WT 1</th><th style="width:5%">OD 2</th><th style="width:5%">WT 2</th></tr>
${itemsRows}
</table>

<!-- CHEMICAL COMPOSITION -->
${chemTable}
<div class="formula"><b>F1</b> = Cu+Ni+Cr+Mo &nbsp;&nbsp;;&nbsp;&nbsp; <b>CEQ</b> = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15</div>

<!-- MECHANICAL PROPERTIES -->
${mechTable}

<!-- CERTIFICATION -->
<table><tr><td class="cert-stmt">We hereby certify that the material herein manufactured, sampled, tested &amp; inspected in accordance with the above specification and requirements of Purchase order.</td></tr></table>

<!-- NOTES + LEGENDS -->
<table style="border:none;">
<tr>
  <td style="border:1px solid #000;width:40%;vertical-align:top;padding:3px 6px;font-size:7pt;">
    <b>Notes:</b><br>
    ${notesLines.length > 0 ? notesLines.map((n: string) => esc(n)).join("<br>") : "Visual &amp; Dimension : Satisfactory"}
  </td>
  <td style="border:1px solid #000;width:60%;vertical-align:top;padding:3px 4px;">
    <table class="legends">
      <tr><td colspan="6"><b>Legends :</b></td></tr>
      <tr><td><b>O</b></td><td>Orientation</td><td><b>S</b></td><td>Strip</td><td><b>H</b></td><td>Heat</td></tr>
      <tr><td><b>R</b></td><td>Round</td><td><b>RA</b></td><td>Reduction Area</td><td><b>P</b></td><td>Product</td></tr>
      <tr><td><b>W</b></td><td>Weld</td><td><b>N</b></td><td>Normalized</td><td><b>L</b></td><td>Longitudinal</td></tr>
      <tr><td><b>YS</b></td><td>Yield strength</td><td><b>N&amp;T</b></td><td>Normalize &amp; Tempered</td><td><b>T</b></td><td>Transverse</td></tr>
      <tr><td><b>TS</b></td><td>Tensile strength</td><td><b>Q</b></td><td>Quenched</td><td><b>B</b></td><td>Base</td></tr>
      <tr><td><b>EL</b></td><td>Elongation</td><td><b>ANL</b></td><td>Annealed</td><td></td><td></td></tr>
    </table>
  </td>
</tr>
</table>

${remarksLines.length > 0 ? `<table><tr><td style="padding:3px 6px;font-size:7pt;"><b>Remarks:</b><br>${remarksLines.map((r: string) => esc(r)).join("<br>")}</td></tr></table>` : ""}

<!-- SIGNATURES -->
<table style="border:none;margin-top:15px;">
<tr class="sig-row">
  <td style="width:5%"></td>
  <td style="width:20%;border-bottom:1px solid #000;padding-bottom:2px;">Reviewed by${cert.reviewedBy ? ` : ${esc(cert.reviewedBy)}` : " :"}</td>
  <td style="width:10%"></td>
  <td style="width:20%;border-bottom:1px solid #000;padding-bottom:2px;">Witnessed by${cert.witnessedBy ? ` : ${esc(cert.witnessedBy)}` : " :"}</td>
  <td style="width:5%"></td>
  <td style="width:15%;text-align:center;">Auth. Signatory</td>
  <td style="width:5%"></td>
  <td style="width:20%;text-align:right;">Incharge (QA / QC Dept.)</td>
</tr>
</table>

<div class="footer-bar">${esc(footerAddr1)}<br>${footerAddr2 ? esc(footerAddr2) : ""}</div>
<div class="fmt-ref"><span>Format: NPFI/QC/001-Rev.${cert.revision || 0}</span><span>Page 1 of 1</span></div>

</body>
</html>`;
}

/**
 * Chemical Composition table — matches the exact layout from the sample PDF.
 * Columns: ITEM | HEAT NO. | % | C | Mn | P | S | Si | Cr | Mo | Ni | Cu | V | F1 | CEQ
 * Per item: 4 rows — min, max, H (heat result), P (product result)
 */
function buildChemicalTable(items: any[], chemElements: string[]): string {
  if (chemElements.length === 0) return "";
  const colCount = 3 + chemElements.length;

  let html = `<table class="chem">`;
  // Section header
  html += `<tr><td colspan="${colCount}" class="section-hdr">C H E M I C A L &nbsp;&nbsp; C O M P O S I T I O N</td></tr>`;
  // Column headers
  html += `<tr><th style="width:4%">ITEM</th><th style="width:6%">HEAT NO.</th><th style="width:2.5%">%</th>`;
  html += chemElements.map((el) => `<th>${esc(el)}</th>`).join("");
  html += `</tr>`;

  for (const item of items) {
    const rMap = new Map<string, any>(item.chemicalResults.map((cr: any) => [cr.element, cr]));

    // min row
    html += `<tr><td rowspan="4" class="c b" style="background:#d9d9d9!important;">${item.itemNo}</td>`;
    html += `<td rowspan="4" class="c">${esc(item.heatNo || "")}</td>`;
    html += `<td class="c"><i>min.</i></td>`;
    html += chemElements.map((el) => { const r = rMap.get(el); return `<td>${r?.minValue != null ? v(r.minValue, 0, 3) : "--"}</td>`; }).join("");
    html += `</tr>`;

    // max row
    html += `<tr><td class="c"><i>max.</i></td>`;
    html += chemElements.map((el) => { const r = rMap.get(el); return `<td>${r?.maxValue != null ? v(r.maxValue, 0, 3) : "--"}</td>`; }).join("");
    html += `</tr>`;

    // H (heat) row
    html += `<tr><td class="c b">H</td>`;
    html += chemElements.map((el) => { const r = rMap.get(el); return `<td>${r?.heatResult != null ? v(r.heatResult, 2, 3) : ""}</td>`; }).join("");
    html += `</tr>`;

    // P (product) row
    html += `<tr><td class="c b">P</td>`;
    html += chemElements.map((el) => { const r = rMap.get(el); return `<td>${r?.productResult != null ? v(r.productResult, 2, 3) : ""}</td>`; }).join("");
    html += `</tr>`;
  }

  html += `</table>`;
  return html;
}

/**
 * Mechanical Properties table — matches the exact sample PDF layout.
 *
 * From the sample:
 * Row 1: "M E C H A N I C A L  P R O P E R T I E S" | "on Raw Material" | "✓ on Finished Material"
 * Row 2: TENSILE PROPERTIES | | | ROOM TEMP. | | | HARDNESS | IMPACT PROPERTIES | Client
 * Row 3: TEST METHOD | | ASTM A370 | | | | | | TEMPERATURE | | | | Item Code
 * Row 4: ITEM NO. | HEAT NO. | O | S | YS MPa | TS MPa | EL % | RA % | HB | (1)|(2)|(3) | Size(mm) | (1)|(2)|(3) | AVG. |
 *
 * Data per item (3 rows):
 *   min:    [item-rs3] [heat-rs3] min. | | | 240 | 415 | 30 | -- | | -- | | | ...
 *   max:                          max. | | | --  | --  | -- | -- | | 197| | | ...
 *   result:                       P    | L | R | 306.69 | 492.28 | 41.35 | | B | 143 | 144 | 144 | ...
 *
 * Key insight: There's a LABEL column between HEAT NO and O that shows min./max./P
 * And HB section has a TYPE column (B=Brinell) before the 3 readings
 */
function buildMechanicalTable(
  items: any[],
  mechProps: { name: string; unit: string | null }[],
  hasImpact: boolean
): string {
  if (mechProps.length === 0) return "";

  // Impact columns: SPECIMEN Size, (1), (2), (3), AVG = 5 cols
  const impCols = hasImpact ? 5 : 0;
  // Core cols: ITEM | HEAT NO | label | O | S | YS | TS | EL | RA | [HB type] | (1) | (2) | (3) | [impact 5] | Client
  // = 5 + 4 tensile + 1 hb_type + 3 hb_readings + impCols + 1 client = 14 + impCols
  const totalCols = 14 + impCols;

  let html = `<table class="mech">`;

  // ─── Row 1: Section header ───
  const leftSpan = 10; // up to before HB type
  const rightSpan = totalCols - leftSpan;
  html += `<tr>`;
  html += `<td colspan="${leftSpan}" class="section-hdr">M E C H A N I C A L &nbsp;&nbsp; P R O P E R T I E S</td>`;
  html += `<td class="c" style="background:#d9d9d9!important;font-size:6.5pt;">on Raw Material</td>`;
  html += `<td colspan="${rightSpan - 1}" class="c" style="background:#d9d9d9!important;font-size:6.5pt;">&#x2713; on Finished Material</td>`;
  html += `</tr>`;

  // ─── Row 2: Sub-section headers ───
  // TENSILE PROPERTIES spans cols 1-2, then blanks for label/O/S, then YS/TS/EL/RA=4
  html += `<tr>`;
  html += `<td colspan="2" class="c b" style="font-size:7pt;border-bottom:1px solid #000;">TENSILE PROPERTIES</td>`;
  html += `<td colspan="3"></td>`; // label, O, S
  html += `<td colspan="4"></td>`; // YS, TS, EL, RA
  html += `<td colspan="4" class="c b" style="font-size:7pt;">HARDNESS</td>`; // HB type + 3 readings
  html += hasImpact ? `<td colspan="${impCols}" class="c b" style="font-size:7pt;">IMPACT PROPERTIES</td>` : "";
  html += `<td class="c b" style="font-size:7pt;">Client</td>`;
  html += `</tr>`;

  // ─── Row 3: TEST METHOD sub-row ───
  html += `<tr>`;
  html += `<th style="font-size:6.5pt;">TEST METHOD</th>`;
  html += `<th></th>`; // HEAT NO col
  html += `<th style="font-size:6.5pt;">ASTM A370</th>`; // label col
  html += `<th colspan="2"></th>`; // O, S
  html += `<th style="font-size:6.5pt;">ROOM TEMP.</th>`; // YS area
  html += `<th colspan="3"></th>`; // TS, EL, RA
  html += `<th colspan="4"></th>`; // HB area
  html += hasImpact ? `<th style="font-size:6.5pt;">TEMPERATURE</th><th colspan="${impCols - 1}"></th>` : "";
  html += `<th style="font-size:6.5pt;">Item Code</th>`;
  html += `</tr>`;

  // ─── Row 4: Column headers ───
  html += `<tr>`;
  html += `<th>ITEM<br>NO.</th>`;
  html += `<th>HEAT NO.</th>`;
  html += `<th></th>`; // label col (min/max/P)
  html += `<th>O</th>`;
  html += `<th>S</th>`;
  html += `<th>YS<br>MPa</th>`;
  html += `<th>TS<br>MPa</th>`;
  html += `<th>EL<br>%</th>`;
  html += `<th>RA<br>%</th>`;
  html += `<th></th>`; // HB type indicator
  html += `<th>HB</th>`;
  html += `<th>(1)</th><th>(2)</th><th>(3)</th>`.replace("<th>(1)", "<th>(1)"); // Wait, sample has (1)(2)(3) as column headers for HB
  // Actually sample shows: HB column header is in row above. (1)(2)(3) are sub-headers.
  // Let me simplify: the 4 HB columns are: [blank/type], (1), (2), (3)
  html = html.replace(`<th></th><!-- HB type indicator -->\n`, ""); // clean up
  // Let me rebuild row 4 properly
  html = `<table class="mech">`;

  // Recalculate: ITEM | HEAT NO | label | O | S | YS | TS | EL | RA | HB(1) | HB(2) | HB(3) | [impact] | Client
  // Actually from the sample: before HB there's no separate type column visible. The HB readings are (1)(2)(3) in the header.
  // In the result row, position AY42=B is actually just the first HB reading identifier.
  // Let me look again: Row39 has BB39=(1), BG39=(2), BL39=(3). AY39 is empty. AY38=HB.
  // So HB is a group header spanning (1)(2)(3). In the data, AY is where "B" appears = Brinell indicator.
  // So: 4 cols for hardness area = [empty/B indicator] + (1) + (2) + (3)

  // Simpler approach: just use the exact column count from the sample
  // Cols: ITEM | HEAT NO | [label] | O | S | YS | TS | EL | RA | [HB indicator] | (1) | (2) | (3) | [impact cols] | Client
  // = 13 + impCols + 1 = 14 + impCols
  const TC = 14 + impCols;

  // Row 1: Section header
  html += `<tr>`;
  html += `<td colspan="${TC - 2}" class="section-hdr">M E C H A N I C A L &nbsp;&nbsp; P R O P E R T I E S</td>`;
  html += `<td class="c" style="background:#d9d9d9!important;font-size:6.5pt;">on Raw Material</td>`;
  html += `<td class="c" style="background:#d9d9d9!important;font-size:6.5pt;">&#x2713; on Finished Material</td>`;
  html += `</tr>`;

  // Row 2: Sub-group headers
  html += `<tr>`;
  html += `<td colspan="2" class="c b" style="font-size:7pt;">TENSILE PROPERTIES</td>`;
  html += `<td colspan="7"></td>`; // label, O, S, YS, TS, EL, RA
  html += `<td colspan="4" class="c b" style="font-size:7pt;">HARDNESS</td>`;
  html += hasImpact ? `<td colspan="${impCols}" class="c b" style="font-size:7pt;">IMPACT PROPERTIES</td>` : "";
  html += `<td class="c b" style="font-size:7pt;">Client</td>`;
  html += `</tr>`;

  // Row 3: TEST METHOD
  html += `<tr>`;
  html += `<th style="font-size:6.5pt;">TEST METHOD</th>`;
  html += `<th></th>`; // HEAT NO area
  html += `<th style="font-size:6.5pt;">ASTM A370</th>`; // label col
  html += `<th colspan="2"></th>`; // O, S
  html += `<th style="font-size:6.5pt;">ROOM TEMP.</th>`; // starts at YS
  html += `<th colspan="3"></th>`; // TS, EL, RA
  html += `<th colspan="4"></th>`; // HB area
  html += hasImpact ? `<th style="font-size:6.5pt;">TEMPERATURE</th><th colspan="${impCols - 1}"></th>` : "";
  html += `<th style="font-size:6.5pt;">Item Code</th>`;
  html += `</tr>`;

  // Row 4: Column headers
  html += `<tr>`;
  html += `<th>ITEM<br>NO.</th>`;
  html += `<th>HEAT NO.</th>`;
  html += `<th></th>`; // label col
  html += `<th>O</th>`;
  html += `<th>S</th>`;
  html += `<th>YS<br>MPa</th>`;
  html += `<th>TS<br>MPa</th>`;
  html += `<th>EL<br>%</th>`;
  html += `<th>RA<br>%</th>`;
  html += `<th></th>`; // HB indicator
  html += `<th>(1)</th>`;
  html += `<th>(2)</th>`;
  html += `<th>(3)</th>`;
  html += hasImpact ? `<th>Size (mm)</th><th>(1)</th><th>(2)</th><th>(3)</th><th>AVG.</th>` : "";
  html += `<th></th>`; // Client Item Code
  html += `</tr>`;

  // ─── Data rows per item (3 rows each) ───
  for (const item of items) {
    const mechMap = new Map<string, any>(item.mechanicalResults.map((mr: any) => [mr.propertyName, mr]));
    const find = (keyword: string) => {
      for (const [key, val] of mechMap) {
        if (key.toLowerCase().includes(keyword)) return val;
      }
      return null;
    };

    const ys = find("yield");
    const ts = find("tensile");
    const el = find("elongation");
    const ra = find("reduction");
    const hb = find("hardness");
    const impact = (item.impactResults || [])[0] || null;

    // ── min row ──
    html += `<tr>`;
    html += `<td rowspan="3" class="c b" style="background:#d9d9d9!important;">${item.itemNo}</td>`;
    html += `<td rowspan="3" class="c">${esc(item.heatNo || "")}</td>`;
    html += `<td class="c"><i>min.</i></td>`;
    html += `<td rowspan="3" class="c"></td>`; // O - empty for min/max, shown only in result
    html += `<td rowspan="3" class="c"></td>`; // S
    html += `<td class="c">${ys?.minValue != null ? v(ys.minValue, 0, 0) : "--"}</td>`;
    html += `<td class="c">${ts?.minValue != null ? v(ts.minValue, 0, 0) : "--"}</td>`;
    html += `<td class="c">${el?.minValue != null ? v(el.minValue, 0, 0) : "--"}</td>`;
    html += `<td class="c">${ra?.minValue != null ? v(ra.minValue, 0, 0) : "--"}</td>`;
    html += `<td colspan="4" class="c">--</td>`; // HB has no min
    html += hasImpact ? `<td rowspan="3" class="c">${impact?.specimenSize || ""}</td><td rowspan="3" class="c">${impact?.result1 != null ? v(impact.result1, 0, 0) : ""}</td><td rowspan="3" class="c">${impact?.result2 != null ? v(impact.result2, 0, 0) : ""}</td><td rowspan="3" class="c">${impact?.result3 != null ? v(impact.result3, 0, 0) : ""}</td><td rowspan="3" class="c b">${impact?.average != null ? v(impact.average, 0, 0) : ""}</td>` : "";
    html += `<td rowspan="3" class="c" style="font-size:6.5pt;">${esc(item.clientItemCode || "")}</td>`;
    html += `</tr>`;

    // ── max row ──
    html += `<tr>`;
    html += `<td class="c"><i>max.</i></td>`;
    html += `<td class="c">${ys?.maxValue != null ? v(ys.maxValue, 0, 0) : "--"}</td>`;
    html += `<td class="c">${ts?.maxValue != null ? v(ts.maxValue, 0, 0) : "--"}</td>`;
    html += `<td class="c">${el?.maxValue != null ? v(el.maxValue, 0, 0) : "--"}</td>`;
    html += `<td class="c">${ra?.maxValue != null ? v(ra.maxValue, 0, 0) : "--"}</td>`;
    html += `<td colspan="4" class="c">${hb?.maxValue != null ? v(hb.maxValue, 0, 0) : "--"}</td>`;
    html += `</tr>`;

    // ── result row ──
    // The label column shows "P", O shows orientation, S shows specimen form
    // We need to override the rowspan'd O and S cells with actual values
    // Since we used rowspan=3 on O and S with empty values, we can't put L/R there for just the result row.
    // Alternative: Don't use rowspan on O and S — put empty in min/max, values in result.
    // But rowspan is already set... Let me fix this by NOT using rowspan on O and S.

    html += `<tr>`;
    html += `<td class="c b">P</td>`;
    html += `<td class="c b">${ys?.result != null ? v(ys.result, 2, 2) : ""}</td>`;
    html += `<td class="c b">${ts?.result != null ? v(ts.result, 2, 2) : ""}</td>`;
    html += `<td class="c b">${el?.result != null ? v(el.result, 2, 2) : ""}</td>`;
    html += `<td class="c b">${ra?.result != null ? v(ra.result, 2, 2) : ""}</td>`;
    html += `<td class="c">B</td>`; // HB type = Brinell
    html += `<td class="c b">${hb?.result != null ? v(hb.result, 0, 0) : ""}</td>`;
    // Additional hardness readings if available
    const hbReadings = item.mechanicalResults.filter((mr: any) => mr.propertyName.toLowerCase().includes("hardness"));
    html += `<td class="c b">${hbReadings.length > 1 ? v(hbReadings[1]?.result, 0, 0) : ""}</td>`;
    html += `<td class="c b">${hbReadings.length > 2 ? v(hbReadings[2]?.result, 0, 0) : ""}</td>`;
    html += `</tr>`;
  }

  html += `</table>`;

  // Fix: O and S columns had rowspan=3 but need to show values only in result row.
  // Since HTML doesn't allow overriding rowspan'd cells, we need to restructure.
  // Let me rebuild without rowspan on O and S.

  // Actually, the simpler fix: put the O/S values in the rowspan cells directly.
  // The sample shows L and R in those columns for all 3 rows (they're rowspanned).
  // So just put the orientation and specimen form in the rowspan cells.

  // Let me rebuild the entire data section properly.
  html = `<table class="mech">`;

  // Row 1: Section header
  html += `<tr><td colspan="${TC - 2}" class="section-hdr">M E C H A N I C A L &nbsp;&nbsp; P R O P E R T I E S</td>`;
  html += `<td class="c" style="background:#d9d9d9!important;font-size:6.5pt;">on Raw Material</td>`;
  html += `<td class="c" style="background:#d9d9d9!important;font-size:6.5pt;">&#x2713; on Finished Material</td></tr>`;

  // Row 2
  html += `<tr><td colspan="2" class="c b" style="font-size:7pt;">TENSILE PROPERTIES</td><td colspan="7"></td>`;
  html += `<td colspan="4" class="c b" style="font-size:7pt;">HARDNESS</td>`;
  html += hasImpact ? `<td colspan="${impCols}" class="c b" style="font-size:7pt;">IMPACT PROPERTIES</td>` : "";
  html += `<td class="c b" style="font-size:7pt;">Client</td></tr>`;

  // Row 3
  html += `<tr><th style="font-size:6.5pt;">TEST METHOD</th><th></th><th style="font-size:6.5pt;">ASTM A370</th><th colspan="2"></th><th style="font-size:6.5pt;">ROOM TEMP.</th><th colspan="3"></th><th colspan="4"></th>`;
  html += hasImpact ? `<th style="font-size:6.5pt;">TEMPERATURE</th><th colspan="${impCols - 1}"></th>` : "";
  html += `<th style="font-size:6.5pt;">Item Code</th></tr>`;

  // Row 4: Column headers
  html += `<tr><th>ITEM<br>NO.</th><th>HEAT NO.</th><th></th><th>O</th><th>S</th><th>YS<br>MPa</th><th>TS<br>MPa</th><th>EL<br>%</th><th>RA<br>%</th><th></th><th>(1)</th><th>(2)</th><th>(3)</th>`;
  html += hasImpact ? `<th>Size (mm)</th><th>(1)</th><th>(2)</th><th>(3)</th><th>AVG.</th>` : "";
  html += `<th></th></tr>`;

  // Data rows
  for (const item of items) {
    const mechMap = new Map<string, any>(item.mechanicalResults.map((mr: any) => [mr.propertyName, mr]));
    const find = (keyword: string) => {
      for (const [key] of mechMap) { if (key.toLowerCase().includes(keyword)) return mechMap.get(key); }
      return null;
    };

    const ys = find("yield"), ts = find("tensile"), el = find("elongation"), ra = find("reduction"), hb = find("hardness");
    const hbAll = item.mechanicalResults.filter((mr: any) => mr.propertyName.toLowerCase().includes("hardness"));
    const impact = (item.impactResults || [])[0] || null;
    const o = esc(item.orientation || "");
    const s = esc(item.specimenForm || "");

    // min row
    html += `<tr>`;
    html += `<td rowspan="3" class="c b" style="background:#d9d9d9!important;">${item.itemNo}</td>`;
    html += `<td rowspan="3" class="c">${esc(item.heatNo || "")}</td>`;
    html += `<td class="c"><i>min.</i></td>`;
    html += `<td rowspan="3" class="c">${o}</td>`;
    html += `<td rowspan="3" class="c">${s}</td>`;
    html += `<td>${ys?.minValue != null ? v(ys.minValue, 0, 0) : "--"}</td>`;
    html += `<td>${ts?.minValue != null ? v(ts.minValue, 0, 0) : "--"}</td>`;
    html += `<td>${el?.minValue != null ? v(el.minValue, 0, 0) : "--"}</td>`;
    html += `<td>${ra?.minValue != null ? v(ra.minValue, 0, 0) : "--"}</td>`;
    html += `<td colspan="4">--</td>`;
    if (hasImpact) {
      html += `<td rowspan="3">${impact?.specimenSize || ""}</td>`;
      html += `<td rowspan="3">${impact?.result1 != null ? v(impact.result1, 0, 0) : ""}</td>`;
      html += `<td rowspan="3">${impact?.result2 != null ? v(impact.result2, 0, 0) : ""}</td>`;
      html += `<td rowspan="3">${impact?.result3 != null ? v(impact.result3, 0, 0) : ""}</td>`;
      html += `<td rowspan="3" class="b">${impact?.average != null ? v(impact.average, 0, 0) : ""}</td>`;
    }
    html += `<td rowspan="3" style="font-size:6.5pt;">${esc(item.clientItemCode || "")}</td>`;
    html += `</tr>`;

    // max row
    html += `<tr><td class="c"><i>max.</i></td>`;
    html += `<td>${ys?.maxValue != null ? v(ys.maxValue, 0, 0) : "--"}</td>`;
    html += `<td>${ts?.maxValue != null ? v(ts.maxValue, 0, 0) : "--"}</td>`;
    html += `<td>${el?.maxValue != null ? v(el.maxValue, 0, 0) : "--"}</td>`;
    html += `<td>${ra?.maxValue != null ? v(ra.maxValue, 0, 0) : "--"}</td>`;
    html += `<td colspan="4">${hb?.maxValue != null ? v(hb.maxValue, 0, 0) : "--"}</td>`;
    html += `</tr>`;

    // result row
    html += `<tr><td class="c b">P</td>`;
    html += `<td class="b">${ys?.result != null ? v(ys.result, 2, 2) : ""}</td>`;
    html += `<td class="b">${ts?.result != null ? v(ts.result, 2, 2) : ""}</td>`;
    html += `<td class="b">${el?.result != null ? v(el.result, 2, 2) : ""}</td>`;
    html += `<td class="b">${ra?.result != null ? v(ra.result, 2, 2) : ""}</td>`;
    html += `<td>B</td>`; // Brinell
    html += `<td class="b">${hbAll[0]?.result != null ? v(hbAll[0].result, 0, 0) : ""}</td>`;
    html += `<td class="b">${hbAll.length > 1 && hbAll[1]?.result != null ? v(hbAll[1].result, 0, 0) : ""}</td>`;
    html += `<td class="b">${hbAll.length > 2 && hbAll[2]?.result != null ? v(hbAll[2].result, 0, 0) : ""}</td>`;
    html += `</tr>`;
  }

  html += `</table>`;
  return html;
}
