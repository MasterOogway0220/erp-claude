import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { renderHtmlToPdf } from "@/lib/pdf/render-pdf";
import { generateClientStatusReportHtml } from "@/lib/pdf/client-status-report-template";

const DEFAULT_COMPANY = {
  companyName: "NPS Piping Solutions",
  regAddressLine1:
    "1210/1211, Prasad Chambers, Tata Road no. 2, Opera House, Charni Road (E)",
  regCity: "Mumbai",
  regPincode: "400004",
  regState: "Maharashtra",
  regCountry: "India",
  telephoneNo: "+91 22 23634200/300",
  email: "info@n-pipe.com",
  website: "www.n-pipe.com",
  companyLogoUrl: null,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ salesOrderId: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("salesOrder", "read");
    if (!authorized) return response!;

    const { salesOrderId } = await params;

    // Fetch report data from the data API
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

    // Get company info
    const company = await prisma.companyMaster.findFirst();
    const companyInfo = company || DEFAULT_COMPANY;

    // Generate PDF
    const html = generateClientStatusReportHtml(reportData, companyInfo as any);
    const pdfBuffer = await renderHtmlToPdf(html, true); // landscape for wide table

    const filename = `Order-Status-${reportData.salesOrder.soNo.replace(/\//g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating client status PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
