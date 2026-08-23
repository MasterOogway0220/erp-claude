import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { MtcCertificateDocument } from "@/lib/pdf/mtc-certificate-pdf";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response, companyId } = await checkAccess("mtc", "read");
    if (!authorized) return response!;
    const { id } = await params;

    const certificate = await prisma.mTCCertificate.findFirst({
      where: { id, ...companyFilter(companyId) },
      include: {
        customer: true,
        materialSpecRef: true,
        items: {
          include: {
            chemicalResults: { orderBy: { sortOrder: "asc" } },
            mechanicalResults: { orderBy: { sortOrder: "asc" } },
            impactResults: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!certificate) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    const company = await prisma.companyMaster.findFirst();

    // Logos are stored as site-relative paths; react-pdf fetches images over
    // the network, so they have to be absolute. An unset logo falls back to
    // text inside the document rather than to a broken image.
    const origin = request.nextUrl.origin || "";
    const abs = (path: unknown): string => {
      const p = typeof path === "string" ? path : "";
      if (!p) return "";
      return p.startsWith("/") ? `${origin}${p}` : p;
    };
    const companyRecord = company as Record<string, unknown> | null;
    const companyLogoUrl = abs(companyRecord?.companyLogoUrl);
    const isoLogoUrl = abs(companyRecord?.isoLogoUrl);

    // The element list comes from the first item: every item on a certificate
    // is reported against the same specification, so they share columns.
    const chemElements =
      certificate.items[0]?.chemicalResults?.map((cr) => cr.element) || [];

    const pdfBuffer = await renderToBuffer(
      <MtcCertificateDocument
        certificate={certificate as never}
        company={company as never}
        chemElements={chemElements}
        companyLogoUrl={companyLogoUrl}
        isoLogoUrl={isoLogoUrl}
      />
    );

    const certNo = (certificate.certificateNo || "MTC").replace(/\//g, "-");
    const customer = (certificate.customerName || "")
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, "")
      .trim();
    const filename = `MTC-${certNo}-${customer}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generating MTC PDF:", error);
    return NextResponse.json({ error: "Failed to generate MTC PDF" }, { status: 500 });
  }
}
