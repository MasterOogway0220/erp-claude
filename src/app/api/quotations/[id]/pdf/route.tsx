import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { renderHtmlToPdf } from "@/lib/pdf/render-pdf";
import { generateStandardQuotationHtml } from "@/lib/pdf/quotation-standard-template";
import { generateNonStandardQuotationHtml } from "@/lib/pdf/quotation-nonstandard-template";

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
    const { authorized, response } = await checkAccess("quotation", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const variant = searchParams.get("variant") || "auto";

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        enquiry: true,
        preparedBy: { select: { name: true, email: true } },
        buyer: true,
        items: {
          orderBy: { sNo: "asc" },
          include: { materialCode: true },
        },
        terms: { orderBy: { termNo: "asc" } },
      },
    });

    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    const company = await prisma.companyMaster.findFirst();
    const companyInfo = company || DEFAULT_COMPANY;

    const isNonStandard = quotation.quotationCategory === "NON_STANDARD";

    let resolvedVariant: "standard" | "commercial" | "technical";
    if (variant === "auto") {
      resolvedVariant = isNonStandard ? "commercial" : "standard";
    } else {
      resolvedVariant = variant as "standard" | "commercial" | "technical";
    }

    let html: string;
    let landscape: boolean;
    let filenameSuffix = "";

    if (resolvedVariant === "standard") {
      html = generateStandardQuotationHtml(quotation as any, companyInfo as any);
      landscape = true;
    } else {
      const pdfVariant =
        resolvedVariant === "technical" ? "TECHNICAL" : "COMMERCIAL";
      html = generateNonStandardQuotationHtml(
        quotation as any,
        companyInfo as any,
        pdfVariant
      );
      landscape = false;
      filenameSuffix = `-${pdfVariant}`;
    }

    const pdfBuffer = await renderHtmlToPdf(html, landscape);
    const filename = `${quotation.quotationNo.replace(/\//g, "-")}${filenameSuffix}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
