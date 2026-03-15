import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { renderHtmlToPdf } from "@/lib/pdf/render-pdf";
import { wrapHtmlForPrint } from "@/lib/pdf/print-wrapper";

const COMPANY = {
  name: "NPS Piping Solutions",
  address:
    "1210/1211, Prasad Chambers, Tata Road no. 2, Opera House, Charni Road (E)",
  city: "Mumbai - 400004, Maharashtra, India",
  tel: "+91 22 23634200/300",
  email: "info@n-pipe.com",
  web: "www.n-pipe.com",
};

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "---";
  const dt = new Date(d);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${String(dt.getDate()).padStart(2, "0")} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
}

function num(v: any, decimals = 3): string {
  if (v == null || v === "") return "---";
  return Number(v).toFixed(decimals);
}

function currency(v: any): string {
  if (v == null) return "---";
  return Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function resultBadge(result: string | null | undefined): string {
  if (!result) return '<span class="badge badge-hold">HOLD</span>';
  const r = result.toUpperCase();
  if (r === "PASS") return '<span class="badge badge-pass">PASS</span>';
  if (r === "FAIL") return '<span class="badge badge-fail">FAIL</span>';
  return `<span class="badge badge-hold">${r}</span>`;
}

function companyHeaderHtml(): string {
  return `
    <div style="text-align:center; margin-bottom:20px; border-bottom:2px solid #1a365d; padding-bottom:12px;">
      <h1 style="margin:0; font-size:22px; color:#1a365d; font-weight:700;">${COMPANY.name}</h1>
      <p style="margin:4px 0 0; font-size:11px; color:#444;">${COMPANY.address}</p>
      <p style="margin:2px 0 0; font-size:11px; color:#444;">${COMPANY.city}</p>
      <p style="margin:2px 0 0; font-size:10px; color:#666;">Tel: ${COMPANY.tel} | Email: ${COMPANY.email} | Web: ${COMPANY.web}</p>
    </div>
  `;
}

function pageFooter(): string {
  return `<div class="footer">Generated on ${formatDate(new Date())} | ${COMPANY.name} | Dispatch Dossier</div>`;
}

function baseStyles(): string {
  return `
    <style>
      * { box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #333; margin: 0; padding: 0; }
      .page { padding: 10px 0; }
      .page-break { page-break-before: always; }
      h2 { font-size: 16px; color: #1a365d; margin: 0 0 14px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
      h3 { font-size: 14px; color: #2d3748; margin: 14px 0 8px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
      th { background: #f0f4f8; color: #1a365d; font-weight: 600; text-align: left; padding: 7px 8px; border: 1px solid #ddd; font-size: 11px; }
      td { padding: 6px 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top; }
      tr:nth-child(even) { background: #fafbfc; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
      .info-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 16px; }
      .info-item label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.3px; display: block; margin-bottom: 2px; }
      .info-item span { font-size: 12px; font-weight: 500; }
      .mono { font-family: 'Courier New', monospace; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .section-title { font-size: 14px; color: #1a365d; margin: 18px 0 10px; font-weight: 600; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; }
      .badge-pass { background: #c6f6d5; color: #22543d; }
      .badge-fail { background: #fed7d7; color: #9b2c2c; }
      .badge-hold { background: #fefcbf; color: #744210; }
      .badge-info { background: #bee3f8; color: #2a4365; }
      .empty-message { text-align: center; padding: 30px; color: #999; font-style: italic; font-size: 13px; }
      .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 9px; color: #999; text-align: center; }
      .toc-item { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dotted #ccc; font-size: 13px; }
      .toc-item .toc-label { color: #1a365d; font-weight: 500; }
      .toc-item .toc-status { color: #666; font-size: 11px; }
      .contact-card { border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin-bottom: 8px; }
      .contact-card .dept { font-size: 10px; color: #fff; background: #1a365d; padding: 2px 8px; border-radius: 3px; display: inline-block; margin-bottom: 6px; }
      .totals-row { font-weight: 700; background: #e8edf2 !important; }
    </style>
  `;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("dispatch", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const fmt = searchParams.get("format");

    // Parse sections to include (default: all)
    const sectionsParam = searchParams.get("sections");
    const allSections = [
      "cover", "clientPO", "poAcceptance", "mtc", "inspection",
      "tpi", "labReports", "lengthTally", "colourCoding", "packingList", "invoice",
    ];
    const sections = sectionsParam
      ? sectionsParam.split(",").filter((s) => allSections.includes(s))
      : allSections;

    // ============================================================
    // DATA FETCH — deep traversal through the full document chain
    // ============================================================

    const dispatchNote = await prisma.dispatchNote.findUnique({
      where: { id },
      include: {
        packingList: {
          include: {
            items: {
              include: {
                inventoryStock: {
                  include: {
                    mtcDocuments: true,
                    inspections: {
                      include: { parameters: true, tpiAgency: true },
                    },
                    pipeDetails: { orderBy: { pipeNo: "asc" } },
                    labReports: true,
                    qcReleases: {
                      include: { releasedBy: { select: { name: true } } },
                    },
                  },
                },
              },
            },
          },
        },
        salesOrder: {
          include: {
            customer: true,
            quotation: {
              include: {
                items: true,
              },
            },
            invoices: {
              include: { items: true },
              take: 1,
              orderBy: { createdAt: "desc" },
            },
          },
        },
        dispatchAddress: true,
        transporter: true,
      },
    });

    if (!dispatchNote) {
      return NextResponse.json({ error: "Dispatch note not found" }, { status: 404 });
    }

    const so = dispatchNote.salesOrder;
    const customer = so?.customer;
    const quotation = so?.quotation;
    const plItems = dispatchNote.packingList?.items || [];
    const invoice = so?.invoices?.[0] || null;

    // Find Client PO through quotation
    let clientPO: any = null;
    let poAcceptance: any = null;

    if (quotation) {
      clientPO = await prisma.clientPurchaseOrder.findFirst({
        where: { quotationId: quotation.id },
        include: {
          items: { orderBy: { sNo: "asc" } },
          customer: true,
        },
        orderBy: { createdAt: "desc" },
      });

      if (clientPO) {
        poAcceptance = await prisma.pOAcceptance.findUnique({
          where: { clientPurchaseOrderId: clientPO.id },
          include: { createdBy: { select: { name: true } } },
        });
      }
    }

    // Also try matching by customerPoNo on the Sales Order
    if (!clientPO && so?.customerPoNo) {
      clientPO = await prisma.clientPurchaseOrder.findFirst({
        where: { clientPoNumber: so.customerPoNo },
        include: {
          items: { orderBy: { sNo: "asc" } },
          customer: true,
        },
      });
      if (clientPO) {
        poAcceptance = await prisma.pOAcceptance.findUnique({
          where: { clientPurchaseOrderId: clientPO.id },
          include: { createdBy: { select: { name: true } } },
        });
      }
    }

    // Collect unique MTCs, inspections, lab reports, pipe details from inventory stocks
    const allMtcs: any[] = [];
    const allInspections: any[] = [];
    const allLabReports: any[] = [];
    const allPipeDetails: any[] = [];
    const allQcReleases: any[] = [];
    const seenIds = { mtc: new Set<string>(), insp: new Set<string>(), lab: new Set<string>() };

    for (const item of plItems) {
      const stock = item.inventoryStock;
      if (!stock) continue;

      for (const mtc of stock.mtcDocuments || []) {
        if (!seenIds.mtc.has(mtc.id)) {
          seenIds.mtc.add(mtc.id);
          allMtcs.push({ ...mtc, stockHeatNo: stock.heatNo, stockProduct: stock.product, stockSize: stock.sizeLabel });
        }
      }
      for (const insp of stock.inspections || []) {
        if (!seenIds.insp.has(insp.id)) {
          seenIds.insp.add(insp.id);
          allInspections.push({ ...insp, stockHeatNo: stock.heatNo, stockProduct: stock.product, stockSize: stock.sizeLabel });
        }
      }
      for (const lr of stock.labReports || []) {
        if (!seenIds.lab.has(lr.id)) {
          seenIds.lab.add(lr.id);
          allLabReports.push({ ...lr, stockHeatNo: stock.heatNo, stockProduct: stock.product, stockSize: stock.sizeLabel });
        }
      }
      for (const pd of stock.pipeDetails || []) {
        allPipeDetails.push({ ...pd, stockHeatNo: stock.heatNo, stockProduct: stock.product, stockSize: stock.sizeLabel, stockSpec: stock.specification });
      }
      for (const qcr of stock.qcReleases || []) {
        allQcReleases.push({ ...qcr, stockHeatNo: stock.heatNo, stockProduct: stock.product, stockSize: stock.sizeLabel });
      }
    }

    // TPI inspections are inspections that have a tpiAgency
    const tpiInspections = allInspections.filter((i) => i.tpiAgencyId);

    // ============================================================
    // GENERATE HTML PAGES
    // ============================================================

    const pages: string[] = [];

    // ========== COVER PAGE ==========
    if (sections.includes("cover")) {
      const docCount = [
        clientPO && "Client PO",
        poAcceptance && "PO Acceptance",
        allMtcs.length > 0 && `${allMtcs.length} MTC(s)`,
        allInspections.length > 0 && `${allInspections.length} Inspection(s)`,
        tpiInspections.length > 0 && `${tpiInspections.length} TPI Certificate(s)`,
        allLabReports.length > 0 && `${allLabReports.length} Lab Report(s)`,
        allPipeDetails.length > 0 && "Length Tally",
        "Packing List",
        invoice && "Invoice",
      ].filter(Boolean);

      pages.push(`
        <div class="page">
          ${companyHeaderHtml()}
          <div style="text-align:center; margin: 40px 0 30px;">
            <h2 style="font-size: 24px; color: #1a365d; border: none; margin-bottom: 8px;">DISPATCH DOSSIER</h2>
            <p style="font-size: 14px; color: #555; margin: 0;">Final Document Compilation for Client</p>
          </div>

          <div class="info-grid" style="margin: 30px auto; max-width: 500px;">
            <div class="info-item">
              <label>Dispatch Note</label>
              <span class="mono">${dispatchNote.dnNo}</span>
            </div>
            <div class="info-item">
              <label>Dispatch Date</label>
              <span>${formatDate(dispatchNote.dispatchDate)}</span>
            </div>
            <div class="info-item">
              <label>Customer</label>
              <span>${customer?.name || "---"}</span>
            </div>
            <div class="info-item">
              <label>Sales Order</label>
              <span class="mono">${so?.soNo || "---"}</span>
            </div>
            ${clientPO ? `
            <div class="info-item">
              <label>Client PO</label>
              <span class="mono">${clientPO.clientPoNumber}</span>
            </div>
            ` : ""}
            ${poAcceptance ? `
            <div class="info-item">
              <label>PO Acceptance</label>
              <span class="mono">${poAcceptance.acceptanceNo}</span>
            </div>
            ` : ""}
          </div>

          <div style="margin: 30px 40px;">
            <div class="section-title">Table of Contents</div>
            ${docCount.map((doc, i) => `
              <div class="toc-item">
                <span class="toc-label">${i + 1}. ${doc}</span>
                <span class="toc-status">Included</span>
              </div>
            `).join("")}
          </div>

          ${pageFooter()}
        </div>
      `);
    }

    // ========== CLIENT PO ==========
    if (sections.includes("clientPO") && clientPO) {
      const cpoItemRows = (clientPO.items || []).map((item: any, idx: number) => `
        <tr>
          <td class="text-center">${item.sNo || idx + 1}</td>
          <td>${item.product || "---"}</td>
          <td>${item.material || "---"}${item.additionalSpec ? ` / ${item.additionalSpec}` : ""}</td>
          <td class="mono">${item.sizeLabel || "---"}</td>
          <td>${item.ends || "---"}</td>
          <td class="text-right">${num(item.qtyOrdered)}</td>
          <td>${item.uom || "Mtr"}</td>
          <td class="text-right">${currency(item.unitRate)}</td>
          <td class="text-right">${currency(item.amount)}</td>
        </tr>
      `).join("");

      pages.push(`
        <div class="page page-break">
          ${companyHeaderHtml()}
          <h2>Client Purchase Order</h2>
          <div class="info-grid">
            <div class="info-item"><label>CPO Number</label><span class="mono">${clientPO.cpoNo}</span></div>
            <div class="info-item"><label>Client PO Number</label><span class="mono">${clientPO.clientPoNumber}</span></div>
            <div class="info-item"><label>CPO Date</label><span>${formatDate(clientPO.cpoDate)}</span></div>
            <div class="info-item"><label>Client PO Date</label><span>${formatDate(clientPO.clientPoDate)}</span></div>
            <div class="info-item"><label>Customer</label><span>${clientPO.customer?.name || customer?.name || "---"}</span></div>
            <div class="info-item"><label>Project</label><span>${clientPO.projectName || "---"}</span></div>
            <div class="info-item"><label>Payment Terms</label><span>${clientPO.paymentTerms || "---"}</span></div>
            <div class="info-item"><label>Delivery Terms</label><span>${clientPO.deliveryTerms || "---"}</span></div>
          </div>
          <table>
            <thead>
              <tr>
                <th class="text-center" style="width:30px;">#</th>
                <th>Product</th>
                <th>Material</th>
                <th>Size</th>
                <th>Ends</th>
                <th class="text-right">Qty</th>
                <th>UOM</th>
                <th class="text-right">Rate</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${cpoItemRows}
              <tr class="totals-row">
                <td colspan="8" class="text-right">Grand Total</td>
                <td class="text-right">${currency(clientPO.grandTotal)}</td>
              </tr>
            </tbody>
          </table>
          ${clientPO.remarks ? `<p style="font-size:11px; color:#555; margin-top:8px;"><strong>Remarks:</strong> ${clientPO.remarks}</p>` : ""}
          ${pageFooter()}
        </div>
      `);
    }

    // ========== PO ACCEPTANCE ==========
    if (sections.includes("poAcceptance") && poAcceptance) {
      pages.push(`
        <div class="page page-break">
          ${companyHeaderHtml()}
          <h2>P.O. Acceptance</h2>
          <div class="info-grid">
            <div class="info-item"><label>Acceptance No</label><span class="mono">${poAcceptance.acceptanceNo}</span></div>
            <div class="info-item"><label>Status</label><span class="badge badge-info">${poAcceptance.status}</span></div>
            <div class="info-item"><label>Acceptance Date</label><span>${formatDate(poAcceptance.acceptanceDate)}</span></div>
            <div class="info-item"><label>Committed Delivery Date</label><span>${formatDate(poAcceptance.committedDeliveryDate)}</span></div>
            <div class="info-item"><label>Client PO</label><span class="mono">${clientPO?.clientPoNumber || "---"}</span></div>
            <div class="info-item"><label>Created By</label><span>${poAcceptance.createdBy?.name || "---"}</span></div>
          </div>

          <div class="section-title">Client Contact / Department Contact Details</div>
          <div class="info-grid-3">
            <div class="contact-card">
              <div class="dept">Follow-up</div>
              <div style="margin-top:4px;">
                <label style="font-size:10px;color:#888;">Name</label>
                <div style="font-size:12px;font-weight:500;">${poAcceptance.followUpName || "---"}</div>
                <label style="font-size:10px;color:#888;margin-top:4px;">Email</label>
                <div style="font-size:11px;">${poAcceptance.followUpEmail || "---"}</div>
                <label style="font-size:10px;color:#888;margin-top:4px;">Contact</label>
                <div style="font-size:11px;">${poAcceptance.followUpPhone || "---"}</div>
              </div>
            </div>
            <div class="contact-card">
              <div class="dept" style="background:#4a5568;">Quality / Inspection</div>
              <div style="margin-top:4px;">
                <label style="font-size:10px;color:#888;">Name</label>
                <div style="font-size:12px;font-weight:500;">${poAcceptance.qualityName || "---"}</div>
                <label style="font-size:10px;color:#888;margin-top:4px;">Email</label>
                <div style="font-size:11px;">${poAcceptance.qualityEmail || "---"}</div>
                <label style="font-size:10px;color:#888;margin-top:4px;">Contact</label>
                <div style="font-size:11px;">${poAcceptance.qualityPhone || "---"}</div>
              </div>
            </div>
            <div class="contact-card">
              <div class="dept" style="background:#2d3748;">Accounts</div>
              <div style="margin-top:4px;">
                <label style="font-size:10px;color:#888;">Name</label>
                <div style="font-size:12px;font-weight:500;">${poAcceptance.accountsName || "---"}</div>
                <label style="font-size:10px;color:#888;margin-top:4px;">Email</label>
                <div style="font-size:11px;">${poAcceptance.accountsEmail || "---"}</div>
                <label style="font-size:10px;color:#888;margin-top:4px;">Contact</label>
                <div style="font-size:11px;">${poAcceptance.accountsPhone || "---"}</div>
              </div>
            </div>
          </div>

          ${poAcceptance.remarks ? `<p style="font-size:11px; color:#555;"><strong>Remarks:</strong> ${poAcceptance.remarks}</p>` : ""}
          ${pageFooter()}
        </div>
      `);
    }

    // ========== MTC CERTIFICATES ==========
    if (sections.includes("mtc")) {
      if (allMtcs.length === 0) {
        pages.push(`
          <div class="page page-break">
            ${companyHeaderHtml()}
            <h2>MTC Certificates</h2>
            <div class="empty-message">No MTC certificates available for dispatched items</div>
            ${pageFooter()}
          </div>
        `);
      } else {
        const mtcRows = allMtcs.map((mtc: any, idx: number) => `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td class="mono">${mtc.mtcNo || "---"}</td>
            <td class="mono">${mtc.heatNo || mtc.stockHeatNo || "---"}</td>
            <td>${mtc.stockProduct || "---"}</td>
            <td class="mono">${mtc.stockSize || "---"}</td>
            <td>${formatDate(mtc.uploadDate)}</td>
            <td>${mtc.verificationStatus === "VERIFIED" ? '<span class="badge badge-pass">VERIFIED</span>' : mtc.verificationStatus === "DISCREPANT" ? '<span class="badge badge-fail">DISCREPANT</span>' : '<span class="badge badge-hold">PENDING</span>'}</td>
            <td>${mtc.remarks || "---"}</td>
          </tr>
        `).join("");

        pages.push(`
          <div class="page page-break">
            ${companyHeaderHtml()}
            <h2>MTC Certificates</h2>
            <p style="font-size:11px; color:#666; margin-bottom:12px;">
              DN: <strong>${dispatchNote.dnNo}</strong> | Total MTCs: <strong>${allMtcs.length}</strong>
            </p>
            <table>
              <thead>
                <tr>
                  <th class="text-center" style="width:30px;">#</th>
                  <th>MTC No.</th>
                  <th>Heat No.</th>
                  <th>Product</th>
                  <th>Size</th>
                  <th>Date</th>
                  <th>Verification</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>${mtcRows}</tbody>
            </table>
            ${pageFooter()}
          </div>
        `);
      }
    }

    // ========== INSPECTION REPORTS ==========
    if (sections.includes("inspection")) {
      // Non-TPI inspections (internal)
      const internalInsp = allInspections.filter((i) => !i.tpiAgencyId);

      if (internalInsp.length === 0) {
        pages.push(`
          <div class="page page-break">
            ${companyHeaderHtml()}
            <h2>Inspection Reports</h2>
            <div class="empty-message">No internal inspection reports for dispatched items</div>
            ${pageFooter()}
          </div>
        `);
      } else {
        // Overview
        const overviewRows = internalInsp.map((insp: any, idx: number) => `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td class="mono">${insp.inspectionNo}</td>
            <td class="mono">${insp.stockHeatNo || "---"}</td>
            <td>${insp.stockProduct || "---"}</td>
            <td class="mono">${insp.stockSize || "---"}</td>
            <td>${formatDate(insp.inspectionDate)}</td>
            <td>${resultBadge(insp.overallResult)}</td>
          </tr>
        `).join("");

        // Detailed parameters per inspection
        const detailSections = internalInsp.map((insp: any) => {
          const paramRows = (insp.parameters || []).map((p: any) => `
            <tr>
              <td>${p.parameterName}</td>
              <td>${p.parameterType || "---"}</td>
              <td class="mono">${p.standardValue || "---"}</td>
              <td class="mono">${p.tolerance || "---"}</td>
              <td class="mono">${p.resultValue || "---"}</td>
              <td>${resultBadge(p.result)}</td>
            </tr>
          `).join("");

          if (!paramRows) return "";

          return `
            <div style="margin-top:14px;">
              <h3>${insp.inspectionNo} — Heat: ${insp.stockHeatNo || "---"} | ${insp.stockProduct || ""} ${insp.stockSize || ""}</h3>
              <table>
                <thead><tr><th>Parameter</th><th>Type</th><th>Standard</th><th>Tolerance</th><th>Result</th><th>Status</th></tr></thead>
                <tbody>${paramRows}</tbody>
              </table>
              ${insp.remarks ? `<p style="font-size:10px;color:#666;">Remarks: ${insp.remarks}</p>` : ""}
            </div>
          `;
        }).join("");

        pages.push(`
          <div class="page page-break">
            ${companyHeaderHtml()}
            <h2>Inspection Reports</h2>
            <p style="font-size:11px; color:#666; margin-bottom:12px;">
              DN: <strong>${dispatchNote.dnNo}</strong> | Total Inspections: <strong>${internalInsp.length}</strong>
            </p>
            <table>
              <thead><tr>
                <th class="text-center" style="width:30px;">#</th>
                <th>Inspection No.</th><th>Heat No.</th><th>Product</th><th>Size</th><th>Date</th><th>Result</th>
              </tr></thead>
              <tbody>${overviewRows}</tbody>
            </table>
            ${detailSections}
            ${pageFooter()}
          </div>
        `);
      }
    }

    // ========== TPI CERTIFICATES ==========
    if (sections.includes("tpi")) {
      if (tpiInspections.length === 0) {
        pages.push(`
          <div class="page page-break">
            ${companyHeaderHtml()}
            <h2>TPI Certificates (Third-Party Inspection)</h2>
            <div class="empty-message">No TPI inspection records for dispatched items</div>
            ${pageFooter()}
          </div>
        `);
      } else {
        const tpiRows = tpiInspections.map((insp: any, idx: number) => `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td class="mono">${insp.inspectionNo}</td>
            <td>${insp.tpiAgency?.name || "---"}</td>
            <td class="mono">${insp.stockHeatNo || "---"}</td>
            <td>${insp.stockProduct || "---"} ${insp.stockSize || ""}</td>
            <td>${formatDate(insp.inspectionDate)}</td>
            <td>${resultBadge(insp.overallResult)}</td>
            <td>${insp.tpiSignOffPaths && Array.isArray(insp.tpiSignOffPaths) && insp.tpiSignOffPaths.length > 0 ? '<span class="badge badge-pass">Signed</span>' : '<span class="badge badge-hold">Pending</span>'}</td>
          </tr>
        `).join("");

        // Detailed TPI parameters
        const tpiDetails = tpiInspections.map((insp: any) => {
          const paramRows = (insp.parameters || []).map((p: any) => `
            <tr>
              <td>${p.parameterName}</td>
              <td class="mono">${p.standardValue || "---"}</td>
              <td class="mono">${p.resultValue || "---"}</td>
              <td>${resultBadge(p.result)}</td>
            </tr>
          `).join("");

          if (!paramRows) return "";

          return `
            <div style="margin-top:14px;">
              <h3>${insp.inspectionNo} — TPI: ${insp.tpiAgency?.name || "---"} | Heat: ${insp.stockHeatNo || "---"}</h3>
              <table>
                <thead><tr><th>Parameter</th><th>Standard</th><th>Result</th><th>Status</th></tr></thead>
                <tbody>${paramRows}</tbody>
              </table>
            </div>
          `;
        }).join("");

        pages.push(`
          <div class="page page-break">
            ${companyHeaderHtml()}
            <h2>TPI Certificates (Third-Party Inspection)</h2>
            <p style="font-size:11px; color:#666; margin-bottom:12px;">
              Total TPI Inspections: <strong>${tpiInspections.length}</strong>
            </p>
            <table>
              <thead><tr>
                <th class="text-center" style="width:30px;">#</th>
                <th>Inspection No.</th><th>TPI Agency</th><th>Heat No.</th><th>Product / Size</th><th>Date</th><th>Result</th><th>Sign-off</th>
              </tr></thead>
              <tbody>${tpiRows}</tbody>
            </table>
            ${tpiDetails}
            ${pageFooter()}
          </div>
        `);
      }
    }

    // ========== LAB TEST REPORTS ==========
    if (sections.includes("labReports")) {
      if (allLabReports.length === 0) {
        pages.push(`
          <div class="page page-break">
            ${companyHeaderHtml()}
            <h2>Lab Test Reports</h2>
            <div class="empty-message">No lab test reports for dispatched items</div>
            ${pageFooter()}
          </div>
        `);
      } else {
        const labRows = allLabReports.map((lr: any, idx: number) => `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td class="mono">${lr.reportNo}</td>
            <td><span class="badge badge-info">${lr.reportType}</span></td>
            <td class="mono">${lr.heatNo || lr.stockHeatNo || "---"}</td>
            <td>${lr.stockProduct || "---"}</td>
            <td class="mono">${lr.stockSize || "---"}</td>
            <td>${lr.labName || "---"}</td>
            <td>${formatDate(lr.testDate || lr.reportDate)}</td>
            <td>${lr.result ? resultBadge(lr.result) : "---"}</td>
          </tr>
        `).join("");

        pages.push(`
          <div class="page page-break">
            ${companyHeaderHtml()}
            <h2>Lab Test Reports</h2>
            <p style="font-size:11px; color:#666; margin-bottom:12px;">
              Total Reports: <strong>${allLabReports.length}</strong>
            </p>
            <table>
              <thead><tr>
                <th class="text-center" style="width:30px;">#</th>
                <th>Report No.</th><th>Type</th><th>Heat No.</th><th>Product</th><th>Size</th><th>Lab</th><th>Test Date</th><th>Result</th>
              </tr></thead>
              <tbody>${labRows}</tbody>
            </table>
            ${pageFooter()}
          </div>
        `);
      }
    }

    // ========== LENGTH TALLY LIST ==========
    if (sections.includes("lengthTally")) {
      if (allPipeDetails.length === 0) {
        pages.push(`
          <div class="page page-break">
            ${companyHeaderHtml()}
            <h2>Length Tally List</h2>
            <div class="empty-message">No pipe-level length tally data available</div>
            ${pageFooter()}
          </div>
        `);
      } else {
        // Group by heat no
        const byHeat: Record<string, any[]> = {};
        for (const pd of allPipeDetails) {
          const key = pd.heatNo || pd.stockHeatNo || "Unknown";
          if (!byHeat[key]) byHeat[key] = [];
          byHeat[key].push(pd);
        }

        let tallyContent = "";
        let grandTotalLength = 0;
        let grandTotalPipes = 0;

        for (const [heatNo, pipes] of Object.entries(byHeat)) {
          let heatTotal = 0;
          const pipeRows = pipes.map((p: any) => {
            const len = Number(p.length) || 0;
            heatTotal += len;
            return `
              <tr>
                <td class="text-center">${p.pipeNo}</td>
                <td class="text-right mono">${len > 0 ? len.toFixed(3) : "---"}</td>
                <td class="mono">${p.make || "---"}</td>
                <td class="mono">${p.mtcNo || "---"}</td>
                <td>${p.bundleNo || "---"}</td>
                <td>${p.remarks || "---"}</td>
              </tr>
            `;
          }).join("");

          grandTotalLength += heatTotal;
          grandTotalPipes += pipes.length;

          tallyContent += `
            <div style="margin-top:14px;">
              <h3>Heat No: ${heatNo} — ${pipes[0]?.stockProduct || ""} ${pipes[0]?.stockSize || ""} ${pipes[0]?.stockSpec || ""}</h3>
              <table>
                <thead><tr>
                  <th class="text-center">Pipe No.</th><th class="text-right">Length (Mtr)</th><th>Make</th><th>MTC No.</th><th>Bundle</th><th>Remarks</th>
                </tr></thead>
                <tbody>
                  ${pipeRows}
                  <tr class="totals-row">
                    <td class="text-right">Pipes: ${pipes.length}</td>
                    <td class="text-right">${heatTotal.toFixed(3)}</td>
                    <td colspan="4"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          `;
        }

        pages.push(`
          <div class="page page-break">
            ${companyHeaderHtml()}
            <h2>Length Tally List</h2>
            <p style="font-size:11px; color:#666; margin-bottom:12px;">
              DN: <strong>${dispatchNote.dnNo}</strong> | Total Pipes: <strong>${grandTotalPipes}</strong> | Total Length: <strong>${grandTotalLength.toFixed(3)} Mtr</strong>
            </p>
            ${tallyContent}
            ${pageFooter()}
          </div>
        `);
      }
    }

    // ========== COLOUR CODING COMPLIANCE ==========
    if (sections.includes("colourCoding")) {
      // Collect marking details and QC release info
      const colourData = plItems
        .filter((item: any) => item.markingDetails || item.inventoryStock)
        .map((item: any, idx: number) => ({
          sNo: idx + 1,
          heatNo: item.heatNo || item.inventoryStock?.heatNo || "---",
          product: item.inventoryStock?.product || "---",
          size: item.sizeLabel || item.inventoryStock?.sizeLabel || "---",
          marking: item.markingDetails || "---",
          qcStatus: allQcReleases.find(
            (q: any) => q.inventoryStockId === item.inventoryStockId
          )
            ? "Released"
            : "---",
        }));

      if (colourData.length === 0) {
        pages.push(`
          <div class="page page-break">
            ${companyHeaderHtml()}
            <h2>Colour Coding Compliance</h2>
            <div class="empty-message">No colour coding / marking data available</div>
            ${pageFooter()}
          </div>
        `);
      } else {
        const ccRows = colourData.map((item: any) => `
          <tr>
            <td class="text-center">${item.sNo}</td>
            <td class="mono">${item.heatNo}</td>
            <td>${item.product}</td>
            <td class="mono">${item.size}</td>
            <td>${item.marking}</td>
            <td>${item.qcStatus === "Released" ? '<span class="badge badge-pass">QC Released</span>' : '<span class="badge badge-hold">Pending</span>'}</td>
          </tr>
        `).join("");

        pages.push(`
          <div class="page page-break">
            ${companyHeaderHtml()}
            <h2>Colour Coding &amp; Marking Compliance</h2>
            <p style="font-size:11px; color:#666; margin-bottom:12px;">
              DN: <strong>${dispatchNote.dnNo}</strong> | Items: <strong>${colourData.length}</strong>
            </p>
            <table>
              <thead><tr>
                <th class="text-center" style="width:30px;">#</th>
                <th>Heat No.</th><th>Product</th><th>Size</th><th>Marking Details</th><th>QC Status</th>
              </tr></thead>
              <tbody>${ccRows}</tbody>
            </table>
            ${pageFooter()}
          </div>
        `);
      }
    }

    // ========== PACKING LIST ==========
    if (sections.includes("packingList")) {
      let totalQty = 0, totalPcs = 0, totalGross = 0, totalNet = 0;

      const plRows = plItems.map((item: any, idx: number) => {
        const qty = Number(item.quantityMtr) || 0;
        const pcs = Number(item.pieces) || 0;
        const gross = Number(item.grossWeightKg) || 0;
        const net = Number(item.netWeightKg) || 0;
        totalQty += qty; totalPcs += pcs; totalGross += gross; totalNet += net;

        return `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td class="mono">${item.heatNo || item.inventoryStock?.heatNo || "---"}</td>
            <td class="mono">${item.sizeLabel || item.inventoryStock?.sizeLabel || "---"}</td>
            <td>${item.material || "---"}</td>
            <td>${item.inventoryStock?.product || "---"}</td>
            <td class="text-right">${num(item.quantityMtr)}</td>
            <td class="text-right">${item.pieces || 0}</td>
            <td>${item.bundleNo || "---"}</td>
            <td class="text-right">${gross > 0 ? num(gross) : "---"}</td>
            <td class="text-right">${net > 0 ? num(net) : "---"}</td>
          </tr>
        `;
      }).join("");

      pages.push(`
        <div class="page page-break">
          ${companyHeaderHtml()}
          <h2>Packing List — ${dispatchNote.packingList?.plNo || ""}</h2>
          <div class="info-grid">
            <div class="info-item"><label>DN Number</label><span class="mono">${dispatchNote.dnNo}</span></div>
            <div class="info-item"><label>Dispatch Date</label><span>${formatDate(dispatchNote.dispatchDate)}</span></div>
            <div class="info-item"><label>Customer</label><span>${customer?.name || "---"}</span></div>
            <div class="info-item"><label>Vehicle</label><span class="mono">${dispatchNote.vehicleNo || "---"}</span></div>
          </div>
          <table>
            <thead><tr>
              <th class="text-center" style="width:30px;">#</th>
              <th>Heat No.</th><th>Size</th><th>Material</th><th>Product</th>
              <th class="text-right">Qty (Mtr)</th><th class="text-right">Pcs</th><th>Bundle</th>
              <th class="text-right">Gross (Kg)</th><th class="text-right">Net (Kg)</th>
            </tr></thead>
            <tbody>
              ${plRows}
              <tr class="totals-row">
                <td colspan="5" class="text-right">TOTALS</td>
                <td class="text-right">${totalQty.toFixed(3)}</td>
                <td class="text-right">${totalPcs}</td>
                <td></td>
                <td class="text-right">${totalGross.toFixed(3)}</td>
                <td class="text-right">${totalNet.toFixed(3)}</td>
              </tr>
            </tbody>
          </table>
          ${pageFooter()}
        </div>
      `);
    }

    // ========== INVOICE ==========
    if (sections.includes("invoice") && invoice) {
      const invItemRows = (invoice.items || []).map((item: any, idx: number) => `
        <tr>
          <td class="text-center">${item.sNo || idx + 1}</td>
          <td>${item.description || "---"}</td>
          <td class="mono">${item.heatNo || "---"}</td>
          <td class="mono">${item.sizeLabel || "---"}</td>
          <td class="text-right">${num(item.quantity)}</td>
          <td>${item.uom || "Mtr"}</td>
          <td class="text-right">${currency(item.unitRate)}</td>
          <td class="text-right">${currency(item.amount)}</td>
          <td class="mono text-center">${item.hsnCode || "---"}</td>
        </tr>
      `).join("");

      const invTaxLines = [];
      if (Number(invoice.cgst) > 0) invTaxLines.push(`CGST: ${currency(invoice.cgst)}`);
      if (Number(invoice.sgst) > 0) invTaxLines.push(`SGST: ${currency(invoice.sgst)}`);
      if (Number(invoice.igst) > 0) invTaxLines.push(`IGST: ${currency(invoice.igst)}`);
      if (Number(invoice.tcsAmount) > 0) invTaxLines.push(`TCS: ${currency(invoice.tcsAmount)}`);

      pages.push(`
        <div class="page page-break">
          ${companyHeaderHtml()}
          <h2>Invoice — ${invoice.invoiceNo}</h2>
          <div class="info-grid">
            <div class="info-item"><label>Invoice No</label><span class="mono">${invoice.invoiceNo}</span></div>
            <div class="info-item"><label>Invoice Date</label><span>${formatDate(invoice.invoiceDate)}</span></div>
            <div class="info-item"><label>Type</label><span class="badge badge-info">${invoice.invoiceType}</span></div>
            <div class="info-item"><label>Status</label><span class="badge ${invoice.status === "PAID" ? "badge-pass" : "badge-hold"}">${invoice.status}</span></div>
            <div class="info-item"><label>Customer</label><span>${customer?.name || "---"}</span></div>
            <div class="info-item"><label>GSTIN</label><span class="mono">${invoice.customerGstin || customer?.gstNo || "---"}</span></div>
            ${invoice.eWayBillNo ? `<div class="info-item"><label>E-Way Bill</label><span class="mono">${invoice.eWayBillNo}</span></div>` : ""}
            ${invoice.dueDate ? `<div class="info-item"><label>Due Date</label><span>${formatDate(invoice.dueDate)}</span></div>` : ""}
          </div>
          <table>
            <thead><tr>
              <th class="text-center" style="width:30px;">#</th>
              <th>Description</th><th>Heat No.</th><th>Size</th>
              <th class="text-right">Qty</th><th>UOM</th><th class="text-right">Rate</th><th class="text-right">Amount</th><th class="text-center">HSN</th>
            </tr></thead>
            <tbody>
              ${invItemRows}
              <tr class="totals-row">
                <td colspan="7" class="text-right">Subtotal</td>
                <td class="text-right">${currency(invoice.subtotal)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <div style="text-align:right; margin-top:8px;">
            ${invTaxLines.length > 0 ? `<p style="font-size:11px; color:#555;">${invTaxLines.join(" | ")}</p>` : ""}
            ${Number(invoice.roundOff) !== 0 ? `<p style="font-size:11px; color:#555;">Round Off: ${currency(invoice.roundOff)}</p>` : ""}
            <p style="font-size:16px; font-weight:700; color:#1a365d;">Total: \u20B9 ${currency(invoice.totalAmount)}</p>
            ${invoice.amountInWords ? `<p style="font-size:10px; color:#666; font-style:italic;">${invoice.amountInWords}</p>` : ""}
          </div>
          ${pageFooter()}
        </div>
      `);
    } else if (sections.includes("invoice") && !invoice) {
      pages.push(`
        <div class="page page-break">
          ${companyHeaderHtml()}
          <h2>Invoice</h2>
          <div class="empty-message">No invoice generated yet for this dispatch</div>
          ${pageFooter()}
        </div>
      `);
    }

    // ============================================================
    // COMBINE ALL PAGES
    // ============================================================

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Dispatch Dossier - ${dispatchNote.dnNo}</title>
        ${baseStyles()}
      </head>
      <body>
        ${pages.join("\n")}
      </body>
      </html>
    `;

    if (fmt === "html") {
      return new NextResponse(wrapHtmlForPrint(fullHtml, false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const pdfBuffer = await renderHtmlToPdf(fullHtml, false);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="dossier-${dispatchNote.dnNo.replace(/\//g, "-")}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating dossier:", error);
    return NextResponse.json(
      { error: "Failed to generate dispatch dossier" },
      { status: 500 }
    );
  }
}
