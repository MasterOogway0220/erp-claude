import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { LabLetterDocument } from "@/lib/pdf/lab-letter-pdf";
import { parseStringArray } from "@/lib/business-logic/technical-requirements";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response, companyId } = await checkAccess(
      "labLetter",
      "read"
    );
    if (!authorized) return response!;

    const labLetter = await prisma.labLetter.findFirst({
      where: { id, ...companyFilter(companyId) },
      include: {
        generatedBy: { select: { name: true } },
        tpiAgency: {
          select: { name: true, code: true, contactPerson: true, phone: true },
        },
        company: {
          select: {
            companyName: true,
            regAddressLine1: true,
            regAddressLine2: true,
            regCity: true,
            regState: true,
            regPincode: true,
            telephoneNo: true,
            email: true,
            website: true,
            gstNo: true,
          },
        },
      },
    });

    if (!labLetter) {
      return NextResponse.json({ error: "Lab letter not found" }, { status: 404 });
    }

    const testNames: string[] = parseStringArray(labLetter.testNames);

    const pdfBuffer = await renderToBuffer(
      <LabLetterDocument data={labLetter as never} testNames={testNames} />
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Lab-Letter-${labLetter.letterNo.replace(/\//g, "-")}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generating lab letter PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
