import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ salesOrderId: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("salesOrder", "read");
    if (!authorized) return response!;

    const { salesOrderId } = await params;

    // Fetch report data
    const baseUrl = request.nextUrl.origin;
    const dataRes = await fetch(
      `${baseUrl}/api/reports/client-status/${salesOrderId}`,
      {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      }
    );

    if (!dataRes.ok) {
      const err = await dataRes.json();
      return NextResponse.json(err, { status: dataRes.status });
    }

    const reportData = await dataRes.json();

    // Build CSV with comprehensive columns
    const columns = [
      { key: "sNo", header: "S.No." },
      { key: "product", header: "Product" },
      { key: "material", header: "Material" },
      { key: "size", header: "Size" },
      { key: "heatNo", header: "Heat No." },
      { key: "qtyOrdered", header: "Qty Ordered" },
      { key: "qtyDispatched", header: "Qty Dispatched" },
      { key: "qtyBalance", header: "Balance Qty" },
      { key: "materialPrepared", header: "Material Status" },
      { key: "inspectionStatus", header: "Inspection Status" },
      { key: "testingStatus", header: "Testing Status" },
      { key: "expectedDispatchDate", header: "Expected Dispatch" },
      { key: "remarks", header: "Remarks" },
    ];

    // Header info rows
    const headerRows = [
      `"Order Status Report"`,
      `"Customer","${escCsv(reportData.customer.name)}"`,
      `"SO No.","${escCsv(reportData.salesOrder.soNo)}"`,
      `"SO Date","${escCsv(reportData.salesOrder.soDate?.split('T')[0] || '')}"`,
      reportData.salesOrder.customerPoNo
        ? `"Client PO No.","${escCsv(reportData.salesOrder.customerPoNo)}"`
        : null,
      reportData.salesOrder.projectName
        ? `"Project","${escCsv(reportData.salesOrder.projectName)}"`
        : null,
      `"SO Status","${escCsv(reportData.salesOrder.status)}"`,
      `"Report Date","${new Date().toISOString().split('T')[0]}"`,
      "", // blank line
    ]
      .filter((r) => r !== null)
      .join("\n");

    // Column headers
    const colHeader = columns.map((c) => `"${c.header}"`).join(",");

    // Data rows
    const dataRows = reportData.items
      .map((item: any) =>
        columns
          .map((col) => {
            const val = item[col.key];
            const str = val !== null && val !== undefined ? String(val) : "";
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(",")
      )
      .join("\n");

    // Summary rows
    const summaryRows = [
      "", // blank line
      `"Summary"`,
      `"Total Items","${reportData.summary.totalItems}"`,
      `"Total Ordered","${reportData.summary.totalOrdered.toFixed(3)}"`,
      `"Total Dispatched","${reportData.summary.totalDispatched.toFixed(3)}"`,
      `"Balance","${reportData.summary.totalBalance.toFixed(3)}"`,
      `"Inspection Complete","${reportData.summary.inspectionComplete}/${reportData.summary.totalItems}"`,
      `"Testing Complete","${reportData.summary.testingComplete}/${reportData.summary.totalItems}"`,
      `"Material Ready","${reportData.summary.materialReady}/${reportData.summary.totalItems}"`,
    ].join("\n");

    const csv = [headerRows, colHeader, dataRows, summaryRows].join("\n");

    const soNoSafe = reportData.salesOrder.soNo.replace(/\//g, "-");
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `Order-Status-${soNoSafe}-${dateStr}.csv`;

    return new NextResponse("\ufeff" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating client status CSV:", error);
    return NextResponse.json(
      { error: "Failed to generate CSV" },
      { status: 500 }
    );
  }
}

function escCsv(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/"/g, '""');
}
