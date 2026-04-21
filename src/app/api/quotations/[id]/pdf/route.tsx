import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { QuotationPDF } from "@/lib/pdf/quotation-pdf";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const DEFAULT_COMPANY = {
  companyName: "NPS Piping Solutions",
  regAddressLine1: "1210/1211, Prasad Chambers, Tata Road no. 2, Opera House, Charni Road (E)",
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
    const isUnquoted = variant === "unquoted";
    const pdfVariant: "QUOTED" | "UNQUOTED" = isUnquoted ? "UNQUOTED" : "QUOTED";

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
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const companyRow = await prisma.companyMaster.findFirst();
    const company = companyRow || DEFAULT_COMPANY;

    // Convert relative logo URLs to absolute for react-pdf image fetching
    const origin = request.nextUrl.origin || "";
    const resolvedCompany = {
      ...company,
      companyLogoUrl: company.companyLogoUrl?.startsWith("/")
        ? `${origin}${company.companyLogoUrl}`
        : company.companyLogoUrl,
      isoLogoUrl: (company as any).isoLogoUrl?.startsWith("/")
        ? `${origin}${(company as any).isoLogoUrl}`
        : (company as any).isoLogoUrl,
    };

    const pdfBuffer = await renderToBuffer(
      React.createElement(QuotationPDF, {
        quotation,
        company: resolvedCompany,
        variant: pdfVariant,
      })
    );

    // Build filename
    const qtnParts = quotation.quotationNo.split("/");
    const qtnNum = qtnParts[qtnParts.length - 1] || quotation.quotationNo.replace(/\//g, "-");
    const clientName = (quotation.customer?.name || "").toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim();
    const inqNo = (quotation.inquiryNo || "").trim();
    const isNonStandard = quotation.quotationCategory === "NON_STANDARD";

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
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
