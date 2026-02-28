import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { renderHtmlToPdf } from "@/lib/pdf/render-pdf";
import { wrapHtmlForPrint } from "@/lib/pdf/print-wrapper";
import { generatePurchaseOrderHtml } from "@/lib/pdf/purchase-order-template";

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("purchaseOrder", "read");
    if (!authorized) return response!;

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        salesOrder: { select: { id: true, soNo: true } },
        purchaseRequisition: { select: { id: true, prNo: true } },
        items: { orderBy: { sNo: "asc" } },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Fetch approvedBy user if set
    let approvedByUser = null;
    if (purchaseOrder.approvedById) {
      approvedByUser = await prisma.user.findUnique({
        where: { id: purchaseOrder.approvedById },
        select: { name: true },
      });
    }

    const company = await prisma.companyMaster.findFirst();
    const companyInfo = company || DEFAULT_COMPANY;

    const html = generatePurchaseOrderHtml(
      {
        ...purchaseOrder,
        totalAmount: Number(purchaseOrder.totalAmount),
        approvedBy: approvedByUser,
        items: purchaseOrder.items,
      } as any,
      companyInfo as any
    );

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");
    if (format === "html") {
      return new NextResponse(wrapHtmlForPrint(html, true), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const pdfBuffer = await renderHtmlToPdf(html, true);
    const filename = `${purchaseOrder.poNo.replace(/\//g, "-")}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating PO PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
