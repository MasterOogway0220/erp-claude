import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";

function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function val(v: number | null | undefined, decimals: number = 3): string {
  if (v === null || v === undefined) return "-";
  return v.toFixed(decimals);
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
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    // Build the list of chemical element columns from the first item's results
    const chemElements =
      certificate.items[0]?.chemicalResults?.map((cr) => cr.element) || [];

    // Build mechanical property columns from the first item's results
    const mechProps =
      certificate.items[0]?.mechanicalResults?.map((mr) => ({
        name: mr.propertyName,
        unit: mr.unit,
      })) || [];

    const html = generateHTML(certificate, chemElements, mechProps);

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error generating MTC PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate MTC PDF" },
      { status: 500 }
    );
  }
}

function generateHTML(
  cert: any,
  chemElements: string[],
  mechProps: { name: string; unit: string | null }[]
): string {
  const items = cert.items || [];

  // Build chemical composition table rows
  const chemTableRows = buildChemicalTable(items, chemElements);
  const mechTableRows = buildMechanicalTable(items, mechProps);
  const impactTableRows = buildImpactTable(items);

  // Build items table
  const itemsTableRows = items
    .map(
      (item: any) => `
    <tr>
      <td>${item.itemNo}</td>
      <td>${item.description || ""}</td>
      <td>${item.constructionType || ""}</td>
      <td>${item.dimensionStandard || ""}</td>
      <td>${item.sizeOD1 || ""}</td>
      <td>${item.sizeWT1 || ""}</td>
      <td>${item.sizeOD2 || ""}</td>
      <td>${item.sizeWT2 || ""}</td>
      <td>${item.quantity || ""}</td>
      <td>${item.heatNo || ""}</td>
      <td>${item.rawMaterial || ""}</td>
    </tr>`
    )
    .join("");

  // Parse notes into lines
  const notesLines = (cert.notes || "")
    .split("\n")
    .filter((l: string) => l.trim())
    .map((l: string) => `<div>${l}</div>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mill Test Certificate - ${cert.certificateNo}</title>
<style>
  @page {
    size: A4 landscape;
    margin: 8mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8pt;
    line-height: 1.3;
    color: #000;
    background: #fff;
  }
  .page {
    width: 100%;
    max-width: 1120px;
    margin: 0 auto;
    padding: 10px;
  }
  .header {
    text-align: center;
    border: 1px solid #000;
    padding: 6px 10px;
    margin-bottom: 2px;
  }
  .header h1 {
    font-size: 14pt;
    font-weight: bold;
    letter-spacing: 2px;
    margin: 4px 0;
  }
  .header .standard {
    font-size: 9pt;
    font-weight: bold;
  }
  .header .tagline {
    font-size: 7pt;
    margin-top: 2px;
    font-style: italic;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 2px;
  }
  td, th {
    border: 1px solid #000;
    padding: 2px 4px;
    vertical-align: top;
    font-size: 7.5pt;
  }
  th {
    background-color: #e8e8e8;
    font-weight: bold;
    text-align: center;
  }
  .detail-table td {
    font-size: 7.5pt;
  }
  .detail-table .label {
    font-weight: bold;
    width: 140px;
    background: #f5f5f5;
  }
  .chem-table td, .chem-table th,
  .mech-table td, .mech-table th {
    text-align: center;
    font-size: 7pt;
    padding: 1px 3px;
  }
  .items-table td, .items-table th {
    text-align: center;
    font-size: 7pt;
    padding: 2px 3px;
  }
  .section-title {
    font-weight: bold;
    font-size: 8pt;
    background: #d9d9d9;
    text-align: center;
    padding: 3px;
    border: 1px solid #000;
  }
  .notes-section {
    border: 1px solid #000;
    padding: 4px 6px;
    margin-bottom: 2px;
    font-size: 7pt;
  }
  .notes-section .title {
    font-weight: bold;
    margin-bottom: 2px;
  }
  .certification {
    border: 1px solid #000;
    padding: 6px;
    margin-bottom: 2px;
    font-size: 7.5pt;
    text-align: justify;
  }
  .signatures {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    padding: 0 10px;
  }
  .sig-block {
    text-align: center;
    width: 22%;
  }
  .sig-block .sig-line {
    border-top: 1px solid #000;
    margin-top: 30px;
    padding-top: 3px;
    font-size: 7pt;
    font-weight: bold;
  }
  .footer {
    border: 1px solid #000;
    padding: 4px 8px;
    font-size: 6.5pt;
    text-align: center;
    margin-top: 4px;
  }
  .format-ref {
    text-align: right;
    font-size: 6.5pt;
    margin-top: 2px;
  }
  .formula {
    font-size: 7pt;
    padding: 2px 6px;
    border: 1px solid #000;
    border-top: none;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { max-width: none; padding: 0; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <h1>MILL TEST CERTIFICATE</h1>
    <div class="standard">EN 10204:2004 3.1 / ISO 10474:1991 3.1</div>
    <div class="tagline">Manufacturer of Pipes, Fittings &amp; Flanges in Carbon Steel, Alloy Steel, Stainless Steel, Duplex Steel &amp; Nickel Alloys</div>
  </div>

  <!-- Customer Details -->
  <table class="detail-table">
    <tr>
      <td class="label">Customer</td>
      <td colspan="2">${cert.customerName || ""}</td>
      <td class="label" style="width:120px">Certificate No.</td>
      <td>${cert.certificateNo || ""}</td>
    </tr>
    <tr>
      <td class="label">PO No.</td>
      <td>${cert.poNo || ""}</td>
      <td style="width:100px"><strong>PO Date:</strong> ${formatDate(cert.poDate)}</td>
      <td class="label">Date</td>
      <td>${formatDate(cert.certificateDate)}</td>
    </tr>
    <tr>
      <td class="label">Project Name</td>
      <td colspan="2">${cert.projectName || ""}</td>
      <td class="label">Other Reference</td>
      <td>${cert.otherReference || ""}</td>
    </tr>
    <tr>
      <td class="label">Material Specification</td>
      <td colspan="2">${cert.materialSpec || ""}</td>
      <td class="label">Starting Material</td>
      <td>${cert.startingMaterial || ""}</td>
    </tr>
    <tr>
      <td class="label">Additional Requirement</td>
      <td colspan="2">${cert.additionalRequirement || ""}</td>
      <td class="label">Heat Treatment</td>
      <td>${cert.heatTreatment || ""}</td>
    </tr>
  </table>

  <!-- Items Table -->
  <div class="section-title">ITEM DETAILS</div>
  <table class="items-table">
    <tr>
      <th rowspan="2">ITEM NO</th>
      <th rowspan="2">DESCRIPTION</th>
      <th rowspan="2">CONSTRUCTION TYPE</th>
      <th rowspan="2">DIMENSION STANDARD</th>
      <th colspan="4">SIZE</th>
      <th rowspan="2">QTY PCS</th>
      <th rowspan="2">HEAT NO</th>
      <th rowspan="2">RAW MATERIAL</th>
    </tr>
    <tr>
      <th>OD1</th>
      <th>WT1</th>
      <th>OD2</th>
      <th>WT2</th>
    </tr>
    ${itemsTableRows}
  </table>

  <!-- Chemical Composition -->
  <div class="section-title">CHEMICAL COMPOSITION (%)</div>
  <table class="chem-table">
    ${chemTableRows}
  </table>
  <div class="formula">
    <strong>F1</strong> = Cu+Ni+Cr+Mo &nbsp;&nbsp;;&nbsp;&nbsp;
    <strong>CEQ</strong> = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15
  </div>

  <!-- Mechanical Properties -->
  <div class="section-title">MECHANICAL PROPERTIES</div>
  <table class="mech-table">
    ${mechTableRows}
  </table>

  <!-- Impact Properties -->
  ${
    items.some((item: any) => item.impactResults?.length > 0)
      ? `
  <div class="section-title">IMPACT PROPERTIES</div>
  <table class="mech-table">
    ${impactTableRows}
  </table>`
      : ""
  }

  <!-- Certification Statement -->
  <div class="certification">
    We hereby certify that the material described above has been manufactured, tested, and inspected in accordance with
    the specification and requirements stated above as applicable. The test results shown are from tests carried out on
    samples taken from the supplied material. This certificate is issued in accordance with EN 10204:2004 Type 3.1 /
    ISO 10474:1991 Type 3.1.
  </div>

  <!-- Notes -->
  ${
    cert.notes
      ? `
  <div class="notes-section">
    <div class="title">NOTES / LEGENDS:</div>
    ${notesLines}
  </div>`
      : ""
  }

  <!-- Remarks -->
  ${
    cert.remarks
      ? `
  <div class="notes-section">
    <div class="title">REMARKS:</div>
    <div>${cert.remarks}</div>
  </div>`
      : ""
  }

  <!-- Signatures -->
  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line">Reviewed by${cert.reviewedBy ? `<br/>${cert.reviewedBy}` : ""}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">Witnessed by${cert.witnessedBy ? `<br/>${cert.witnessedBy}` : ""}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">Auth. Signatory</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">Incharge (QA/QC Dept.)</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    NPS Piping Solutions &mdash; Manufacturer &amp; Exporter of Piping Products
  </div>

  <div class="format-ref">NPFI/QC/001-Rev.${cert.revision || 0}</div>

</div>
</body>
</html>`;
}

function buildChemicalTable(items: any[], chemElements: string[]): string {
  if (chemElements.length === 0) return "<tr><td>No chemical data</td></tr>";

  // Header row
  let html = `<tr>
    <th>ITEM</th>
    <th>HEAT NO</th>
    <th>%</th>
    ${chemElements.map((el) => `<th>${el}</th>`).join("")}
  </tr>`;

  for (const item of items) {
    const resultMap = new Map<string, any>(
      item.chemicalResults.map((cr: any) => [cr.element, cr])
    );

    // Min row
    html += `<tr>
      <td rowspan="4">${item.itemNo}</td>
      <td rowspan="4">${item.heatNo || ""}</td>
      <td><strong>Min</strong></td>
      ${chemElements.map((el) => {
        const r = resultMap.get(el);
        return `<td>${r?.minValue !== null && r?.minValue !== undefined ? val(r.minValue) : "-"}</td>`;
      }).join("")}
    </tr>`;

    // Max row
    html += `<tr>
      <td><strong>Max</strong></td>
      ${chemElements.map((el) => {
        const r = resultMap.get(el);
        return `<td>${r?.maxValue !== null && r?.maxValue !== undefined ? val(r.maxValue) : "-"}</td>`;
      }).join("")}
    </tr>`;

    // Heat result row
    html += `<tr>
      <td><strong>H</strong></td>
      ${chemElements.map((el) => {
        const r = resultMap.get(el);
        return `<td>${r?.heatResult !== null && r?.heatResult !== undefined ? val(r.heatResult) : "-"}</td>`;
      }).join("")}
    </tr>`;

    // Product result row
    html += `<tr>
      <td><strong>P</strong></td>
      ${chemElements.map((el) => {
        const r = resultMap.get(el);
        return `<td>${r?.productResult !== null && r?.productResult !== undefined ? val(r.productResult) : "-"}</td>`;
      }).join("")}
    </tr>`;
  }

  return html;
}

function buildMechanicalTable(
  items: any[],
  mechProps: { name: string; unit: string | null }[]
): string {
  if (mechProps.length === 0) return "<tr><td>No mechanical data</td></tr>";

  // Header rows
  let html = `<tr>
    <th>ITEM</th>
    <th>HEAT NO</th>
    <th>O</th>
    <th>S</th>
    ${mechProps.map((mp) => `<th>${mp.name}${mp.unit ? ` (${mp.unit})` : ""}</th>`).join("")}
    <th>Client Item Code</th>
  </tr>`;

  for (const item of items) {
    const resultMap = new Map<string, any>(
      item.mechanicalResults.map((mr: any) => [mr.propertyName, mr])
    );

    // Min row
    html += `<tr>
      <td rowspan="3">${item.itemNo}</td>
      <td rowspan="3">${item.heatNo || ""}</td>
      <td rowspan="3">${item.orientation || ""}</td>
      <td rowspan="3">${item.specimenForm || ""}</td>
      ${mechProps.map((mp) => {
        const r = resultMap.get(mp.name);
        return `<td><strong>Min:</strong> ${r?.minValue !== null && r?.minValue !== undefined ? val(r.minValue, 2) : "-"}</td>`;
      }).join("")}
      <td rowspan="3">${item.clientItemCode || ""}</td>
    </tr>`;

    // Max row
    html += `<tr>
      ${mechProps.map((mp) => {
        const r = resultMap.get(mp.name);
        return `<td><strong>Max:</strong> ${r?.maxValue !== null && r?.maxValue !== undefined ? val(r.maxValue, 2) : "-"}</td>`;
      }).join("")}
    </tr>`;

    // Result row
    html += `<tr>
      ${mechProps.map((mp) => {
        const r = resultMap.get(mp.name);
        return `<td><strong>${r?.result !== null && r?.result !== undefined ? val(r.result, 2) : "-"}</strong></td>`;
      }).join("")}
    </tr>`;
  }

  return html;
}

function buildImpactTable(items: any[]): string {
  let html = `<tr>
    <th>ITEM</th>
    <th>HEAT NO</th>
    <th>Temperature</th>
    <th>Specimen Size</th>
    <th>Result 1</th>
    <th>Result 2</th>
    <th>Result 3</th>
    <th>AVG</th>
  </tr>`;

  for (const item of items) {
    if (!item.impactResults || item.impactResults.length === 0) continue;

    for (let i = 0; i < item.impactResults.length; i++) {
      const ir = item.impactResults[i];
      html += `<tr>
        ${i === 0 ? `<td rowspan="${item.impactResults.length}">${item.itemNo}</td><td rowspan="${item.impactResults.length}">${item.heatNo || ""}</td>` : ""}
        <td>${ir.testTemperature !== null ? `${ir.testTemperature}&deg;C` : "-"}</td>
        <td>${ir.specimenSize || "-"}</td>
        <td>${ir.result1 !== null ? val(ir.result1, 2) : "-"}</td>
        <td>${ir.result2 !== null ? val(ir.result2, 2) : "-"}</td>
        <td>${ir.result3 !== null ? val(ir.result3, 2) : "-"}</td>
        <td><strong>${ir.average !== null ? val(ir.average, 2) : "-"}</strong></td>
      </tr>`;
    }
  }

  return html;
}
