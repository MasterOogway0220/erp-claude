import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, QA_ROLES } from "@/lib/rbac";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ heatId: string; mtcId: string }> }
) {
  try {
    const { authorized, session, response } = await checkAccess("inspectionPrep", "write");
    if (!authorized) return response!;

    if (!(QA_ROLES as readonly string[]).includes(session.user.role)) {
      return NextResponse.json({ error: "Only QA/Manager can edit MTC documents" }, { status: 403 });
    }

    const { heatId, mtcId } = await params;
    const body = await request.json();
    const { mtcNo, mtcDate, fileUrl } = body;

    const mtc = await prisma.heatMTCDocument.update({
      where: { id: mtcId, heatEntryId: heatId },
      data: {
        ...(mtcNo !== undefined && { mtcNo }),
        ...(mtcDate !== undefined && { mtcDate: mtcDate ? new Date(mtcDate) : null }),
        ...(fileUrl !== undefined && { fileUrl }),
      },
    });

    return NextResponse.json(mtc);
  } catch (error: any) {
    console.error("Error updating MTC document:", error);
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "MTC document not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: error?.message || "Failed to update MTC document" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ heatId: string; mtcId: string }> }
) {
  try {
    const { authorized, session, response } = await checkAccess("inspectionPrep", "write");
    if (!authorized) return response!;

    if (!(QA_ROLES as readonly string[]).includes(session.user.role)) {
      return NextResponse.json({ error: "Only QA/Manager can delete MTC documents" }, { status: 403 });
    }

    const { heatId, mtcId } = await params;
    await prisma.heatMTCDocument.delete({ where: { id: mtcId, heatEntryId: heatId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting MTC document:", error);
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "MTC document not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: error?.message || "Failed to delete MTC document" },
      { status: 500 }
    );
  }
}
