import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";

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

function val(v: any, decimals: number = 3): string {
  if (v === null || v === undefined || v === "") return "";
  const num = typeof v === "number" ? v : parseFloat(String(v));
  if (isNaN(num)) return String(v);
  return num.toFixed(decimals);
}

function valOrDash(v: any, decimals: number = 3): string {
  const r = val(v, decimals);
  return r || "--";
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

    // Fetch company info for logos and footer
    const company = await prisma.companyMaster.findFirst();

    const origin = request.nextUrl.origin || "";
    let companyLogoUrl = (company as any)?.companyLogoUrl || "";
    let isoLogoUrl = (company as any)?.isoLogoUrl || "";
    if (companyLogoUrl && companyLogoUrl.startsWith("/")) companyLogoUrl = `${origin}${companyLogoUrl}`;
    if (isoLogoUrl && isoLogoUrl.startsWith("/")) isoLogoUrl = `${origin}${isoLogoUrl}`;

    const chemElements = certificate.items[0]?.chemicalResults?.map((cr) => cr.element) || [];
    const mechProps = certificate.items[0]?.mechanicalResults?.map((mr) => ({
      name: mr.propertyName,
      unit: mr.unit,
    })) || [];

    const html = generateHTML(certificate, company, chemElements, mechProps, companyLogoUrl, isoLogoUrl);

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Error generating MTC PDF:", error);
    return NextResponse.json({ error: "Failed to generate MTC PDF" }, { status: 500 });
  }
}

function generateHTML(
  cert: any,
  company: any,
  chemElements: string[],
  mechProps: { name: string; unit: string | null }[],
  companyLogoUrl: string,
  isoLogoUrl: string
): string {
  const items = cert.items || [];
  const hasImpact = items.some((item: any) => item.impactResults?.length > 0);

  // (mechanical table built by buildMechTableExact)

  // Build footer
  const footerAddr1 = [
    "Regd. Office:",
    company?.regAddressLine1,
    company?.regAddressLine2,
    company?.regCity ? `${company.regCity} - ${company?.regPincode || ""}` : "",
    company?.regState,
    company?.regCountry,
  ].filter(Boolean).join(", ") +
    (company?.telephoneNo ? ` Tel.: ${company.telephoneNo}` : "") +
    (company?.fax ? `, Fax: ${company.fax}` : "");

  const footerAddr2 = company?.worksAddress || "";

  // Build notes and legends
  const notesLines = (cert.notes || "").split("\n").filter((l: string) => l.trim());
  const remarksLines = (cert.remarks || "").split("\n").filter((l: string) => l.trim());

  // Items table
  const itemsRows = items.map((item: any) => `
    <tr>
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

  // Chemical composition table
  const chemTable = buildChemicalTable(items, chemElements);

  // Mechanical + hardness + impact combined table
  const mechTable = buildMechTableExact(items, mechProps, hasImpact);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>MTC - ${esc(cert.certificateNo)}</title>
<style>
  @page { size: A4 landscape; margin: 6mm 8mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
    font-size: 8pt;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #000; padding: 2px 4px; vertical-align: middle; font-size: 7.5pt; }
  th { background: #d9d9d9 !important; font-weight: bold; text-align: center; }
  .c { text-align: center; }
  .l { text-align: left; }
  .r { text-align: right; }
  .b { font-weight: bold; }
  .small { font-size: 6.5pt; }
  .section-hdr { background: #d9d9d9 !important; text-align: center; font-weight: bold; font-size: 8pt; letter-spacing: 3px; padding: 3px; }
  .info td { font-size: 8pt; padding: 2px 5px; }
  .info .lbl { font-weight: normal; }
  .chem td, .chem th { font-size: 7pt; padding: 1px 3px; text-align: center; }
  .mech td, .mech th { font-size: 7pt; padding: 1px 3px; text-align: center; }
  .items td, .items th { font-size: 7pt; padding: 2px 3px; text-align: center; }
  .noborder { border: none !important; }
  .formula { font-size: 7pt; padding: 2px 6px; border: 1px solid #000; border-top: none; }
  .cert-stmt { font-size: 7.5pt; padding: 4px 6px; text-align: left; }
  .notes-box { padding: 3px 6px; font-size: 7pt; }
  .notes-box .title { font-weight: bold; }
  .legends td { border: none; font-size: 7pt; padding: 0px 3px; }
  .sig-row td { border: none; font-size: 7pt; padding: 0; vertical-align: bottom; }
  .footer-bar { font-size: 6.5pt; text-align: center; padding: 3px 6px; border: 1px solid #000; margin-top: 2px; line-height: 1.3; }
  .fmt-ref { font-size: 6.5pt; display: flex; justify-content: space-between; margin-top: 2px; }
</style>
</head>
<body>

<!-- HEADER: ISO logo left, company logo right -->
<table style="border:none;margin-bottom:2px;">
  <tr>
    <td style="border:none;width:15%;vertical-align:middle;padding:2px;">
      ${isoLogoUrl
        ? `<img src="${isoLogoUrl}" alt="ISO" style="max-height:45px;">`
        : `<span style="font-size:7pt;color:#666;">ISO 9001:2015<br>ISO 14001:2015<br>ISO 45001:2018</span>`
      }
    </td>
    <td style="border:none;text-align:center;vertical-align:middle;">
      <div style="font-size:14pt;font-weight:bold;letter-spacing:3px;">M I L L &nbsp; T E S T &nbsp; C E R T I F I C A T E</div>
      <div style="font-size:9pt;font-weight:bold;">EN 10204:2004 3.1 / ISO 10474:1991 3.1</div>
      <div style="font-size:7pt;font-style:italic;margin-top:2px;">Manufacturer of Pipes, Fittings &amp; Flanges in Carbon Steel, Alloy Steel, Stainless Steel, Duplex Steel &amp; Nickel Alloys</div>
    </td>
    <td style="border:none;width:15%;text-align:right;vertical-align:middle;padding:2px;">
      ${companyLogoUrl
        ? `<img src="${companyLogoUrl}" alt="Logo" style="max-height:50px;">`
        : `<span style="font-size:14pt;font-weight:bold;color:#003366;">${esc(company?.companyName || "NPS")}</span>`
      }
    </td>
  </tr>
</table>

<!-- CUSTOMER / CERTIFICATE DETAILS -->
<table class="info">
  <tr>
    <td style="width:14%"><span class="lbl">Customer</span></td>
    <td style="width:36%" colspan="2"><b>${esc(cert.customerName || "")}</b></td>
    <td style="width:14%"><span class="lbl">Certificate No.</span></td>
    <td style="width:22%"><b>${esc(cert.certificateNo || "")}</b></td>
    <td style="width:5%"><span class="lbl">Date</span></td>
    <td style="width:9%">${fmtDate(cert.certificateDate)}</td>
  </tr>
  <tr>
    <td><span class="lbl">P.O. No. / P. R. No.</span></td>
    <td colspan="2">${esc(cert.poNo || cert.quotationNo || "")}</td>
    <td><span class="lbl">Date</span></td>
    <td colspan="2">${fmtDate(cert.poDate)}</td>
    <td></td>
  </tr>
  <tr>
    <td><span class="lbl">Project Name</span></td>
    <td colspan="2">${esc(cert.projectName || "-")}</td>
    <td><span class="lbl">Other Reference</span></td>
    <td colspan="3">${esc(cert.otherReference || "")}</td>
  </tr>
  <tr>
    <td><span class="lbl">Material Specification</span></td>
    <td colspan="2">${esc(cert.materialSpec || "")}</td>
    <td><span class="lbl">Starting Material</span></td>
    <td colspan="3">${esc(cert.startingMaterial || "")}</td>
  </tr>
  <tr>
    <td><span class="lbl">Additional Requirement</span></td>
    <td colspan="2">${esc(cert.additionalRequirement || "")}</td>
    <td><span class="lbl">Heat Treatment</span></td>
    <td colspan="3">${esc(cert.heatTreatment || "")}</td>
  </tr>
</table>

<!-- ITEM DETAILS -->
<table class="items">
  <tr>
    <th rowspan="2" style="width:4%">ITEM<br>NO.</th>
    <th rowspan="2" style="width:18%">DESCRIPTION</th>
    <th colspan="2">CONSTRUCTION</th>
    <th colspan="4">SIZE</th>
    <th rowspan="2" style="width:4%">QTY.<br>PCS.</th>
    <th rowspan="2" style="width:8%">HEAT NO.</th>
    <th rowspan="2" style="width:8%">RAW MATERIAL</th>
  </tr>
  <tr>
    <th style="width:8%">TYPE</th>
    <th style="width:10%">STANDARD</th>
    <th style="width:7%">OD 1</th>
    <th style="width:7%">WT 1</th>
    <th style="width:5%">OD 2</th>
    <th style="width:5%">WT 2</th>
  </tr>
  ${itemsRows}
</table>

<!-- CHEMICAL COMPOSITION -->
<table class="chem">
  <tr><td colspan="${chemElements.length + 3}" class="section-hdr">C H E M I C A L &nbsp;&nbsp; C O M P O S I T I O N</td></tr>
  ${chemTable}
</table>
<div class="formula">
  <b>F1</b> = Cu+Ni+Cr+Mo &nbsp;&nbsp;;&nbsp;&nbsp;
  <b>CEQ</b> = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15
</div>

<!-- MECHANICAL PROPERTIES (combined table) -->
${mechTable}

<!-- CERTIFICATION STATEMENT -->
<table>
  <tr><td class="cert-stmt">
    We hereby certify that the material herein manufactured, sampled, tested &amp; inspected in accordance with the above specification and requirements of Purchase order.
  </td></tr>
</table>

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
        <tr>
          <td><b>O</b></td><td>Orientation</td>
          <td><b>S</b></td><td>Strip</td>
          <td><b>H</b></td><td>Heat</td>
        </tr>
        <tr>
          <td><b>R</b></td><td>Round</td>
          <td><b>RA</b></td><td>Reduction Area</td>
          <td><b>P</b></td><td>Product</td>
        </tr>
        <tr>
          <td><b>W</b></td><td>Weld</td>
          <td><b>N</b></td><td>Normalized</td>
          <td><b>L</b></td><td>Longitudinal</td>
        </tr>
        <tr>
          <td><b>YS</b></td><td>Yield Strength</td>
          <td><b>N&amp;T</b></td><td>Normalize &amp; Tempered</td>
          <td><b>T</b></td><td>Transverse</td>
        </tr>
        <tr>
          <td><b>TS</b></td><td>Tensile Strength</td>
          <td><b>Q</b></td><td>Quenched</td>
          <td><b>B</b></td><td>Base</td>
        </tr>
        <tr>
          <td><b>EL</b></td><td>Elongation</td>
          <td><b>ANL</b></td><td>Annealed</td>
          <td></td><td></td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- REMARKS -->
${remarksLines.length > 0 ? `
<table>
  <tr><td class="notes-box">
    <span class="title">Remarks:</span><br>
    ${remarksLines.map((r: string) => esc(r)).join("<br>")}
  </td></tr>
</table>` : ""}

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

<!-- FOOTER -->
<div class="footer-bar">
  ${esc(footerAddr1)}<br>
  ${footerAddr2 ? esc(footerAddr2) : ""}
</div>

<div class="fmt-ref">
  <span>Format: NPFI/QC/001-Rev.${cert.revision || 0}</span>
  <span>Page 1 of 1</span>
</div>

</body>
</html>`;
}

function buildChemicalTable(items: any[], chemElements: string[]): string {
  if (chemElements.length === 0) return "";

  // Header row
  let html = `<tr>
    <th style="width:4%">ITEM</th>
    <th style="width:6%">HEAT NO.</th>
    <th style="width:3%">%</th>
    ${chemElements.map((el) => `<th>${esc(el)}</th>`).join("")}
  </tr>`;

  for (const item of items) {
    const resultMap = new Map<string, any>(
      item.chemicalResults.map((cr: any) => [cr.element, cr])
    );

    // Min row
    html += `<tr>
      <td rowspan="4" class="c b">${item.itemNo}</td>
      <td rowspan="4" class="c">${esc(item.heatNo || "")}</td>
      <td class="c"><i>min.</i></td>
      ${chemElements.map((el) => {
        const r = resultMap.get(el);
        return `<td>${r?.minValue != null ? val(r.minValue) : "--"}</td>`;
      }).join("")}
    </tr>`;

    // Max row
    html += `<tr>
      <td class="c"><i>max.</i></td>
      ${chemElements.map((el) => {
        const r = resultMap.get(el);
        return `<td>${r?.maxValue != null ? val(r.maxValue) : "--"}</td>`;
      }).join("")}
    </tr>`;

    // Heat result (H)
    html += `<tr>
      <td class="c b">H</td>
      ${chemElements.map((el) => {
        const r = resultMap.get(el);
        return `<td>${r?.heatResult != null ? val(r.heatResult) : ""}</td>`;
      }).join("")}
    </tr>`;

    // Product result (P)
    html += `<tr>
      <td class="c b">P</td>
      ${chemElements.map((el) => {
        const r = resultMap.get(el);
        return `<td>${r?.productResult != null ? val(r.productResult) : ""}</td>`;
      }).join("")}
    </tr>`;
  }

  return html;
}

// buildMechTableExact is used instead (below)

function buildMechTableExact(
  items: any[],
  mechProps: { name: string; unit: string | null }[],
  hasImpact: boolean
): string {
  // From the sample PDF, mechanical section is ONE combined table with:
  // Row 1: "M E C H A N I C A L  P R O P E R T I E S" | "on Raw Material" | "✓ on Finished Material"
  // Row 2: "TENSILE PROPERTIES" header | "HARDNESS" header | "IMPACT PROPERTIES" header | "Client"
  // Row 3: "TEST METHOD" | "ASTM A370" | "ROOM TEMP." | | | | | | "TEMPERATURE" | | | | "Item Code"
  // Row 4: "ITEM NO" | "HEAT NO" | "O" | "S" | "YS MPa" | "TS MPa" | "EL %" | "RA %" | "HB" | "(1)(2)(3)" | "SPECIMEN Size(mm)" | "(1)(2)(3)" | "AVG"
  // Data: min row, max row, result row (per item)

  // Separate props
  const ys = mechProps.find((p) => p.name.toLowerCase().includes("yield"));
  const ts = mechProps.find((p) => p.name.toLowerCase().includes("tensile"));
  const el = mechProps.find((p) => p.name.toLowerCase().includes("elongation"));
  const ra = mechProps.find((p) => p.name.toLowerCase().includes("reduction"));
  const hb = mechProps.find((p) => p.name.toLowerCase().includes("hardness"));
  const tensileOrder = [ys, ts, el, ra].filter(Boolean) as { name: string; unit: string | null }[];

  const hbCols = 3; // HB has 3 readings in sample
  const impactCols = hasImpact ? 5 : 0; // Specimen, (1)(2)(3), AVG

  // Total = ITEM + HEATNO + O + S + tensile(4) + HB(3) + impact(5or0) + ClientCode = varies
  const totalCols = 4 + tensileOrder.length + hbCols + impactCols + 1;

  let html = `<table class="mech">`;

  // Row 1: Section header
  const leftCols = 4 + tensileOrder.length + 2; // up to hardness area
  const rightCols = totalCols - leftCols;
  html += `<tr>
    <td colspan="${leftCols}" class="section-hdr">M E C H A N I C A L &nbsp;&nbsp; P R O P E R T I E S</td>
    <td class="c small" style="background:#d9d9d9!important;font-size:6.5pt;">on Raw Material</td>
    <td colspan="${rightCols - 1}" class="c small" style="background:#d9d9d9!important;font-size:6.5pt;">&#x2713; on Finished Material</td>
  </tr>`;

  // Row 2: Sub-headers
  html += `<tr>
    <td colspan="2" class="c b" style="font-size:7pt;">TENSILE PROPERTIES</td>
    <td colspan="2"></td>
    ${tensileOrder.map(() => `<td></td>`).join("")}
    <td colspan="${hbCols}" class="c b" style="font-size:7pt;">HARDNESS</td>
    ${hasImpact ? `<td colspan="${impactCols}" class="c b" style="font-size:7pt;">IMPACT PROPERTIES</td>` : ""}
    <td class="c b" style="font-size:7pt;">Client</td>
  </tr>`;

  // Row 3: TEST METHOD row
  html += `<tr>
    <th style="font-size:6.5pt;">TEST METHOD</th>
    <th></th>
    <th style="font-size:6.5pt;">ASTM A370</th>
    <th></th>
    <th style="font-size:6.5pt;">ROOM TEMP.</th>
    ${tensileOrder.length > 1 ? tensileOrder.slice(1).map(() => `<th></th>`).join("") : ""}
    <th colspan="${hbCols}"></th>
    ${hasImpact ? `<th style="font-size:6.5pt;">TEMPERATURE</th><th colspan="${impactCols - 1}"></th>` : ""}
    <th style="font-size:6.5pt;">Item Code</th>
  </tr>`;

  // Row 4: Column headers
  html += `<tr>
    <th>ITEM<br>NO.</th>
    <th>HEAT NO.</th>
    <th>O</th>
    <th>S</th>
    <th>YS<br>MPa</th>
    <th>TS<br>MPa</th>
    <th>EL<br>%</th>
    <th>RA<br>%</th>
    <th>(1)</th><th>(2)</th><th>(3)</th>
    ${hasImpact ? `<th>Size (mm)</th><th>(1)</th><th>(2)</th><th>(3)</th><th>AVG.</th>` : ""}
    <th></th>
  </tr>`;

  // Data rows per item
  for (const item of items) {
    const mechMap = new Map<string, any>(
      item.mechanicalResults.map((mr: any) => [mr.propertyName, mr])
    );

    const getResult = (propName: string) => {
      for (const [key, val] of mechMap) {
        if (key.toLowerCase().includes(propName.toLowerCase())) return val;
      }
      return null;
    };

    const ysR = getResult("yield");
    const tsR = getResult("tensile");
    const elR = getResult("elongation");
    const raR = getResult("reduction");
    const hbR = getResult("hardness");
    const impact = (item.impactResults || [])[0] || null;

    // Min row
    html += `<tr>
      <td rowspan="3" class="c b">${item.itemNo}</td>
      <td rowspan="3" class="c">${esc(item.heatNo || "")}</td>
      <td rowspan="3" class="c">${esc(item.orientation || "")}</td>
      <td rowspan="3" class="c">${esc(item.specimenForm || "")}</td>
      <td class="c" style="font-size:6pt;"><i>min.</i></td>
      <td class="c">${ysR?.minValue != null ? val(ysR.minValue, 0) : "--"}</td>
      <td class="c">${tsR?.minValue != null ? val(tsR.minValue, 0) : "--"}</td>
      <td class="c">${elR?.minValue != null ? val(elR.minValue, 0) : "--"}</td>
      <td class="c">${raR?.minValue != null ? val(raR.minValue, 0) : "--"}</td>
      <td colspan="${hbCols}" class="c">--</td>
      ${hasImpact ? `
        <td rowspan="3" class="c">${impact?.specimenSize || ""}</td>
        <td rowspan="3" class="c">${impact?.result1 != null ? val(impact.result1, 0) : ""}</td>
        <td rowspan="3" class="c">${impact?.result2 != null ? val(impact.result2, 0) : ""}</td>
        <td rowspan="3" class="c">${impact?.result3 != null ? val(impact.result3, 0) : ""}</td>
        <td rowspan="3" class="c b">${impact?.average != null ? val(impact.average, 0) : ""}</td>
      ` : ""}
      <td rowspan="3" class="c small">${esc(item.clientItemCode || "")}</td>
    </tr>`;

    // Max row
    html += `<tr>
      <td class="c" style="font-size:6pt;"><i>max.</i></td>
      <td class="c">${ysR?.maxValue != null ? val(ysR.maxValue, 0) : "--"}</td>
      <td class="c">${tsR?.maxValue != null ? val(tsR.maxValue, 0) : "--"}</td>
      <td class="c">${elR?.maxValue != null ? val(elR.maxValue, 0) : "--"}</td>
      <td class="c">${raR?.maxValue != null ? val(raR.maxValue, 0) : "--"}</td>
      <td colspan="${hbCols}" class="c">${hbR?.maxValue != null ? val(hbR.maxValue, 0) : "--"}</td>
    </tr>`;

    // Result row
    html += `<tr>
      <td class="c b">P</td>
      <td class="c b">${ysR?.result != null ? val(ysR.result, 2) : ""}</td>
      <td class="c b">${tsR?.result != null ? val(tsR.result, 2) : ""}</td>
      <td class="c b">${elR?.result != null ? val(elR.result, 2) : ""}</td>
      <td class="c b">${raR?.result != null ? val(raR.result, 2) : ""}</td>
      <td class="c b">${hbR?.result != null ? val(hbR.result, 0) : ""}</td>
      <td class="c b">${item.mechanicalResults?.length > 5 ? val(item.mechanicalResults[5]?.result, 0) : ""}</td>
      <td class="c b">${item.mechanicalResults?.length > 6 ? val(item.mechanicalResults[6]?.result, 0) : ""}</td>
    </tr>`;
  }

  html += `</table>`;
  return html;
}
