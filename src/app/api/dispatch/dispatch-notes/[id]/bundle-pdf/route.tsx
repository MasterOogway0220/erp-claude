import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { renderHtmlToPdf } from "@/lib/pdf/render-pdf";

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

function baseStyles(): string {
  return `
    <style>
      * { box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #333; margin: 0; padding: 0; }
      .page { padding: 10px 0; }
      .page-break { page-break-before: always; }
      h2 { font-size: 16px; color: #1a365d; margin: 0 0 14px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
      th { background: #f0f4f8; color: #1a365d; font-weight: 600; text-align: left; padding: 7px 8px; border: 1px solid #ddd; font-size: 11px; }
      td { padding: 6px 8px; border: 1px solid #ddd; font-size: 11px; vertical-align: top; }
      tr:nth-child(even) { background: #fafbfc; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
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
      .empty-message { text-align: center; padding: 30px; color: #999; font-style: italic; font-size: 13px; }
      .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 9px; color: #999; text-align: center; }
    </style>
  `;
}

function resultBadge(result: string | null | undefined): string {
  if (!result) return '<span class="badge badge-hold">HOLD</span>';
  const r = result.toUpperCase();
  if (r === "PASS") return '<span class="badge badge-pass">PASS</span>';
  if (r === "FAIL") return '<span class="badge badge-fail">FAIL</span>';
  return `<span class="badge badge-hold">${r}</span>`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("dispatch", "read");
    if (!authorized) return response!;

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
                      include: { parameters: true },
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
          },
        },
        transporter: true,
      },
    });

    if (!dispatchNote) {
      return NextResponse.json(
        { error: "Dispatch note not found" },
        { status: 404 }
      );
    }

    const customer = dispatchNote.salesOrder?.customer;
    const plItems = dispatchNote.packingList?.items || [];

    // Collect all MTCs and inspections from the inventory stock items
    const allMtcs: any[] = [];
    const allInspections: any[] = [];
    const seenMtcIds = new Set<string>();
    const seenInspectionIds = new Set<string>();

    for (const item of plItems) {
      if (item.inventoryStock) {
        for (const mtc of item.inventoryStock.mtcDocuments || []) {
          if (!seenMtcIds.has(mtc.id)) {
            seenMtcIds.add(mtc.id);
            allMtcs.push({
              ...mtc,
              stockHeatNo: item.inventoryStock.heatNo,
              stockProduct: item.inventoryStock.product,
              stockSize: item.inventoryStock.sizeLabel,
            });
          }
        }
        for (const insp of item.inventoryStock.inspections || []) {
          if (!seenInspectionIds.has(insp.id)) {
            seenInspectionIds.add(insp.id);
            allInspections.push({
              ...insp,
              stockHeatNo: item.inventoryStock.heatNo,
              stockProduct: item.inventoryStock.product,
              stockSize: item.inventoryStock.sizeLabel,
            });
          }
        }
      }
    }

    // ========== PAGE 1: DISPATCH NOTE ==========
    const dispatchNotePage = `
      <div class="page">
        ${companyHeaderHtml()}
        <h2>Dispatch Note</h2>
        <div class="info-grid">
          <div class="info-item">
            <label>DN Number</label>
            <span class="mono">${dispatchNote.dnNo}</span>
          </div>
          <div class="info-item">
            <label>Dispatch Date</label>
            <span>${formatDate(dispatchNote.dispatchDate)}</span>
          </div>
          <div class="info-item">
            <label>Sales Order</label>
            <span class="mono">${dispatchNote.salesOrder?.soNo || "---"}</span>
          </div>
          <div class="info-item">
            <label>Packing List</label>
            <span class="mono">${dispatchNote.packingList?.plNo || "---"}</span>
          </div>
        </div>

        <div class="section-title">Customer Information</div>
        <div class="info-grid">
          <div class="info-item">
            <label>Customer Name</label>
            <span>${customer?.name || "---"}</span>
          </div>
          <div class="info-item">
            <label>GST No.</label>
            <span class="mono">${customer?.gstNo || "---"}</span>
          </div>
          <div class="info-item">
            <label>Address</label>
            <span>${[customer?.addressLine1, customer?.addressLine2, customer?.city, customer?.state, customer?.pincode].filter(Boolean).join(", ") || "---"}</span>
          </div>
          <div class="info-item">
            <label>Contact</label>
            <span>${customer?.contactPerson || "---"}${customer?.phone ? ` | ${customer.phone}` : ""}</span>
          </div>
        </div>

        <div class="section-title">Transport Details</div>
        <div class="info-grid">
          <div class="info-item">
            <label>Vehicle Number</label>
            <span class="mono">${dispatchNote.vehicleNo || "---"}</span>
          </div>
          <div class="info-item">
            <label>LR Number</label>
            <span class="mono">${dispatchNote.lrNo || "---"}</span>
          </div>
          <div class="info-item">
            <label>Transporter</label>
            <span>${dispatchNote.transporter?.name || "---"}</span>
          </div>
          <div class="info-item">
            <label>E-Way Bill No.</label>
            <span class="mono">${dispatchNote.ewayBillNo || "---"}</span>
          </div>
          <div class="info-item">
            <label>Destination</label>
            <span>${dispatchNote.destination || "---"}</span>
          </div>
        </div>

        ${dispatchNote.remarks ? `
          <div class="section-title">Remarks</div>
          <p style="font-size:12px; color:#555;">${dispatchNote.remarks}</p>
        ` : ""}

        <div class="footer">
          Generated on ${formatDate(new Date())} | ${COMPANY.name}
        </div>
      </div>
    `;

    // ========== PAGE 2: PACKING LIST ==========
    let totalQty = 0;
    let totalPcs = 0;
    let totalGross = 0;
    let totalNet = 0;

    const plRows = plItems
      .map((item: any, idx: number) => {
        const qty = Number(item.quantityMtr) || 0;
        const pcs = Number(item.pieces) || 0;
        const gross = Number(item.grossWeightKg) || 0;
        const net = Number(item.netWeightKg) || 0;
        totalQty += qty;
        totalPcs += pcs;
        totalGross += gross;
        totalNet += net;

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
            <td class="text-right">${item.grossWeightKg ? num(item.grossWeightKg) : "---"}</td>
            <td class="text-right">${item.netWeightKg ? num(item.netWeightKg) : "---"}</td>
          </tr>
        `;
      })
      .join("");

    const packingListPage = `
      <div class="page page-break">
        ${companyHeaderHtml()}
        <h2>Packing List - ${dispatchNote.packingList?.plNo || ""}</h2>
        <p style="font-size:11px; color:#666; margin-bottom:12px;">
          DN: <strong>${dispatchNote.dnNo}</strong> | Date: ${formatDate(dispatchNote.dispatchDate)} | Customer: <strong>${customer?.name || "---"}</strong>
        </p>
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width:30px;">#</th>
              <th>Heat No.</th>
              <th>Size</th>
              <th>Material</th>
              <th>Product</th>
              <th class="text-right">Qty (Mtr)</th>
              <th class="text-right">Pcs</th>
              <th>Bundle</th>
              <th class="text-right">Gross Wt (Kg)</th>
              <th class="text-right">Net Wt (Kg)</th>
            </tr>
          </thead>
          <tbody>
            ${plRows}
            <tr style="font-weight:700; background:#e8edf2;">
              <td colspan="5" class="text-right" style="font-weight:700;">TOTALS</td>
              <td class="text-right">${totalQty.toFixed(3)}</td>
              <td class="text-right">${totalPcs}</td>
              <td></td>
              <td class="text-right">${totalGross.toFixed(3)}</td>
              <td class="text-right">${totalNet.toFixed(3)}</td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          Generated on ${formatDate(new Date())} | ${COMPANY.name}
        </div>
      </div>
    `;

    // ========== PAGE 3+: MTC SUMMARY ==========
    let mtcPage: string;
    if (allMtcs.length === 0) {
      mtcPage = `
        <div class="page page-break">
          ${companyHeaderHtml()}
          <h2>MTC Summary</h2>
          <p style="font-size:11px; color:#666; margin-bottom:12px;">
            DN: <strong>${dispatchNote.dnNo}</strong> | Date: ${formatDate(dispatchNote.dispatchDate)}
          </p>
          <div class="empty-message">No MTCs available for dispatched items</div>
          <div class="footer">
            Generated on ${formatDate(new Date())} | ${COMPANY.name}
          </div>
        </div>
      `;
    } else {
      const mtcRows = allMtcs
        .map(
          (mtc: any, idx: number) => `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td class="mono">${mtc.mtcNo || "---"}</td>
            <td class="mono">${mtc.heatNo || mtc.stockHeatNo || "---"}</td>
            <td>${mtc.stockProduct || "---"}</td>
            <td class="mono">${mtc.stockSize || "---"}</td>
            <td>${formatDate(mtc.uploadDate)}</td>
            <td>${mtc.remarks || "---"}</td>
          </tr>
        `
        )
        .join("");

      mtcPage = `
        <div class="page page-break">
          ${companyHeaderHtml()}
          <h2>MTC Summary</h2>
          <p style="font-size:11px; color:#666; margin-bottom:12px;">
            DN: <strong>${dispatchNote.dnNo}</strong> | Date: ${formatDate(dispatchNote.dispatchDate)} | Total MTCs: <strong>${allMtcs.length}</strong>
          </p>
          <table>
            <thead>
              <tr>
                <th class="text-center" style="width:30px;">#</th>
                <th>MTC No.</th>
                <th>Heat No.</th>
                <th>Product</th>
                <th>Size</th>
                <th>Upload Date</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${mtcRows}
            </tbody>
          </table>
          <div class="footer">
            Generated on ${formatDate(new Date())} | ${COMPANY.name}
          </div>
        </div>
      `;
    }

    // ========== PAGE 4+: INSPECTION SUMMARY ==========
    let inspectionPage: string;
    if (allInspections.length === 0) {
      inspectionPage = `
        <div class="page page-break">
          ${companyHeaderHtml()}
          <h2>Inspection Summary</h2>
          <p style="font-size:11px; color:#666; margin-bottom:12px;">
            DN: <strong>${dispatchNote.dnNo}</strong> | Date: ${formatDate(dispatchNote.dispatchDate)}
          </p>
          <div class="empty-message">No inspection records for dispatched items</div>
          <div class="footer">
            Generated on ${formatDate(new Date())} | ${COMPANY.name}
          </div>
        </div>
      `;
    } else {
      // Overview table
      const inspOverviewRows = allInspections
        .map(
          (insp: any, idx: number) => `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td class="mono">${insp.inspectionNo}</td>
            <td class="mono">${insp.stockHeatNo || "---"}</td>
            <td>${insp.stockProduct || "---"}</td>
            <td class="mono">${insp.stockSize || "---"}</td>
            <td>${formatDate(insp.inspectionDate)}</td>
            <td>${resultBadge(insp.overallResult)}</td>
            <td>${insp.remarks || "---"}</td>
          </tr>
        `
        )
        .join("");

      // Detailed parameters for each inspection
      const inspDetailSections = allInspections
        .map((insp: any) => {
          const paramRows = (insp.parameters || [])
            .map(
              (p: any) => `
              <tr>
                <td>${p.parameterName}</td>
                <td>${p.parameterType || "---"}</td>
                <td class="mono">${p.standardValue || "---"}</td>
                <td class="mono">${p.tolerance || "---"}</td>
                <td class="mono">${p.resultValue || "---"}</td>
                <td>${resultBadge(p.result)}</td>
                <td>${p.remarks || "---"}</td>
              </tr>
            `
            )
            .join("");

          if (!paramRows) return "";

          return `
            <div style="margin-top: 16px;">
              <div class="section-title">${insp.inspectionNo} - Heat: ${insp.stockHeatNo || "---"} | ${insp.stockProduct || ""} ${insp.stockSize || ""}</div>
              <table>
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Type</th>
                    <th>Standard</th>
                    <th>Tolerance</th>
                    <th>Result Value</th>
                    <th>Result</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  ${paramRows}
                </tbody>
              </table>
            </div>
          `;
        })
        .join("");

      inspectionPage = `
        <div class="page page-break">
          ${companyHeaderHtml()}
          <h2>Inspection Summary</h2>
          <p style="font-size:11px; color:#666; margin-bottom:12px;">
            DN: <strong>${dispatchNote.dnNo}</strong> | Date: ${formatDate(dispatchNote.dispatchDate)} | Total Inspections: <strong>${allInspections.length}</strong>
          </p>
          <table>
            <thead>
              <tr>
                <th class="text-center" style="width:30px;">#</th>
                <th>Inspection No.</th>
                <th>Heat No.</th>
                <th>Product</th>
                <th>Size</th>
                <th>Date</th>
                <th>Result</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${inspOverviewRows}
            </tbody>
          </table>

          ${inspDetailSections}

          <div class="footer">
            Generated on ${formatDate(new Date())} | ${COMPANY.name}
          </div>
        </div>
      `;
    }

    // ========== COMBINE ALL PAGES ==========
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Dispatch Bundle - ${dispatchNote.dnNo}</title>
        ${baseStyles()}
      </head>
      <body>
        ${dispatchNotePage}
        ${packingListPage}
        ${mtcPage}
        ${inspectionPage}
      </body>
      </html>
    `;

    const pdfBuffer = await renderHtmlToPdf(fullHtml, false);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="dispatch-bundle-${dispatchNote.dnNo.replace(/\//g, "-")}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating dispatch bundle PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate dispatch bundle PDF" },
      { status: 500 }
    );
  }
}
