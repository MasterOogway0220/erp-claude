import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter, QA_ROLES } from "@/lib/rbac";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ heatId: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("inspectionPrep", "write");
    if (!authorized) return response!;

    if (!(QA_ROLES as readonly string[]).includes(session.user.role)) {
      return NextResponse.json(
        { error: "Only QA/Manager can add MTC documents" },
        { status: 403 }
      );
    }

    const { heatId } = await params;
    const heat = await prisma.heatEntry.findFirst({
      where: { id: heatId, inspectionPrepItem: { inspectionPrep: companyFilter(companyId) } },
      select: { id: true },
    });
    if (!heat) {
      return NextResponse.json({ error: "Heat not found" }, { status: 404 });
    }
    const body = await request.json();
    const { mtcNo, mtcDate, fileUrl } = body;

    if (!mtcNo) {
      return NextResponse.json({ error: "MTC number is required" }, { status: 400 });
    }

    const mtc = await prisma.heatMTCDocument.create({
      data: {
        heatEntryId: heatId,
        mtcNo,
        mtcDate: mtcDate ? new Date(mtcDate) : null,
        fileUrl: fileUrl || null,
        addedById: session.user.id,
      },
    });

    return NextResponse.json(mtc, { status: 201 });
  } catch (error) {
    console.error("Error adding MTC document:", error);
    return NextResponse.json(
      { error: "Failed to add MTC document" },
      { status: 500 }
    );
  }
}
