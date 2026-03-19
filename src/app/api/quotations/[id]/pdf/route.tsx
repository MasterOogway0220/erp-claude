import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { renderHtmlToPdf } from "@/lib/pdf/render-pdf";
import { wrapHtmlForPrint } from "@/lib/pdf/print-wrapper";
import { generateStandardQuotationHtml } from "@/lib/pdf/quotation-standard-template";
import { generateNonStandardQuotationHtml } from "@/lib/pdf/quotation-nonstandard-template";

// Vercel serverless: increase memory and timeout for Chromium PDF generation
export const maxDuration = 30;
export const dynamic = "force-dynamic";

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
  isoLogoUrl: null,
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
        preparedBy: { select: { name: true, email: true, phone: true } },
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

    // Convert relative logo URLs to absolute for PDF rendering (Puppeteer needs full URLs)
    const origin = request.nextUrl.origin || "https://erp-claude-three.vercel.app";
    if (companyInfo.companyLogoUrl && companyInfo.companyLogoUrl.startsWith("/")) {
      (companyInfo as any).companyLogoUrl = `${origin}${companyInfo.companyLogoUrl}`;
    }
    if ((companyInfo as any).isoLogoUrl && (companyInfo as any).isoLogoUrl.startsWith("/")) {
      (companyInfo as any).isoLogoUrl = `${origin}${(companyInfo as any).isoLogoUrl}`;
    }

    const isNonStandard = quotation.quotationCategory === "NON_STANDARD";

    // Resolve variant: "quoted" or "unquoted" (default: "quoted")
    const isUnquoted = variant === "unquoted";
    const pdfVariant: "QUOTED" | "UNQUOTED" = isUnquoted ? "UNQUOTED" : "QUOTED";

    let html: string;
    let landscape: boolean;

    if (isNonStandard) {
      html = generateNonStandardQuotationHtml(quotation as any, companyInfo as any, pdfVariant);
      landscape = false;
    } else {
      html = generateStandardQuotationHtml(quotation as any, companyInfo as any, pdfVariant);
      landscape = true;
    }

    const format = searchParams.get("format");
    if (format === "html") {
      return new NextResponse(wrapHtmlForPrint(html, landscape), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const pdfBuffer = await renderHtmlToPdf(html, landscape);

    // Build filename: PRICED-QUT-NNNNN-CLIENT NAME-INQ.NO or TECHNICAL-QUT-...
    const qtnNum = quotation.quotationNo.replace(/\//g, "-");
    const clientName = (quotation.customer?.name || "").toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim();
    const inqNo = (quotation.inquiryNo || "").replace(/\//g, "-").trim();
    let filename: string;
    if (isNonStandard) {
      filename = isUnquoted
        ? `TECHNICAL-QUT-${qtnNum}-${clientName}${inqNo ? `-${inqNo}` : ""}.pdf`
        : `COMMERCIAL-QUT-${qtnNum}-${clientName}${inqNo ? `-${inqNo}` : ""}.pdf`;
    } else {
      filename = isUnquoted
        ? `TECHNICAL-QUT-${qtnNum}-${clientName}${inqNo ? `-${inqNo}` : ""}.pdf`
        : `PRICED-QUT-${qtnNum}-${clientName}${inqNo ? `-${inqNo}` : ""}.pdf`;
    }

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
