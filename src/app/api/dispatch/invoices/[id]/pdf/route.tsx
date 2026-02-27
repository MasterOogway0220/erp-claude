import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { renderHtmlToPdf } from "@/lib/pdf/render-pdf";
import { generateInvoiceHtml } from "@/lib/pdf/invoice-template";

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
  gstNo: null,
  panNo: null,
  companyLogoUrl: null,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("invoice", "read");
    if (!authorized) return response!;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sNo: "asc" } },
        customer: true,
        salesOrder: { select: { soNo: true } },
        dispatchNote: { select: { dnNo: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const company = await prisma.companyMaster.findFirst();
    const companyInfo = company || DEFAULT_COMPANY;

    const invoiceData = {
      invoiceNo: invoice.invoiceNo,
      invoiceDate: invoice.invoiceDate,
      invoiceType: invoice.invoiceType,
      dueDate: invoice.dueDate,
      placeOfSupply: invoice.placeOfSupply,
      customerGstin: invoice.customerGstin,
      eWayBillNo: invoice.eWayBillNo,
      currency: invoice.currency,
      subtotal: Number(invoice.subtotal),
      cgst: Number(invoice.cgst),
      sgst: Number(invoice.sgst),
      igst: Number(invoice.igst),
      tcsAmount: Number(invoice.tcsAmount),
      roundOff: Number(invoice.roundOff),
      totalAmount: Number(invoice.totalAmount),
      amountInWords: invoice.amountInWords,
      customer: invoice.customer as any,
      salesOrder: invoice.salesOrder,
      dispatchNote: invoice.dispatchNote,
      items: invoice.items.map((item) => ({
        sNo: item.sNo,
        description: item.description,
        heatNo: item.heatNo,
        sizeLabel: item.sizeLabel,
        hsnCode: item.hsnCode,
        uom: item.uom,
        quantity: Number(item.quantity),
        unitRate: Number(item.unitRate),
        amount: Number(item.amount),
        taxRate: item.taxRate ? Number(item.taxRate) : null,
      })),
    };

    const html = generateInvoiceHtml(invoiceData, companyInfo as any);
    const pdfBuffer = await renderHtmlToPdf(html, false);

    const filename = invoice.invoiceNo.replace(/\//g, "-");
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating invoice PDF:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
