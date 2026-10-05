import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { POAcceptanceDocument } from "@/lib/pdf/po-acceptance-pdf";
import { LETTER_INCLUDE, letterData } from "@/lib/po-acceptance/letter";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("poAcceptance", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const acceptance = await prisma.pOAcceptance.findUnique({
      where: { id },
      include: LETTER_INCLUDE,
    });

    if (!acceptance) {
      return NextResponse.json({ error: "PO Acceptance not found" }, { status: 404 });
    }

    if (acceptance.status !== "ISSUED") {
      return NextResponse.json({ error: "Acceptance letter is only available for issued acceptances" }, { status: 400 });
    }

    const { data, company } = letterData(acceptance, request.nextUrl.origin);
    const pdfBuffer = await renderToBuffer(<POAcceptanceDocument data={data} company={company} />);
    const filename = `PO-Acceptance-${acceptance.acceptanceNo.replace(/\//g, "-")}.pdf`;

    // inline, not attachment: the create wizard previews this URL in an
    // iframe; the detail page's download button saves it via a blob anyway.
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generating PO acceptance PDF:", error);
    return NextResponse.json({ error: "Failed to generate acceptance letter" }, { status: 500 });
  }
}
