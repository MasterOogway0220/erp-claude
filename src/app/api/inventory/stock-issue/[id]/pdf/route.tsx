import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { renderHtmlToPdf } from "@/lib/pdf/render-pdf";
import { wrapHtmlForPrint } from "@/lib/pdf/print-wrapper";
import { generateIssueSlipHtml } from "@/lib/pdf/issue-slip-template";

const DEFAULT_COMPANY = {
  companyName: "NPS Piping Solutions",
  regAddressLine1:
    "1210/1211, Prasad Chambers, Tata Road no. 2, Opera House, Charni Road (E)",
  regCity: "Mumbai",
  regPincode: "400004",
  regState: "Maharashtra",
  telephoneNo: "+91 22 23634200/300",
  email: "info@n-pipe.com",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("stockIssue", "read");
    if (!authorized) return response!;

    const stockIssue = await prisma.stockIssue.findUnique({
      where: { id },
      include: {
        salesOrder: {
          select: {
            soNo: true,
            customer: { select: { name: true } },
          },
        },
        issuedBy: { select: { name: true } },
        authorizedBy: { select: { name: true } },
        items: true,
      },
    });

    if (!stockIssue) {
      return NextResponse.json({ error: "Stock issue not found" }, { status: 404 });
    }

    const company = await prisma.companyMaster.findFirst();
    const companyInfo = company || DEFAULT_COMPANY;

    const html = generateIssueSlipHtml(stockIssue as any, companyInfo as any);

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");
    if (format === "html") {
      return new NextResponse(wrapHtmlForPrint(html, false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const pdfBuffer = await renderHtmlToPdf(html, false);
    const filename = `Issue-Slip-${stockIssue.issueNo.replace(/\//g, "-")}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating issue slip PDF:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
