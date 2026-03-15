import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { renderHtmlToPdf } from "@/lib/pdf/render-pdf";

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response, companyId } = await checkAccess("labLetter", "read");
    if (!authorized) return response!;

    const labLetter = await prisma.labLetter.findFirst({
      where: { id, ...companyFilter(companyId) },
      include: {
        generatedBy: { select: { name: true } },
        tpiAgency: { select: { name: true, code: true, contactPerson: true, phone: true } },
        company: {
          select: {
            companyName: true,
            regAddressLine1: true,
            regAddressLine2: true,
            regCity: true,
            regState: true,
            regPincode: true,
            telephoneNo: true,
            email: true,
            website: true,
            gstNo: true,
          },
        },
      },
    });

    if (!labLetter) {
      return NextResponse.json({ error: "Lab letter not found" }, { status: 404 });
    }

    const company = labLetter.company;
    const testNames: string[] = Array.isArray(labLetter.testNames) ? labLetter.testNames as string[] : [];

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Lab Letter - ${escapeHtml(labLetter.letterNo)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #333; padding: 15mm 12mm; }

    .header { text-align: center; border-bottom: 3px solid #1a365d; padding-bottom: 12px; margin-bottom: 20px; }
    .header h1 { font-size: 20px; color: #1a365d; font-weight: 700; margin-bottom: 3px; }
    .header .sub { font-size: 10px; color: #555; }

    .letter-title { text-align: center; margin: 18px 0; }
    .letter-title h2 { font-size: 16px; color: #1a365d; text-decoration: underline; text-transform: uppercase; letter-spacing: 1px; }

    .meta-row { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 11px; }
    .meta-row .left { text-align: left; }
    .meta-row .right { text-align: right; }

    .lab-address { background: #f7f9fb; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 14px; margin-bottom: 18px; }
    .lab-address .label { font-size: 10px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 4px; }
    .lab-address .name { font-size: 13px; font-weight: 600; color: #1a365d; }
    .lab-address .addr { font-size: 11px; color: #555; margin-top: 2px; }

    .subject { margin-bottom: 16px; font-size: 12px; }
    .subject strong { color: #1a365d; }

    table.details { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
    table.details th { background: #edf2f7; color: #1a365d; font-weight: 600; text-align: left; padding: 8px 10px; border: 1px solid #cbd5e0; font-size: 11px; width: 35%; }
    table.details td { padding: 8px 10px; border: 1px solid #cbd5e0; font-size: 11px; }

    .tests-section { margin-bottom: 18px; }
    .tests-section h3 { font-size: 13px; color: #1a365d; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .test-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .test-badge { background: #ebf4ff; color: #1a365d; border: 1px solid #bee3f8; border-radius: 4px; padding: 4px 10px; font-size: 11px; font-weight: 500; }

    .witness-section { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 4px; padding: 10px 14px; margin-bottom: 18px; }
    .witness-section .label { font-size: 10px; text-transform: uppercase; color: #92400e; font-weight: 600; }
    .witness-section .value { font-size: 12px; color: #78350f; margin-top: 2px; }

    .remarks { margin-bottom: 20px; }
    .remarks h3 { font-size: 12px; color: #1a365d; margin-bottom: 4px; }
    .remarks p { font-size: 11px; color: #555; white-space: pre-wrap; }

    .signature-area { margin-top: 40px; display: flex; justify-content: space-between; }
    .sig-block { text-align: center; width: 200px; }
    .sig-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 4px; font-size: 11px; }

    .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  </style>
</head>
<body>
  <!-- Company Header -->
  <div class="header">
    <h1>${escapeHtml(company?.companyName || "NPS Piping Solutions")}</h1>
    <div class="sub">${[company?.regAddressLine1, company?.regAddressLine2, company?.regCity, company?.regState, company?.regPincode].filter(Boolean).join(", ")}</div>
    <div class="sub">
      ${company?.telephoneNo ? `Tel: ${company.telephoneNo}` : ""}
      ${company?.email ? ` | Email: ${company.email}` : ""}
      ${company?.website ? ` | ${company.website}` : ""}
    </div>
    ${company?.gstNo ? `<div class="sub">GST: ${company.gstNo}</div>` : ""}
  </div>

  <!-- Letter Title -->
  <div class="letter-title">
    <h2>Lab Testing Letter</h2>
  </div>

  <!-- Meta: Letter No / Date -->
  <div class="meta-row">
    <div class="left">
      <strong>Letter No:</strong> ${escapeHtml(labLetter.letterNo)}<br/>
      ${labLetter.poNumber ? `<strong>PO Ref:</strong> ${escapeHtml(labLetter.poNumber)}` : ""}
    </div>
    <div class="right">
      <strong>Date:</strong> ${formatDate(labLetter.letterDate)}<br/>
      ${labLetter.clientName ? `<strong>Client:</strong> ${escapeHtml(labLetter.clientName)}` : ""}
    </div>
  </div>

  <!-- Lab Address -->
  ${labLetter.labName ? `
  <div class="lab-address">
    <div class="label">To: External Testing Laboratory</div>
    <div class="name">${escapeHtml(labLetter.labName)}</div>
    ${labLetter.labAddress ? `<div class="addr">${escapeHtml(labLetter.labAddress)}</div>` : ""}
  </div>
  ` : ""}

  <!-- Subject -->
  <div class="subject">
    <strong>Subject:</strong> Request for testing of material as per details given below.
  </div>

  <!-- Material Details Table -->
  <table class="details">
    <tbody>
      ${labLetter.productDescription ? `<tr><th>Product Description</th><td>${escapeHtml(labLetter.productDescription)}</td></tr>` : ""}
      ${labLetter.itemCode ? `<tr><th>Item Code</th><td>${escapeHtml(labLetter.itemCode)}</td></tr>` : ""}
      ${labLetter.specification ? `<tr><th>Specification / Grade</th><td>${escapeHtml(labLetter.specification)}</td></tr>` : ""}
      ${labLetter.sizeLabel ? `<tr><th>Size</th><td>${escapeHtml(labLetter.sizeLabel)}</td></tr>` : ""}
      ${labLetter.heatNo ? `<tr><th>Heat Number</th><td style="font-family: monospace; font-weight: 600;">${escapeHtml(labLetter.heatNo)}</td></tr>` : ""}
      ${labLetter.make ? `<tr><th>Make / Manufacturer</th><td>${escapeHtml(labLetter.make)}</td></tr>` : ""}
      ${labLetter.quantity ? `<tr><th>Quantity</th><td>${escapeHtml(labLetter.quantity)}${labLetter.unit ? ` ${escapeHtml(labLetter.unit)}` : ""}</td></tr>` : ""}
      ${labLetter.poNumber ? `<tr><th>PO Number</th><td>${escapeHtml(labLetter.poNumber)}</td></tr>` : ""}
      ${labLetter.clientName ? `<tr><th>Client Name</th><td>${escapeHtml(labLetter.clientName)}</td></tr>` : ""}
    </tbody>
  </table>

  <!-- Tests Required -->
  <div class="tests-section">
    <h3>Tests to be Performed</h3>
    <div class="test-list">
      ${testNames.map((t) => `<span class="test-badge">${escapeHtml(t)}</span>`).join("")}
    </div>
  </div>

  <!-- Witness / TPI -->
  ${labLetter.witnessRequired ? `
  <div class="witness-section">
    <div class="label">Third-Party Witness Required</div>
    <div class="value">
      Yes — ${labLetter.tpiAgencyName ? `Agency: <strong>${escapeHtml(labLetter.tpiAgencyName)}</strong>` : "TPI Agency to be confirmed"}
      ${labLetter.tpiAgency?.contactPerson ? ` | Contact: ${escapeHtml(labLetter.tpiAgency.contactPerson)}` : ""}
      ${labLetter.tpiAgency?.phone ? ` | Phone: ${labLetter.tpiAgency.phone}` : ""}
    </div>
  </div>
  ` : ""}

  <!-- Remarks -->
  ${labLetter.remarks ? `
  <div class="remarks">
    <h3>Remarks</h3>
    <p>${escapeHtml(labLetter.remarks)}</p>
  </div>
  ` : ""}

  <!-- Instruction -->
  <div style="margin-bottom: 20px; font-size: 11px;">
    <p>Kindly carry out the above tests and furnish the test reports/certificates at the earliest.</p>
    ${labLetter.witnessRequired ? `<p style="margin-top: 4px;">Please coordinate with the TPI agency for witness scheduling before commencing tests.</p>` : ""}
  </div>

  <!-- Signature -->
  <div class="signature-area">
    <div class="sig-block">
      <div class="sig-line">Authorized Signatory</div>
      <div style="font-size: 10px; color: #666; margin-top: 2px;">${escapeHtml(labLetter.generatedBy?.name || "")}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">Lab Received By</div>
      <div style="font-size: 10px; color: #666; margin-top: 2px;">(Stamp & Sign)</div>
    </div>
  </div>

  <div class="footer">
    This is a system-generated document from ${escapeHtml(company?.companyName || "NPS Piping Solutions")} ERP.
  </div>
</body>
</html>`;

    const pdfBuffer = await renderHtmlToPdf(html, false);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Lab-Letter-${labLetter.letterNo.replace(/\//g, "-")}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating lab letter PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
