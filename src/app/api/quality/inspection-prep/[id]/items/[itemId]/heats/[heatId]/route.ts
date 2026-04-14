import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ heatId: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("inspectionPrep", "write");
    if (!authorized) return response!;

    const { heatId } = await params;
    const body = await request.json();
    const { heatNo, lengthMtr, pieces, make } = body;

    const heat = await prisma.heatEntry.update({
      where: { id: heatId },
      data: {
        ...(heatNo !== undefined && { heatNo }),
        ...(lengthMtr !== undefined && { lengthMtr: parseFloat(lengthMtr) }),
        ...(pieces !== undefined && { pieces: parseInt(pieces) }),
        ...(make !== undefined && { make }),
      },
    });

    return NextResponse.json(heat);
  } catch (error: any) {
    console.error("Error updating heat entry:", error);
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "This heat number already exists for this item" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error?.message || "Failed to update heat entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ heatId: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("inspectionPrep", "write");
    if (!authorized) return response!;

    const { heatId } = await params;

    await prisma.heatEntry.delete({ where: { id: heatId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting heat entry:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete heat entry" },
      { status: 500 }
    );
  }
}
